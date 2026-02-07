import { describe, it, expect } from "vitest";
import { assembleSkillMd } from "./template";
import type { GameStateResponse, LeaderboardResponse } from "@/types/api";

const mockState: GameStateResponse = {
  gameState: {
    round: 1,
    potLamports: 42_500_000_000,
    timerEnd: Math.floor(Date.now() / 1000) + 14400,
    lastBuyer: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs",
    totalKeys: 347,
    roundStart: Math.floor(Date.now() / 1000) - 72000,
    active: true,
    winnerClaimed: false,
    totalPlayers: 10,
    totalDividendPool: 19_125_000_000,
    nextRoundPot: 2_975_000_000,
    winnerPot: 20_400_000_000,
    basePriceLamports: 10_000_000,
    priceIncrementLamports: 1_000_000,
    timerExtensionSecs: 30,
    maxTimerSecs: 86_400,
    winnerBps: 4800,
    dividendBps: 4500,
    nextRoundBps: 700,
    protocolFeeBps: 200,
    referralBonusBps: 1000,
    protocolWallet: "11111111111111111111111111111111",
  },
  keyPriceLamports: 357_000_000,
  nextKeyPriceLamports: 358_000_000,
  phase: "active",
};

const mockLeaderboard: LeaderboardResponse = {
  keyHolders: [
    { rank: 1, player: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs", keys: 85, totalDividends: 2_730_000_000, isAgent: true },
    { rank: 2, player: "BoT2kMnW9pQfLhJ7eSdR8xYv3nCgA6iUjKlZw5tH4bXs", keys: 62, totalDividends: 1_950_000_000, isAgent: true },
  ],
  dividendEarners: [],
  topReferrers: [],
};

describe("assembleSkillMd", () => {
  it("produces valid markdown with all sections", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, "http://localhost:3000");

    // Should not contain undefined, null, or NaN
    expect(md).not.toContain("undefined");
    expect(md).not.toContain("null");
    expect(md).not.toContain("NaN");

    // Should contain key sections (crustacean terminology)
    expect(md).toContain("FOMolt3D");
    expect(md).toContain("## wtf is this?");
    expect(md).toContain("## Three Ways to Win");
    expect(md).toContain("## Quick Start");
    expect(md).toContain("## API Reference");
    expect(md).toContain("## Monitoring");
    expect(md).toContain("## Income Opportunities");
    expect(md).toContain("## Shell Link System");
    expect(md).toContain("## Error Codes");
    expect(md).toContain("## Claw Rankings");
    expect(md).toContain("localhost:3000");
  });

  it("does not contain removed sections", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, "http://localhost:3000");
    expect(md).not.toContain("## Strategy Guide");
  });

  it("includes live game data in pitch", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, "http://localhost:3000");

    // Should include pot value
    expect(md).toContain("42.50");
    // Should include key count
    expect(md).toContain("347");
    // Should include molt number
    expect(md).toContain("Molt #1");
    // Should include phase
    expect(md).toContain("ACTIVE");
    // Should include ROI math in pitch
    expect(md).toContain(":1");
  });

  it("includes leaderboard entries with type badges", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, "http://localhost:3000");
    expect(md).toContain("AgNt");
    expect(md).toContain("85");
  });

  it("uses crustacean terminology", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, "http://localhost:3000");
    expect(md).toContain("King Claw");
    expect(md).toContain("claws");
    expect(md).toContain("scraps");
    expect(md).toContain("shell link");
  });
});
