import { describe, it, expect } from "vitest";
import { toGameEvent } from "./to-game-event";
import type {
  KeysPurchasedEvent,
  ClaimedEvent,
  RoundStartedEvent,
  GameUpdatedEvent,
  ReferralEarnedEvent,
  ReferralClaimedEvent,
  RoundConcludedEvent,
  ProtocolFeeCollectedEvent,
} from "@/types/program-events";

describe("toGameEvent", () => {
  it("converts KeysPurchased to BUY event", () => {
    const event: KeysPurchasedEvent = {
      type: "KeysPurchased",
      round: 1,
      player: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      isAgent: true,
      keysBought: 5,
      totalPlayerKeys: 15,
      lamportsSpent: 250_000_000,
      potContribution: 200_000_000,
      timestamp: 1700000000,
    };

    const result = toGameEvent(event);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("BUY");
    expect(result!.player).toBe(event.player);
    expect(result!.amount).toBe(250_000_000);
    expect(result!.keys).toBe(5);
    expect(result!.round).toBe(1);
    expect(result!.id).toMatch(/^sse-/);
  });

  it("converts Claimed (dividend only) to CLAIM event", () => {
    const event: ClaimedEvent = {
      type: "Claimed",
      round: 1,
      player: "BoT2kMnW9pQfLhJ7eSdR8xYv3nCgA6iUjKlZw5tH4bXs",
      dividendLamports: 500_000_000,
      winnerLamports: 0,
      totalLamports: 500_000_000,
      timestamp: 1700000000,
    };

    const result = toGameEvent(event);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("CLAIM");
    expect(result!.player).toBe(event.player);
    expect(result!.amount).toBe(500_000_000);
  });

  it("converts Claimed (with winner prize) to WIN event", () => {
    const event: ClaimedEvent = {
      type: "Claimed",
      round: 1,
      player: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      dividendLamports: 500_000_000,
      winnerLamports: 20_000_000_000,
      totalLamports: 20_500_000_000,
      timestamp: 1700000000,
    };

    const result = toGameEvent(event);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("WIN");
    expect(result!.amount).toBe(20_500_000_000);
  });

  it("converts RoundStarted to ROUND_START event", () => {
    const event: RoundStartedEvent = {
      type: "RoundStarted",
      round: 2,
      carryOverLamports: 1_000_000_000,
      timerEnd: 1700086400,
      basePriceLamports: 10_000_000,
      priceIncrementLamports: 1_000_000,
      timestamp: 1700000000,
    };

    const result = toGameEvent(event);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("ROUND_START");
    expect(result!.round).toBe(2);
    expect(result!.amount).toBe(1_000_000_000);
  });

  it("returns null for GameUpdated", () => {
    const event: GameUpdatedEvent = {
      type: "GameUpdated",
      round: 1,
      potLamports: 10_000_000_000,
      totalKeys: 100,
      nextKeyPrice: 110_000_000,
      lastBuyer: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      timerEnd: 1700000000,
      winnerPot: 4_800_000_000,
      nextRoundPot: 700_000_000,
      timestamp: 1700000000,
    };
    expect(toGameEvent(event)).toBeNull();
  });

  it("returns null for ReferralEarned", () => {
    const event: ReferralEarnedEvent = {
      type: "ReferralEarned",
      round: 1,
      player: "BoT2kMnW9pQfLhJ7eSdR8xYv3nCgA6iUjKlZw5tH4bXs",
      referrer: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      keysBought: 5,
      lamportsSpent: 250_000_000,
      referrerLamports: 50_000_000,
      timestamp: 1700000000,
    };
    expect(toGameEvent(event)).toBeNull();
  });

  it("returns null for ReferralClaimed", () => {
    const event: ReferralClaimedEvent = {
      type: "ReferralClaimed",
      round: 1,
      player: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      lamports: 100_000_000,
      timestamp: 1700000000,
    };
    expect(toGameEvent(event)).toBeNull();
  });

  it("returns null for RoundConcluded", () => {
    const event: RoundConcludedEvent = {
      type: "RoundConcluded",
      round: 1,
      winner: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      winnerLamports: 20_000_000_000,
      potLamports: 42_000_000_000,
      totalKeys: 500,
      totalPlayers: 25,
      nextRoundPot: 3_000_000_000,
      roundStart: 1699900000,
      roundEnd: 1700000000,
      timestamp: 1700000000,
    };
    expect(toGameEvent(event)).toBeNull();
  });

  it("returns null for ProtocolFeeCollected", () => {
    const event: ProtocolFeeCollectedEvent = {
      type: "ProtocolFeeCollected",
      round: 1,
      lamports: 100_000_000,
      recipient: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      timestamp: 1700000000,
    };
    expect(toGameEvent(event)).toBeNull();
  });

  it("generates unique IDs across calls", () => {
    const event: KeysPurchasedEvent = {
      type: "KeysPurchased",
      round: 1,
      player: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
      isAgent: false,
      keysBought: 1,
      totalPlayerKeys: 1,
      lamportsSpent: 10_000_000,
      potContribution: 8_000_000,
      timestamp: 1700000000,
    };

    const a = toGameEvent(event);
    const b = toGameEvent(event);
    expect(a!.id).not.toBe(b!.id);
  });
});
