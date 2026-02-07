/**
 * Default game parameters — used ONLY for mock data seeding.
 * In production, all values come from the on-chain GameState config snapshot.
 * Do NOT import these for display or calculation — use gameState.* fields instead.
 */

/** Default base price per key in lamports (0.01 SOL) */
export const BASE_PRICE_LAMPORTS = 10_000_000;

/** Default price increment per key already sold, in lamports (0.001 SOL) */
export const PRICE_INCREMENT_LAMPORTS = 1_000_000;

/** Default seconds added to timer per key purchase */
export const TIMER_EXTENSION_SECS = 30;

/** Default maximum timer duration in seconds (24 hours) */
export const MAX_TIMER_SECS = 86_400;

/** Default winner share in basis points (48%) */
export const WINNER_BPS = 4800;

/** Default dividend share in basis points (45%) */
export const DIVIDEND_BPS = 4500;

/** Default next round carry share in basis points (7%) */
export const NEXT_ROUND_BPS = 700;

/** Default referral bonus in basis points of dividend portion (10%) */
export const REFERRAL_BONUS_BPS = 1000;

/** Scaling factor for dividend-per-key accumulator */
export const DIVIDEND_PRECISION = BigInt(1_000_000_000);

/** Lamports per SOL */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/** Rate limit for referral creation (per hour) */
export const REFERRAL_RATE_LIMIT = 10;

/** Convert basis points to a percentage number (e.g. 4800 -> 48) */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/** Convert basis points to a fraction (e.g. 4800 -> 0.48) */
export function bpsToFraction(bps: number): number {
  return bps / 10_000;
}
