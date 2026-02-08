import { describe, it, expect, vi } from "vitest";
import { assembleSkillMd } from "./template";
import type { GameStateResponse, LeaderboardResponse } from "@/types/api";
import type { ActivityMetrics } from "@/lib/activity-metrics";
import type { NetworkInfo } from "./sections/network-info";

const mockNetwork: NetworkInfo = {
  cluster: "devnet",
  publicRpcUrl: "https://api.devnet.solana.com",
  programId: "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw",
};

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

const mockActivity: ActivityMetrics = {
  recentBuys: [
    { player: "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs", keys: 5, amountLamports: 250_000_000, relativeTime: "2m ago", agoSecs: 120 },
    { player: "BoT2kMnW9pQfLhJ7eSdR8xYv3nCgA6iUjKlZw5tH4bXs", keys: 10, amountLamports: 500_000_000, relativeTime: "7m ago", agoSecs: 420 },
  ],
  buysLastHour: 23,
  uniquePlayersLastHour: 8,
  timeSinceLastBuy: "2m ago",
  totalPlayers: 15,
};

describe("assembleSkillMd", () => {
  it("produces valid markdown with all sections", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);

    // Should not contain undefined, null, or NaN
    expect(md).not.toContain("undefined");
    expect(md).not.toContain("null");
    expect(md).not.toContain("NaN");

    // Should contain key sections (crustacean terminology)
    expect(md).toContain("FOMolt3D");
    expect(md).toContain("## wtf is this?");
    expect(md).toContain("## Three Ways to Win");
    expect(md).toContain("## Prerequisites");
    expect(md).toContain("## Network Configuration");
    expect(md).toContain("## Quick Start");
    expect(md).toContain("## Strategy Playbook");
    expect(md).toContain("## API Reference");
    expect(md).toContain("## Monitoring");
    expect(md).toContain("## Income Opportunities");
    expect(md).toContain("## Shell Link System");
    expect(md).toContain("## Error Codes");
    expect(md).toContain("## Claw Rankings");
    expect(md).toContain("localhost:3000");
  });

  it("hides blinkUrl when NEXT_PUBLIC_REFERRALS_ENABLED is not set", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);

    // Referral section should still appear
    expect(md).toContain("## Shell Link System");
    // But blinkUrl / dial.to should not
    expect(md).not.toContain("dial.to");
    expect(md).not.toContain("blinkUrl");
  });

  it("includes blinkUrl when NEXT_PUBLIC_REFERRALS_ENABLED is true", async () => {
    vi.stubEnv("NEXT_PUBLIC_REFERRALS_ENABLED", "true");
    vi.resetModules();
    const { assembleSkillMd: freshAssemble } = await import("./template");
    const md = freshAssemble(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);

    expect(md).toContain("## Shell Link System");
    expect(md).toContain("dial.to");
    expect(md).toContain("blinkUrl");

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("includes live game data in pitch", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);

    // Should include pot value
    expect(md).toContain("42.50");
    // Should include key count
    expect(md).toContain("347");
    // Should include round number
    expect(md).toContain("Round #1");
    // Should include phase
    expect(md).toContain("ACTIVE");
    // Should include ROI math in pitch
    expect(md).toContain(":1");
  });

  it("includes leaderboard entries with type badges", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("AgNt");
    expect(md).toContain("85");
  });

  it("uses crustacean terminology", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("King Claw");
    expect(md).toContain("claws");
    expect(md).toContain("scraps");
    expect(md).toContain("shell link");
  });

  it("includes network configuration for agents", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("## Network Configuration");
    expect(md).toContain("devnet");
    expect(md).toContain("https://api.devnet.solana.com");
    expect(md).toContain("EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw");
    expect(md).toContain("Solana DEVNET");
  });

  it("includes network info in frontmatter YAML", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("cluster: devnet");
    expect(md).toContain("rpc_url: https://api.devnet.solana.com");
    expect(md).toContain("program_id: EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw");
  });

  it("tells agents about the tx send relay endpoint", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("/api/tx/send");
    expect(md).toContain("handles network routing");
  });

  it("includes prerequisites section with wallet setup", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("## Prerequisites");
    expect(md).toContain("Solana Keypair");
    expect(md).toContain("solana-keygen");
    expect(md).toContain("Sign and Submit");
    expect(md).toContain("base64");
  });

  it("includes strategy playbook with four strategies", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("## Strategy Playbook");
    expect(md).toContain("Strategy 1: The Accumulator");
    expect(md).toContain("Strategy 2: The Sniper");
    expect(md).toContain("Strategy 3: The Referral Farmer");
    expect(md).toContain("Strategy 4: The Hybrid");
    expect(md).toContain("Tell Your Human");
  });

  it("includes FOMO3D heritage in what-is-this", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("FOMO3D");
    expect(md).toContain("$2.9 million");
  });

  it("includes monitoring with sniping and CRON guidance", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("Sniper Alert");
    expect(md).toContain("Autonomous Play");
    expect(md).toContain("Referral Earnings Tracker");
    expect(md).toContain("Why Keep Coming Back");
  });

  it("includes compelling referral motivation", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("Why refer?");
    expect(md).toContain("Free money");
    expect(md).toContain("Compounds with your position");
    expect(md).toContain("Track your earnings");
  });

  it("includes devnet SOL faucet instructions in prerequisites", () => {
    const md = assembleSkillMd(mockState, mockLeaderboard, mockActivity, "http://localhost:3000", mockNetwork);
    expect(md).toContain("solana airdrop");
    expect(md).toContain("free on devnet");
  });
});
