// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { getPlayerStatus, getGamePhase } from "../player-status";
import type { OnChainGameState, OnChainPlayerState } from "../types";

const PLAYER_A = new PublicKey(
  "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4Ui3ppRs"
);
const PLAYER_B = new PublicKey(
  "FfEm7xR2N8i3gmpMH2pZaM1S3VHtLq9KQEoN1XaCrYj"
);
const PROTOCOL_WALLET = new PublicKey(
  "De5i3kMnW9pQfNhJ7eSdR8xYv3nCgA6iUjKNZw5tH4b"
);

function makeGameState(overrides: Partial<OnChainGameState> = {}): OnChainGameState {
  return {
    round: 1,
    potLamports: 100_000_000_000,
    timerEnd: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    lastBuyer: PLAYER_B,
    totalKeys: 100,
    roundStart: Math.floor(Date.now() / 1000) - 7200,
    active: true,
    winnerClaimed: false,
    totalPlayers: 5,
    totalDividendPool: 45_000_000_000,
    nextRoundPot: 7_000_000_000,
    winnerPot: 48_000_000_000,
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

function makePlayerState(
  overrides: Partial<OnChainPlayerState> = {}
): OnChainPlayerState {
  return {
    player: PLAYER_A,
    keys: 10,
    currentRound: 1,
    claimedDividendsLamports: 0,
    referrer: null,
    referralEarningsLamports: 0,
    claimedReferralEarningsLamports: 0,
    isAgent: true,
    bump: 254,
    ...overrides,
  };
}

// ─── getGamePhase ──────────────────────────────────────────────────

describe("getGamePhase", () => {
  it("returns 'waiting' for null game state", () => {
    expect(getGamePhase(null)).toBe("waiting");
  });

  it("returns 'active' when timer has > 5 min remaining", () => {
    const gs = makeGameState({
      active: true,
      timerEnd: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(getGamePhase(gs)).toBe("active");
  });

  it("returns 'ending' when timer has < 5 min remaining", () => {
    const now = Math.floor(Date.now() / 1000);
    const gs = makeGameState({
      active: true,
      timerEnd: now + 120, // 2 minutes left
    });
    expect(getGamePhase(gs, now)).toBe("ending");
  });

  it("returns 'ended' when active but timer expired (auto-end not triggered)", () => {
    const now = Math.floor(Date.now() / 1000);
    const gs = makeGameState({
      active: true,
      timerEnd: now - 10, // expired 10s ago
    });
    expect(getGamePhase(gs, now)).toBe("ended");
  });

  it("returns 'ended' when inactive and winner not claimed", () => {
    const gs = makeGameState({ active: false, winnerClaimed: false });
    expect(getGamePhase(gs)).toBe("ended");
  });

  it("returns 'claiming' when inactive and winner has claimed", () => {
    const gs = makeGameState({ active: false, winnerClaimed: true });
    expect(getGamePhase(gs)).toBe("claiming");
  });
});

// ─── getPlayerStatus ────────────────────────────────────────────────

describe("getPlayerStatus", () => {
  describe("null game state", () => {
    it("returns waiting phase with no actions", () => {
      const status = getPlayerStatus(null, null);
      expect(status.phase).toBe("waiting");
      expect(status.needsRegistration).toBe(true);
      expect(status.canBuyKeys).toBe(false);
      expect(status.canClaim).toBe(false);
    });
  });

  describe("never played (null playerState)", () => {
    it("needs registration, cannot buy yet", () => {
      const gs = makeGameState();
      const status = getPlayerStatus(gs, null, PLAYER_A);
      expect(status.needsRegistration).toBe(true);
      expect(status.needsSettlement).toBe(false);
      expect(status.canBuyKeys).toBe(false);
      expect(status.canClaim).toBe(false);
      expect(status.keys).toBe(0);
    });
  });

  describe("active in current round", () => {
    it("can buy keys when game is active", () => {
      const gs = makeGameState({ active: true, round: 1 });
      const ps = makePlayerState({ currentRound: 1, keys: 10 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.needsRegistration).toBe(false);
      expect(status.needsSettlement).toBe(false);
      expect(status.canBuyKeys).toBe(true);
      expect(status.canClaim).toBe(false);
      expect(status.keys).toBe(10);
    });

    it("estimates dividend correctly", () => {
      const gs = makeGameState({
        totalKeys: 100,
        totalDividendPool: 45_000_000_000,
      });
      const ps = makePlayerState({ keys: 10, currentRound: 1 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      // 10/100 * 45B = 4.5B
      expect(status.estimatedDividend).toBe(4_500_000_000);
    });

    it("identifies winner correctly", () => {
      const gs = makeGameState({ lastBuyer: PLAYER_A, totalKeys: 50 });
      const ps = makePlayerState({ currentRound: 1 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.isWinner).toBe(true);
      expect(status.estimatedWinnerPrize).toBe(gs.winnerPot);
    });

    it("not winner if different player", () => {
      const gs = makeGameState({ lastBuyer: PLAYER_B });
      const ps = makePlayerState({ currentRound: 1 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.isWinner).toBe(false);
      expect(status.estimatedWinnerPrize).toBe(0);
    });
  });

  describe("round ended, unclaimed", () => {
    it("can claim dividends when round ended", () => {
      const gs = makeGameState({
        active: false,
        winnerClaimed: false,
        round: 1,
      });
      const ps = makePlayerState({ currentRound: 1, keys: 10 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.canBuyKeys).toBe(false);
      expect(status.canClaim).toBe(true);
      expect(status.estimatedDividend).toBeGreaterThan(0);
    });

    it("winner can claim when round ended", () => {
      const gs = makeGameState({
        active: false,
        winnerClaimed: false,
        lastBuyer: PLAYER_A,
        totalKeys: 50,
      });
      const ps = makePlayerState({ currentRound: 1, keys: 5 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.canClaim).toBe(true);
      expect(status.isWinner).toBe(true);
    });
  });

  describe("already claimed (sentinel currentRound == 0)", () => {
    it("needs registration, can't claim again", () => {
      const gs = makeGameState({ active: false, round: 1 });
      const ps = makePlayerState({ currentRound: 0, keys: 10 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.needsRegistration).toBe(true);
      expect(status.canClaim).toBe(false);
      expect(status.canBuyKeys).toBe(false);
    });

    it("can still claim referral earnings", () => {
      const gs = makeGameState({ round: 1 });
      const ps = makePlayerState({
        currentRound: 0,
        referralEarningsLamports: 500_000_000,
        claimedReferralEarningsLamports: 0,
      });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.canClaimReferral).toBe(true);
      expect(status.unclaimedReferralEarnings).toBe(500_000_000);
    });
  });

  describe("stale round (needs claim from old round)", () => {
    it("detects stale round correctly", () => {
      const gs = makeGameState({ round: 3, active: true });
      const ps = makePlayerState({ currentRound: 1, keys: 25 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.needsSettlement).toBe(true);
      expect(status.staleRound).toBe(1);
      expect(status.canBuyKeys).toBe(false);
      expect(status.canClaim).toBe(true); // stale round players can claim from old round
      expect(status.keys).toBe(25);
    });
  });

  describe("referral earnings (independent of round state)", () => {
    it("detects unclaimed referral earnings", () => {
      const gs = makeGameState({ round: 1 });
      const ps = makePlayerState({
        currentRound: 1,
        referralEarningsLamports: 1_000_000_000,
        claimedReferralEarningsLamports: 300_000_000,
      });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.canClaimReferral).toBe(true);
      expect(status.unclaimedReferralEarnings).toBe(700_000_000);
    });

    it("no referral earnings to claim", () => {
      const gs = makeGameState({ round: 1 });
      const ps = makePlayerState({
        currentRound: 1,
        referralEarningsLamports: 500,
        claimedReferralEarningsLamports: 500,
      });
      const status = getPlayerStatus(gs, ps, PLAYER_A);

      expect(status.canClaimReferral).toBe(false);
      expect(status.unclaimedReferralEarnings).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("zero keys means zero dividend", () => {
      const gs = makeGameState({ totalKeys: 100, totalDividendPool: 45_000_000_000 });
      const ps = makePlayerState({ keys: 0, currentRound: 1 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);
      expect(status.estimatedDividend).toBe(0);
    });

    it("zero total keys means zero dividend", () => {
      const gs = makeGameState({ totalKeys: 0, totalDividendPool: 0 });
      const ps = makePlayerState({ keys: 10, currentRound: 1 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);
      expect(status.estimatedDividend).toBe(0);
    });

    it("not winner if total keys is 0 (empty round)", () => {
      const gs = makeGameState({
        lastBuyer: PLAYER_A,
        totalKeys: 0,
      });
      const ps = makePlayerState({ currentRound: 1 });
      const status = getPlayerStatus(gs, ps, PLAYER_A);
      expect(status.isWinner).toBe(false);
    });
  });
});
