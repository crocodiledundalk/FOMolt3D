import type { OnChainGameState, BuyCostEstimate } from "./types";

/**
 * Calculate the total cost to buy `keysToBuy` keys starting from `totalKeysSold`.
 * Matches the on-chain Rust formula:
 *   cost = n * base_price + increment * n * (2k + n - 1) / 2
 *
 * Uses the config snapshot from the game state (not hardcoded defaults).
 */
export function calculateCost(
  totalKeysSold: number,
  keysToBuy: number,
  basePriceLamports: number,
  priceIncrementLamports: number
): number {
  if (keysToBuy <= 0) return 0;
  const n = keysToBuy;
  const k = totalKeysSold;
  const baseCost = n * basePriceLamports;
  const incrementCost =
    priceIncrementLamports * ((n * (2 * k + n - 1)) / 2);
  return Math.floor(baseCost + incrementCost);
}

/**
 * Calculate the price of the next key (0-indexed).
 * price(k) = basePrice + increment * k
 */
export function getNextKeyPrice(gameState: OnChainGameState): number {
  return (
    gameState.basePriceLamports +
    gameState.priceIncrementLamports * gameState.totalKeys
  );
}

/**
 * Calculate BPS split: amount * bps / 10_000 (matching on-chain integer math).
 */
function bpsSplit(amount: number, bps: number): number {
  return Math.floor((amount * bps) / 10_000);
}

/**
 * Full cost breakdown for a key purchase.
 * Uses the game state's config snapshot for all BPS values.
 *
 * Fee ordering (matches on-chain):
 * 1. Protocol fee (house edge) deducted from total cost
 * 2. Referral bonus from after-fee amount (if referrer exists)
 * 3. Pot contribution split into winner/dividend/next_round
 */
export function estimateBuyCost(
  gameState: OnChainGameState,
  keysToBuy: number,
  hasReferrer: boolean = false
): BuyCostEstimate {
  const totalCost = calculateCost(
    gameState.totalKeys,
    keysToBuy,
    gameState.basePriceLamports,
    gameState.priceIncrementLamports
  );

  // Step 1: Protocol fee (house edge)
  const protocolFee = bpsSplit(totalCost, gameState.protocolFeeBps);
  const afterFee = totalCost - protocolFee;

  // Step 2: Referral bonus (from after-fee amount)
  const referralBonus = hasReferrer
    ? bpsSplit(afterFee, gameState.referralBonusBps)
    : 0;
  const potContribution = afterFee - referralBonus;

  // Step 3: Pot splits
  const winnerShare = bpsSplit(potContribution, gameState.winnerBps);
  const dividendShare = bpsSplit(potContribution, gameState.dividendBps);
  const nextRoundShare = bpsSplit(potContribution, gameState.nextRoundBps);

  return {
    totalCost,
    protocolFee,
    afterFee,
    referralBonus,
    potContribution,
    winnerShare,
    dividendShare,
    nextRoundShare,
  };
}

/**
 * Estimate dividend payout for a player at round end.
 * dividend = (playerKeys / totalKeys) * totalDividendPool
 */
export function estimateDividend(
  gameState: OnChainGameState,
  playerKeys: number
): number {
  if (gameState.totalKeys === 0 || playerKeys === 0) return 0;
  return Math.floor(
    (playerKeys / gameState.totalKeys) * gameState.totalDividendPool
  );
}

/**
 * Estimate the winner prize (last buyer's payout).
 */
export function estimateWinnerPrize(gameState: OnChainGameState): number {
  return gameState.winnerPot;
}

/**
 * Calculate how many keys a given SOL budget can buy.
 * Uses binary search since the cost function is monotonically increasing.
 */
export function maxKeysForBudget(
  gameState: OnChainGameState,
  budgetLamports: number
): number {
  if (budgetLamports <= 0) return 0;

  let lo = 0;
  let hi = 1_000_000; // upper bound

  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const cost = calculateCost(
      gameState.totalKeys,
      mid,
      gameState.basePriceLamports,
      gameState.priceIncrementLamports
    );
    if (cost <= budgetLamports) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return lo;
}
