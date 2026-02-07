import { describe, it, expect } from "vitest";
import { pubkeySchema, buyKeysRequestSchema, referralCreateSchema } from "./game";

describe("pubkeySchema", () => {
  it("accepts valid Solana pubkeys", () => {
    expect(pubkeySchema.safeParse("AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs").success).toBe(true);
    expect(pubkeySchema.safeParse("11111111111111111111111111111111").success).toBe(true);
  });

  it("rejects invalid pubkeys", () => {
    expect(pubkeySchema.safeParse("").success).toBe(false);
    expect(pubkeySchema.safeParse("short").success).toBe(false);
    expect(pubkeySchema.safeParse("0x1234").success).toBe(false); // has 0 and x
  });
});

describe("buyKeysRequestSchema", () => {
  it("accepts valid requests", () => {
    expect(
      buyKeysRequestSchema.safeParse({
        account: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
        keysToBuy: 5,
      }).success
    ).toBe(true);
  });

  it("rejects invalid key amounts", () => {
    expect(
      buyKeysRequestSchema.safeParse({
        account: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
        keysToBuy: 0,
      }).success
    ).toBe(false);

    expect(
      buyKeysRequestSchema.safeParse({
        account: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
        keysToBuy: 10001,
      }).success
    ).toBe(false);
  });
});

describe("referralCreateSchema", () => {
  it("accepts valid pubkey", () => {
    expect(
      referralCreateSchema.safeParse({
        pubkey: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      }).success
    ).toBe(true);
  });

  it("rejects missing pubkey", () => {
    expect(referralCreateSchema.safeParse({}).success).toBe(false);
  });
});
