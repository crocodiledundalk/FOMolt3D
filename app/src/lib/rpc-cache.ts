import type { Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "./idl-types";
import { findCurrentRound, fetchAllPlayersInRound } from "./sdk";
import type { OnChainGameState, OnChainPlayerState } from "./sdk";

// ─── Types ──────────────────────────────────────────────────────────

export interface GameRoundResult {
  round: number;
  gameState: OnChainGameState;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// ─── Configuration ──────────────────────────────────────────────────

const GAME_ROUND_TTL_MS = 10_000; // 10 seconds — balances freshness vs RPC cost (timer ticks client-side)
const LEADERBOARD_TTL_MS = 15_000; // 15 seconds — heavy RPC call (getProgramAccounts)

// ─── State ──────────────────────────────────────────────────────────

let gameRoundCache: CacheEntry<GameRoundResult> | null = null;
let leaderboardCache: CacheEntry<{
  round: number;
  players: OnChainPlayerState[];
}> | null = null;

// ─── Game Round Cache ───────────────────────────────────────────────

/**
 * Get the current game round with TTL caching and stale fallback.
 *
 * - Returns fresh data if cache is empty or expired
 * - Returns cached data if within TTL
 * - Falls back to stale cached data if RPC call fails (rate limit resilience)
 * - Returns null only if no round exists and no cached data available
 */
export async function getCachedGameRound(
  program: Program<Fomolt3d>
): Promise<GameRoundResult | null> {
  const now = Date.now();

  // Return cached data if within TTL
  if (gameRoundCache && now - gameRoundCache.fetchedAt < GAME_ROUND_TTL_MS) {
    return gameRoundCache.data;
  }

  // TTL expired or no cache — fetch fresh
  try {
    const result = await findCurrentRound(program);
    if (result) {
      gameRoundCache = { data: result, fetchedAt: now };
    }
    return result;
  } catch (err) {
    // RPC error (rate limit, network, etc.) — fall back to stale cache
    if (gameRoundCache) {
      return gameRoundCache.data;
    }
    throw err;
  }
}

// ─── Leaderboard Cache ──────────────────────────────────────────────

/**
 * Get all players in a round with TTL caching and stale fallback.
 *
 * Same pattern as game round cache but with longer TTL since
 * leaderboard data is heavier to fetch (getProgramAccounts).
 *
 * When `roundEnded` is true, the cache is frozen for that round:
 * no re-fetch will be attempted. This prevents claimed players
 * (whose currentRound resets to 0) from vanishing off the
 * leaderboard after the round ends.
 */
export async function getCachedLeaderboardPlayers(
  program: Program<Fomolt3d>,
  round: number,
  roundEnded = false
): Promise<OnChainPlayerState[]> {
  const now = Date.now();

  // If round has ended and we already have data for it, serve it
  // indefinitely. The rankings are final — no new buys will change them,
  // and re-fetching would lose players who have already claimed.
  if (
    roundEnded &&
    leaderboardCache &&
    leaderboardCache.data.round === round &&
    leaderboardCache.data.players.length > 0
  ) {
    return leaderboardCache.data.players;
  }

  // Return cached data if within TTL and same round
  if (
    leaderboardCache &&
    leaderboardCache.data.round === round &&
    now - leaderboardCache.fetchedAt < LEADERBOARD_TTL_MS
  ) {
    return leaderboardCache.data.players;
  }

  // TTL expired, different round, or no cache — fetch fresh
  try {
    const players = await fetchAllPlayersInRound(program, round);
    // Only update cache if we got a non-empty result, or if we had nothing before.
    // This prevents an empty RPC result (all players claimed) from overwriting
    // a good snapshot.
    if (
      players.length > 0 ||
      !leaderboardCache ||
      leaderboardCache.data.round !== round
    ) {
      leaderboardCache = { data: { round, players }, fetchedAt: now };
    }
    return leaderboardCache?.data.round === round
      ? leaderboardCache.data.players
      : players;
  } catch (err) {
    // RPC error — fall back to stale cache if same round
    if (leaderboardCache && leaderboardCache.data.round === round) {
      return leaderboardCache.data.players;
    }
    throw err;
  }
}

// ─── Invalidation ───────────────────────────────────────────────────

/**
 * Invalidate the game round cache.
 * Call this when a RoundStarted or RoundConcluded event is received
 * so the next request fetches fresh data.
 * Keeps stale data for fallback if RPC fails.
 */
export function invalidateGameRoundCache(): void {
  if (gameRoundCache) {
    gameRoundCache.fetchedAt = 0;
  }
}

/**
 * Invalidate the leaderboard cache.
 * Call this when a KeysPurchased event is received (new player/keys change).
 * Keeps stale data for fallback if RPC fails.
 */
export function invalidateLeaderboardCache(): void {
  if (leaderboardCache) {
    leaderboardCache.fetchedAt = 0;
  }
}

/**
 * Invalidate all caches and clear stale data. Used for testing.
 */
export function invalidateAllCaches(): void {
  gameRoundCache = null;
  leaderboardCache = null;
}
