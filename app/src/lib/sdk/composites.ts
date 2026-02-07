import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "../idl-types";
import type { OnChainGameState, OnChainPlayerState } from "./types";
import {
  buildBuyKeys,
  buildClaim,
  buildClaimReferralEarnings,
} from "./instructions";

/**
 * Build a transaction that claims dividends and referral earnings.
 * Only includes claim_referral_earnings if there are pending earnings.
 */
export async function buildClaimAll(
  program: Program<Fomolt3d>,
  player: PublicKey,
  round: number,
  hasUnclaimedReferral: boolean
): Promise<TransactionInstruction[]> {
  const ixs: TransactionInstruction[] = [];
  ixs.push(await buildClaim(program, player, round));
  if (hasUnclaimedReferral) {
    ixs.push(await buildClaimReferralEarnings(program, player, round));
  }
  return ixs;
}

/**
 * Check if the timer has expired (client-side).
 * Treats the round as ended even if the on-chain `active` flag hasn't been flipped yet.
 */
function isTimerExpired(gameState: OnChainGameState, now?: number): boolean {
  const currentTime = now ?? Math.floor(Date.now() / 1000);
  return currentTime >= gameState.timerEnd;
}

/**
 * The "smart buy" function — analyzes player status and builds the
 * minimum set of instructions needed to buy keys.
 *
 * Handles all player lifecycle states:
 * - Case 1: Timer expired → return null (no-op on chain)
 * - Case 2: New player (no PlayerState) → [buyKeys] (init_if_needed handles creation)
 * - Case 3: Sentinel (currentRound == 0) → [buyKeys] (re-entry path)
 * - Case 4: Active in current round → [buyKeys]
 * - Case 5: Stale round → [claim(oldRound), buyKeys(currentRound)]
 *
 * Returns null if the player can't buy (game ended, timer expired).
 */
export async function buildSmartBuy(
  program: Program<Fomolt3d>,
  player: PublicKey,
  gameState: OnChainGameState,
  playerState: OnChainPlayerState | null,
  keysToBuy: number,
  isAgent: boolean,
  referrer?: PublicKey,
  now?: number
): Promise<TransactionInstruction[] | null> {
  // Can't buy if game isn't active or timer has expired
  if (!gameState.active || isTimerExpired(gameState, now)) return null;

  const round = gameState.round;
  const protocolWallet = gameState.protocolWallet;

  // Case 2: Never played (no PlayerState) — buy_keys with init_if_needed
  if (!playerState) {
    const buyIx = await buildBuyKeys(
      program, player, round, keysToBuy, isAgent, protocolWallet, referrer
    );
    return [buyIx];
  }

  const playerRound = playerState.currentRound;

  // Case 3: Already claimed (sentinel 0) — re-entry via buy_keys
  if (playerRound === 0) {
    const buyIx = await buildBuyKeys(
      program, player, round, keysToBuy, isAgent, protocolWallet, referrer
    );
    return [buyIx];
  }

  // Case 4: Active in current round — just buy
  if (playerRound === round) {
    const buyIx = await buildBuyKeys(
      program, player, round, keysToBuy, isAgent, protocolWallet, referrer
    );
    return [buyIx];
  }

  // Case 5: Stale round — claim from old round, then buy into current round.
  // In a single transaction: claim sets current_round=0 (sentinel),
  // then buy_keys sees sentinel and handles re-entry.
  const claimIx = await buildClaim(program, player, playerRound);
  const buyIx = await buildBuyKeys(
    program, player, round, keysToBuy, isAgent, protocolWallet, referrer
  );
  return [claimIx, buyIx];
}

/**
 * The "smart claim" function — builds the right claim transaction
 * based on player status.
 *
 * Handles:
 * - No PlayerState → null
 * - Sentinel (0) → referral-only claim if any
 * - Stale round → claim from old round
 * - Current round, game ended/timer expired → claim from current round
 * - Game still active → null
 *
 * Returns null if nothing to claim.
 */
export async function buildSmartClaim(
  program: Program<Fomolt3d>,
  player: PublicKey,
  gameState: OnChainGameState,
  playerState: OnChainPlayerState | null,
  now?: number
): Promise<TransactionInstruction[] | null> {
  if (!playerState) return null;

  const playerRound = playerState.currentRound;
  const round = gameState.round;

  const hasReferral =
    playerState.referralEarningsLamports -
      playerState.claimedReferralEarningsLamports >
    0;

  // Already claimed (sentinel) — only referral earnings remain
  if (playerRound === 0) {
    if (hasReferral) {
      return [await buildClaimReferralEarnings(program, player, round)];
    }
    return null;
  }

  // Stale round — player can claim from their old round
  if (playerRound !== 0 && playerRound !== round) {
    return buildClaimAll(program, player, playerRound, hasReferral);
  }

  // Current round — can only claim if round has ended (on-chain or timer expired)
  const gameEnded = !gameState.active || isTimerExpired(gameState, now);
  if (playerRound === round && gameEnded) {
    return buildClaimAll(program, player, round, hasReferral);
  }

  // Game still active, nothing to claim
  return null;
}
