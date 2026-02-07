import { PublicKey } from "@solana/web3.js";
import type {
  OnChainGameState,
  OnChainPlayerState,
  PlayerStatus,
  GamePhase,
} from "./types";

const ENDING_THRESHOLD_SECS = 300; // 5 minutes — "ending" phase

/**
 * Derive the current game phase from on-chain state.
 * - "waiting": round not started or no round exists
 * - "active": round active, timer > 5 min remaining
 * - "ending": round active, timer < 5 min remaining
 * - "ended": round inactive, winner hasn't claimed
 * - "claiming": round inactive, winner has claimed (players can still claim dividends)
 */
export function getGamePhase(
  gameState: OnChainGameState | null,
  now?: number
): GamePhase {
  if (!gameState) return "waiting";

  const currentTime = now ?? Math.floor(Date.now() / 1000);

  if (gameState.active) {
    // Check if timer has actually expired (auto-end not yet triggered)
    if (currentTime >= gameState.timerEnd) return "ended";
    const remaining = gameState.timerEnd - currentTime;
    return remaining <= ENDING_THRESHOLD_SECS ? "ending" : "active";
  }

  // Round is inactive
  if (gameState.winnerClaimed) return "claiming";
  return "ended";
}

/**
 * Compute the estimated dividend for a player based on their key share.
 * dividend = (playerKeys / totalKeys) * totalDividendPool
 */
export function estimateDividend(
  gameState: OnChainGameState,
  playerKeys: number
): number {
  if (gameState.totalKeys === 0 || playerKeys === 0) return 0;
  // Use floating point for estimation — exact match to on-chain uses integer math
  return Math.floor(
    (playerKeys / gameState.totalKeys) * gameState.totalDividendPool
  );
}

/**
 * Comprehensive player status analysis.
 * Determines every available action based on comparing PlayerState with GameState.
 *
 * Handles all states from the player state matrix:
 * 1. Never played (playerState is null)
 * 2. Active in current round (currentRound == game.round)
 * 3. Round ended, unclaimed (currentRound == game.round, game inactive)
 * 4. Already claimed (currentRound == 0, sentinel)
 * 5. Stale round (currentRound != 0 && != game.round)
 * 6. Has referral earnings (independent of round state)
 */
export function getPlayerStatus(
  gameState: OnChainGameState | null,
  playerState: OnChainPlayerState | null,
  playerPubkey?: PublicKey,
  now?: number
): PlayerStatus {
  const phase = getGamePhase(gameState, now);

  // Default status — no actions available
  const status: PlayerStatus = {
    needsRegistration: true,
    needsSettlement: false,
    staleRound: 0,
    canBuyKeys: false,
    canClaim: false,
    canClaimReferral: false,
    isWinner: false,
    estimatedDividend: 0,
    estimatedWinnerPrize: 0,
    unclaimedReferralEarnings: 0,
    phase,
    keys: 0,
  };

  // No game state — nothing to do
  if (!gameState) return status;

  // Never played — only action is register (if game is active)
  if (!playerState) {
    status.canBuyKeys = false; // Must register first
    return status;
  }

  // Player exists — check referral earnings (independent of round)
  const unclaimedReferral =
    playerState.referralEarningsLamports -
    playerState.claimedReferralEarningsLamports;
  status.unclaimedReferralEarnings = unclaimedReferral;
  status.canClaimReferral = unclaimedReferral > 0;

  const playerRound = playerState.currentRound;
  const gameRound = gameState.round;

  // State 4: Already claimed (sentinel value 0)
  if (playerRound === 0) {
    status.needsRegistration = true; // Needs to re-register for new round
    status.needsSettlement = false;
    return status;
  }

  // State 5: Stale round — player is in an old round, can claim from it
  if (playerRound !== 0 && playerRound !== gameRound) {
    status.needsRegistration = false; // Has a PDA, just stale
    status.needsSettlement = true;
    status.canClaim = true; // Can claim dividends from old round
    status.staleRound = playerRound;
    status.keys = playerState.keys;
    return status;
  }

  // States 2 & 3: Player is in the current round
  status.needsRegistration = false;
  status.needsSettlement = false;
  status.keys = playerState.keys;

  // Check if player is the winner
  if (
    playerPubkey &&
    gameState.lastBuyer.equals(playerPubkey) &&
    gameState.totalKeys > 0
  ) {
    status.isWinner = true;
    status.estimatedWinnerPrize = gameState.winnerPot;
  }

  // Estimate dividend
  status.estimatedDividend = estimateDividend(gameState, playerState.keys);

  // State 2: Active in current round, game is active
  if (phase === "active" || phase === "ending") {
    status.canBuyKeys = true;
    status.canClaim = false; // Can't claim while active
    return status;
  }

  // State 3: Round ended, player can claim
  if (phase === "ended" || phase === "claiming") {
    status.canBuyKeys = false;
    // Can claim if has dividends or is winner (and winner hasn't claimed yet)
    const hasDividends = status.estimatedDividend > 0;
    const canClaimWinner =
      status.isWinner && !gameState.winnerClaimed;
    status.canClaim = hasDividends || canClaimWinner;
    return status;
  }

  return status;
}
