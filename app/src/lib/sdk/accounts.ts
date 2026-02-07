import { Connection, PublicKey } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { BN } from "@coral-xyz/anchor";
import type { Fomolt3d } from "../idl-types";
import type {
  OnChainGameState,
  OnChainPlayerState,
  OnChainGlobalConfig,
} from "./types";
import {
  getConfigPDA,
  getGameStatePDA,
  getPlayerStatePDA,
  getVaultPDA,
} from "./pdas";

/** Convert Anchor BN to number. Safe for values < 2^53. */
function bn(v: BN | number): number {
  return typeof v === "number" ? v : v.toNumber();
}

/** Convert Anchor optional pubkey (might be null or the default pubkey). */
function optionalPubkey(v: PublicKey | null | undefined): PublicKey | null {
  if (!v) return null;
  // Anchor uses PublicKey.default (all zeros) for None in some versions
  if (v.equals(PublicKey.default)) return null;
  return v;
}

/** Fetch GlobalConfig. Returns null if not initialized. */
export async function fetchGlobalConfig(
  program: Program<Fomolt3d>
): Promise<OnChainGlobalConfig | null> {
  const [pda] = getConfigPDA();
  try {
    const raw = await program.account.globalConfig.fetch(pda);
    return {
      admin: raw.admin,
      basePriceLamports: bn(raw.basePriceLamports),
      priceIncrementLamports: bn(raw.priceIncrementLamports),
      timerExtensionSecs: bn(raw.timerExtensionSecs),
      maxTimerSecs: bn(raw.maxTimerSecs),
      winnerBps: bn(raw.winnerBps),
      dividendBps: bn(raw.dividendBps),
      nextRoundBps: bn(raw.nextRoundBps),
      protocolFeeBps: bn(raw.protocolFeeBps),
      referralBonusBps: bn(raw.referralBonusBps),
      protocolWallet: raw.protocolWallet,
      bump: raw.bump,
    };
  } catch {
    return null;
  }
}

/** Fetch GameState for a specific round. Returns null if not found. */
export async function fetchGameState(
  program: Program<Fomolt3d>,
  round: number
): Promise<OnChainGameState | null> {
  const [pda] = getGameStatePDA(round);
  try {
    const raw = await program.account.gameState.fetch(pda);
    return {
      round: bn(raw.round),
      potLamports: bn(raw.potLamports),
      timerEnd: bn(raw.timerEnd),
      lastBuyer: raw.lastBuyer,
      totalKeys: bn(raw.totalKeys),
      roundStart: bn(raw.roundStart),
      active: raw.active,
      winnerClaimed: raw.winnerClaimed,
      totalPlayers: raw.totalPlayers,
      totalDividendPool: bn(raw.totalDividendPool),
      nextRoundPot: bn(raw.nextRoundPot),
      winnerPot: bn(raw.winnerPot),
      basePriceLamports: bn(raw.basePriceLamports),
      priceIncrementLamports: bn(raw.priceIncrementLamports),
      timerExtensionSecs: bn(raw.timerExtensionSecs),
      maxTimerSecs: bn(raw.maxTimerSecs),
      winnerBps: bn(raw.winnerBps),
      dividendBps: bn(raw.dividendBps),
      nextRoundBps: bn(raw.nextRoundBps),
      protocolFeeBps: bn(raw.protocolFeeBps),
      referralBonusBps: bn(raw.referralBonusBps),
      protocolWallet: raw.protocolWallet,
      bump: raw.bump,
    };
  } catch {
    return null;
  }
}

/** Fetch PlayerState. Returns null if player has never registered. */
export async function fetchPlayerState(
  program: Program<Fomolt3d>,
  player: PublicKey
): Promise<OnChainPlayerState | null> {
  const [pda] = getPlayerStatePDA(player);
  try {
    const raw = await program.account.playerState.fetch(pda);
    return {
      player: raw.player,
      keys: bn(raw.keys),
      currentRound: bn(raw.currentRound),
      claimedDividendsLamports: bn(raw.claimedDividendsLamports),
      referrer: optionalPubkey(raw.referrer as PublicKey | null),
      referralEarningsLamports: bn(raw.referralEarningsLamports),
      claimedReferralEarningsLamports: bn(raw.claimedReferralEarningsLamports),
      isAgent: raw.isAgent,
      bump: raw.bump,
    };
  } catch {
    return null;
  }
}

/** Fetch the SOL balance of a round's vault PDA. */
export async function fetchVaultBalance(
  connection: Connection,
  round: number
): Promise<number> {
  const [gameStatePDA] = getGameStatePDA(round);
  const [vaultPDA] = getVaultPDA(gameStatePDA);
  return connection.getBalance(vaultPDA);
}

let cachedLatestRound = 1;

/**
 * Find the current (latest) round by scanning backwards from a starting guess.
 * Returns the round number and its GameState, or null if no rounds exist.
 *
 * Strategy: start from the last known round, then scan forward to find the latest.
 * Falls back to scanning backward if the cached round no longer exists.
 */
export async function findCurrentRound(
  program: Program<Fomolt3d>
): Promise<{ round: number; gameState: OnChainGameState } | null> {
  // Start at last known round (first round is always 1)
  let round = Math.max(1, cachedLatestRound);
  let latest: { round: number; gameState: OnChainGameState } | null = null;

  // Scan upward until we find a round that doesn't exist
  while (true) {
    const gs = await fetchGameState(program, round);
    if (!gs) {
      if (latest) break;
      if (round === 1) return null;

      // Cached round was too high or stale: scan backward to find the last existing round.
      let back = round - 1;
      while (back >= 1) {
        const backGs = await fetchGameState(program, back);
        if (backGs) {
          latest = { round: back, gameState: backGs };
          if (backGs.active) {
            cachedLatestRound = back;
            return latest;
          }
          round = back + 1;
          break;
        }
        back--;
      }

      if (!latest) return null;
      continue;
    }
    latest = { round, gameState: gs };
    cachedLatestRound = round;
    // If this round is active, it's the current one
    if (gs.active) return latest;
    round++;
  }

  if (latest) {
    cachedLatestRound = latest.round;
  }

  return latest;
}

/**
 * Fetch all PlayerState accounts for a given round (for leaderboard).
 * Uses getProgramAccounts with a filter on the currentRound field.
 */
export async function fetchAllPlayersInRound(
  program: Program<Fomolt3d>,
  round: number
): Promise<OnChainPlayerState[]> {
  // PlayerState layout: 8 (discriminator) + 32 (player) + 8 (keys) + 8 (currentRound)
  // currentRound starts at offset 48
  const CURRENT_ROUND_OFFSET = 8 + 32 + 8; // = 48

  const roundBuf = Buffer.alloc(8);
  roundBuf.writeBigUInt64LE(BigInt(round));

  const accounts = await program.account.playerState.all([
    {
      memcmp: {
        offset: CURRENT_ROUND_OFFSET,
        bytes: roundBuf.toString("base64"),
        encoding: "base64",
      },
    },
  ]);

  return accounts.map((a) => ({
    player: a.account.player,
    keys: bn(a.account.keys),
    currentRound: bn(a.account.currentRound),
    claimedDividendsLamports: bn(a.account.claimedDividendsLamports),
    referrer: optionalPubkey(a.account.referrer as PublicKey | null),
    referralEarningsLamports: bn(a.account.referralEarningsLamports),
    claimedReferralEarningsLamports: bn(
      a.account.claimedReferralEarningsLamports
    ),
    isAgent: a.account.isAgent,
    bump: a.account.bump,
  }));
}
