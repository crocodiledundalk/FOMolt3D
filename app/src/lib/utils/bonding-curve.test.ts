import { describe, it, expect } from "vitest";
import { calculateKeyPrice, calculateCost, calculateAvgPrice } from "./bonding-curve";

// Default game parameters (matching GlobalConfig defaults)
const BASE = 10_000_000; // 0.01 SOL
const INC = 1_000_000; // 0.001 SOL

describe("calculateKeyPrice", () => {
  it("returns base price for 0 keys sold", () => {
    // price(0) = 0.01 SOL = 10_000_000 lamports
    expect(calculateKeyPrice(0, BASE, INC)).toBe(10_000_000);
  });

  it("increments correctly per key", () => {
    // price(1) = 0.01 + 0.001 * 1 = 0.011 SOL
    expect(calculateKeyPrice(1, BASE, INC)).toBe(11_000_000);
    // price(10) = 0.01 + 0.001 * 10 = 0.02 SOL
    expect(calculateKeyPrice(10, BASE, INC)).toBe(20_000_000);
    // price(100) = 0.01 + 0.001 * 100 = 0.11 SOL
    expect(calculateKeyPrice(100, BASE, INC)).toBe(110_000_000);
  });

  it("handles large key counts", () => {
    // price(1000) = 0.01 + 0.001 * 1000 = 1.01 SOL
    expect(calculateKeyPrice(1000, BASE, INC)).toBe(1_010_000_000);
  });

  it("works with custom parameters", () => {
    // Custom: base=5M, inc=2M → price(3) = 5M + 2M*3 = 11M
    expect(calculateKeyPrice(3, 5_000_000, 2_000_000)).toBe(11_000_000);
  });
});

describe("calculateCost", () => {
  it("returns 0 for 0 keys", () => {
    expect(calculateCost(100, 0, BASE, INC)).toBe(0);
  });

  it("returns single key price for 1 key", () => {
    // cost of buying 1 key when 0 sold = price(0) = 10_000_000
    expect(calculateCost(0, 1, BASE, INC)).toBe(10_000_000);
    // cost of buying 1 key when 10 sold = price(10) = 20_000_000
    expect(calculateCost(10, 1, BASE, INC)).toBe(20_000_000);
  });

  it("sums prices correctly for multiple keys", () => {
    // Buy 3 keys when 0 sold:
    // price(0) + price(1) + price(2) = 10M + 11M + 12M = 33M
    expect(calculateCost(0, 3, BASE, INC)).toBe(33_000_000);
  });

  it("handles batch purchase from non-zero base", () => {
    // Buy 2 keys when 5 sold:
    // price(5) + price(6) = 15M + 16M = 31M
    expect(calculateCost(5, 2, BASE, INC)).toBe(31_000_000);
  });

  it("matches manual arithmetic series for 10 keys from 0", () => {
    // Sum of price(0) through price(9):
    // = 10 * 10M + 1M * (0+1+2+...+9)
    // = 100M + 1M * 45
    // = 145M
    expect(calculateCost(0, 10, BASE, INC)).toBe(145_000_000);
  });

  it("returns 0 for negative keys", () => {
    expect(calculateCost(0, -1, BASE, INC)).toBe(0);
  });
});

describe("calculateAvgPrice", () => {
  it("returns 0 for 0 keys", () => {
    expect(calculateAvgPrice(10, 0, BASE, INC)).toBe(0);
  });

  it("equals single price for 1 key", () => {
    expect(calculateAvgPrice(0, 1, BASE, INC)).toBe(10_000_000);
  });

  it("returns average of batch", () => {
    // 3 keys from 0: cost=33M, avg=11M
    expect(calculateAvgPrice(0, 3, BASE, INC)).toBe(11_000_000);
  });
});
