// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  calculateCost,
  getNextKeyPrice,
  estimateBuyCost,
  estimateDividend,
  estimateWinnerPrize,
  maxKeysForBudget,
} from "../estimates";
import type { OnChainGameState } from "../types";

const PROTOCOL_WALLET = new PublicKey(
  "De5i3kMnW9pQfNhJ7eSdR8xYv3nCgA6iUjKNZw5tH4b"
);
const PLAYER_B = new PublicKey(
  "FfEm7xR2N8i3gmpMH2pZaM1S3VHtLq9KQEoN1XaCrYj"
);

function makeGameState(
  overrides: Partial<OnChainGameState> = {}
): OnChainGameState {
  return {
    round: 1,
    potLamports: 0,
    timerEnd: 0,
    lastBuyer: PLAYER_B,
    totalKeys: 0,
    roundStart: 0,
    active: true,
    winnerClaimed: false,
    totalPlayers: 0,
    totalDividendPool: 0,
    nextRoundPot: 0,
    winnerPot: 0,
    basePriceLamports: 10_000_000,
    priceIncrementLamports: 1_000_000,
    timerExtensionSecs: 30,
    maxTimerSecs: 86400,
    winnerBps: 4800,
    dividendBps: 4500,
    nextRoundBps: 700,
    protocolFeeBps: 200,
    referralBonusBps: 1000,
    protocolWallet: PROTOCOL_WALLET,
    bump: 255,
    ...overrides,
  };
}

// ─── calculateCost ─────────────────────────────────────────────────

describe("calculateCost", () => {
  const base = 10_000_000; // 0.01 SOL
  const incr = 1_000_000; // 0.001 SOL

  it("first key costs base price", () => {
    // cost = 1 * 10M + 1M * 1 * (0 + 0) / 2 = 10M
    expect(calculateCost(0, 1, base, incr)).toBe(10_000_000);
  });

  it("second key costs base + increment", () => {
    // cost = 1 * 10M + 1M * 1 * (2 + 0) / 2 = 10M + 1M = 11M
    expect(calculateCost(1, 1, base, incr)).toBe(11_000_000);
  });

  it("buying 2 keys from 0 supply", () => {
    // cost = 2 * 10M + 1M * 2 * (0 + 1) / 2 = 20M + 1M = 21M
    expect(calculateCost(0, 2, base, incr)).toBe(21_000_000);
  });

  it("buying 10 keys from 0 supply", () => {
    // cost = 10 * 10M + 1M * 10 * (0 + 9) / 2 = 100M + 45M = 145M
    expect(calculateCost(0, 10, base, incr)).toBe(145_000_000);
  });

  it("buying 5 keys from supply of 100", () => {
    // cost = 5 * 10M + 1M * 5 * (200 + 4) / 2 = 50M + 510M = 560M
    expect(calculateCost(100, 5, base, incr)).toBe(560_000_000);
  });

  it("returns 0 for 0 keys", () => {
    expect(calculateCost(0, 0, base, incr)).toBe(0);
  });

  it("returns 0 for negative keys", () => {
    expect(calculateCost(0, -1, base, incr)).toBe(0);
  });
});

// ─── getNextKeyPrice ───────────────────────────────────────────────

describe("getNextKeyPrice", () => {
  it("first key price with 0 supply", () => {
    const gs = makeGameState({ totalKeys: 0 });
    expect(getNextKeyPrice(gs)).toBe(10_000_000);
  });

  it("price at 100 keys sold", () => {
    const gs = makeGameState({ totalKeys: 100 });
    // 10M + 1M * 100 = 110M
    expect(getNextKeyPrice(gs)).toBe(110_000_000);
  });
});

// ─── estimateBuyCost ───────────────────────────────────────────────

describe("estimateBuyCost", () => {
  it("full breakdown for 1 key at supply 0, no referrer", () => {
    const gs = makeGameState({ totalKeys: 0 });
    const est = estimateBuyCost(gs, 1, false);

    expect(est.totalCost).toBe(10_000_000);
    // Protocol fee: 10M * 200 / 10000 = 200_000
    expect(est.protocolFee).toBe(200_000);
    // After fee: 10M - 200K = 9_800_000
    expect(est.afterFee).toBe(9_800_000);
    // No referral
    expect(est.referralBonus).toBe(0);
    // Pot contribution = after fee
    expect(est.potContribution).toBe(9_800_000);
    // Winner: 9.8M * 4800 / 10000 = 4_704_000
    expect(est.winnerShare).toBe(4_704_000);
    // Dividend: 9.8M * 4500 / 10000 = 4_410_000
    expect(est.dividendShare).toBe(4_410_000);
    // Next round: 9.8M * 700 / 10000 = 686_000
    expect(est.nextRoundShare).toBe(686_000);
  });

  it("full breakdown with referrer", () => {
    const gs = makeGameState({ totalKeys: 0 });
    const est = estimateBuyCost(gs, 1, true);

    expect(est.totalCost).toBe(10_000_000);
    expect(est.protocolFee).toBe(200_000);
    expect(est.afterFee).toBe(9_800_000);
    // Referral: 9.8M * 1000 / 10000 = 980_000
    expect(est.referralBonus).toBe(980_000);
    // Pot contribution: 9.8M - 980K = 8_820_000
    expect(est.potContribution).toBe(8_820_000);
  });

  it("conservation of funds (total = sum of all parts)", () => {
    const gs = makeGameState({ totalKeys: 50 });
    const est = estimateBuyCost(gs, 5, true);

    const accounted =
      est.protocolFee +
      est.referralBonus +
      est.winnerShare +
      est.dividendShare +
      est.nextRoundShare;
    // Allow up to 3 lamports dust from integer division
    expect(Math.abs(est.totalCost - accounted)).toBeLessThanOrEqual(3);
  });
});

// ─── estimateDividend ──────────────────────────────────────────────

describe("estimateDividend", () => {
  it("proportional dividend calculation", () => {
    const gs = makeGameState({
      totalKeys: 100,
      totalDividendPool: 45_000_000_000,
    });
    // 10/100 * 45B = 4.5B
    expect(estimateDividend(gs, 10)).toBe(4_500_000_000);
  });

  it("returns 0 for 0 keys", () => {
    const gs = makeGameState({ totalKeys: 100, totalDividendPool: 45_000_000_000 });
    expect(estimateDividend(gs, 0)).toBe(0);
  });

  it("returns 0 for 0 total keys", () => {
    const gs = makeGameState({ totalKeys: 0, totalDividendPool: 0 });
    expect(estimateDividend(gs, 10)).toBe(0);
  });

  it("full share for single player", () => {
    const gs = makeGameState({
      totalKeys: 50,
      totalDividendPool: 10_000_000_000,
    });
    expect(estimateDividend(gs, 50)).toBe(10_000_000_000);
  });
});

// ─── estimateWinnerPrize ───────────────────────────────────────────

describe("estimateWinnerPrize", () => {
  it("returns winnerPot from game state", () => {
    const gs = makeGameState({ winnerPot: 48_000_000_000 });
    expect(estimateWinnerPrize(gs)).toBe(48_000_000_000);
  });
});

// ─── maxKeysForBudget ──────────────────────────────────────────────

describe("maxKeysForBudget", () => {
  it("returns 0 for 0 budget", () => {
    const gs = makeGameState({ totalKeys: 0 });
    expect(maxKeysForBudget(gs, 0)).toBe(0);
  });

  it("can buy 1 key with exactly the right budget", () => {
    const gs = makeGameState({ totalKeys: 0 });
    // First key costs 10M
    expect(maxKeysForBudget(gs, 10_000_000)).toBe(1);
  });

  it("can buy 2 keys with 21M budget", () => {
    const gs = makeGameState({ totalKeys: 0 });
    // 2 keys from 0 costs 21M
    expect(maxKeysForBudget(gs, 21_000_000)).toBe(2);
  });

  it("cannot buy any keys if budget too small", () => {
    const gs = makeGameState({ totalKeys: 0 });
    expect(maxKeysForBudget(gs, 9_999_999)).toBe(0);
  });

  it("handles budget with remainder", () => {
    const gs = makeGameState({ totalKeys: 0 });
    // 15M is enough for 1 key (10M) but not 2 (21M)
    expect(maxKeysForBudget(gs, 15_000_000)).toBe(1);
  });

  it("works with existing supply", () => {
    const gs = makeGameState({ totalKeys: 100 });
    // Key 101 costs 10M + 1M*100 = 110M
    expect(maxKeysForBudget(gs, 110_000_000)).toBe(1);
    expect(maxKeysForBudget(gs, 109_999_999)).toBe(0);
  });
});
