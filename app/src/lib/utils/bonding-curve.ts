/**
 * Calculate the price of the Nth key (0-indexed: first key is N=0).
 * price(N) = basePrice + increment * N
 */
export function calculateKeyPrice(
  totalKeysSold: number,
  basePrice: number,
  priceIncrement: number
): number {
  return basePrice + priceIncrement * totalKeysSold;
}

/**
 * Calculate the total cost to buy `keysToBuy` keys when `totalKeysSold` have been sold.
 * Uses the arithmetic series sum:
 *   cost = keysToBuy * basePrice + increment * (totalKeysSold * keysToBuy + keysToBuy * (keysToBuy - 1) / 2)
 *
 * This matches the Rust on-chain formula exactly.
 */
export function calculateCost(
  totalKeysSold: number,
  keysToBuy: number,
  basePrice: number,
  priceIncrement: number
): number {
  if (keysToBuy <= 0) return 0;
  const baseCost = keysToBuy * basePrice;
  const incrementCost =
    priceIncrement *
    (totalKeysSold * keysToBuy + (keysToBuy * (keysToBuy - 1)) / 2);
  return baseCost + incrementCost;
}

/**
 * Calculate the average price per key for a batch purchase.
 */
export function calculateAvgPrice(
  totalKeysSold: number,
  keysToBuy: number,
  basePrice: number,
  priceIncrement: number
): number {
  if (keysToBuy <= 0) return 0;
  return calculateCost(totalKeysSold, keysToBuy, basePrice, priceIncrement) / keysToBuy;
}
