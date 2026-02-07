// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey } from "@solana/web3.js";

// Mock SDK before importing cache module
vi.mock("./sdk", () => ({
  findCurrentRound: vi.fn(),
  fetchAllPlayersInRound: vi.fn(),
}));

import {
  getCachedGameRound,
  getCachedLeaderboardPlayers,
  invalidateGameRoundCache,
  invalidateLeaderboardCache,
  invalidateAllCaches,
} from "./rpc-cache";
import { findCurrentRound, fetchAllPlayersInRound } from "./sdk";

const mockedFindCurrentRound = vi.mocked(findCurrentRound);
const mockedFetchAllPlayers = vi.mocked(fetchAllPlayersInRound);

const FAKE_PUBKEY = new PublicKey("11111111111111111111111111111111");

function makeGameState(round = 1) {
  return {
    round,
    gameState: {
      round,
      potLamports: 1_000_000_000,
      timerEnd: Math.floor(Date.now() / 1000) + 3600,
      lastBuyer: FAKE_PUBKEY,
      totalKeys: 10,
      roundStart: Math.floor(Date.now() / 1000) - 1000,
      active: true,
      winnerClaimed: false,
      totalPlayers: 5,
      totalDividendPool: 500_000_000,
      nextRoundPot: 70_000_000,
      winnerPot: 480_000_000,
      basePriceLamports: 10_000_000,
      priceIncrementLamports: 1_000_000,
      timerExtensionSecs: 30,
      maxTimerSecs: 86400,
      winnerBps: 4800,
      dividendBps: 4500,
      nextRoundBps: 700,
      protocolFeeBps: 200,
      referralBonusBps: 1000,
      protocolWallet: FAKE_PUBKEY,
      bump: 255,
    },
  };
}

function makePlayerState(keys = 5) {
  return {
    player: FAKE_PUBKEY,
    keys,
    currentRound: 1,
    claimedDividendsLamports: 0,
    referrer: null,
    referralEarningsLamports: 0,
    claimedReferralEarningsLamports: 0,
    isAgent: false,
    bump: 254,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeProgram = {} as any;

describe("rpc-cache", () => {
  beforeEach(() => {
    invalidateAllCaches();
    vi.clearAllMocks();
  });

  describe("getCachedGameRound", () => {
    it("fetches from RPC on first call (cache miss)", async () => {
      const data = makeGameState();
      mockedFindCurrentRound.mockResolvedValue(data);

      const result = await getCachedGameRound(fakeProgram);
      expect(result).toEqual(data);
      expect(mockedFindCurrentRound).toHaveBeenCalledTimes(1);
    });

    it("returns cached data on subsequent calls within TTL", async () => {
      const data = makeGameState();
      mockedFindCurrentRound.mockResolvedValue(data);

      await getCachedGameRound(fakeProgram);
      await getCachedGameRound(fakeProgram);
      await getCachedGameRound(fakeProgram);

      expect(mockedFindCurrentRound).toHaveBeenCalledTimes(1);
    });

    it("re-fetches after TTL expires", async () => {
      const data1 = makeGameState(1);
      const data2 = makeGameState(2);
      mockedFindCurrentRound
        .mockResolvedValueOnce(data1)
        .mockResolvedValueOnce(data2);

      await getCachedGameRound(fakeProgram);

      // Advance time past TTL (10s)
      vi.useFakeTimers();
      vi.advanceTimersByTime(11000);

      const result = await getCachedGameRound(fakeProgram);
      expect(result).toEqual(data2);
      expect(mockedFindCurrentRound).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("returns stale data when RPC fails after initial fetch", async () => {
      const data = makeGameState();
      mockedFindCurrentRound.mockResolvedValueOnce(data);

      await getCachedGameRound(fakeProgram);

      // Invalidate to force re-fetch
      invalidateGameRoundCache();

      // RPC now fails
      mockedFindCurrentRound.mockRejectedValueOnce(new Error("Rate limited"));

      const result = await getCachedGameRound(fakeProgram);
      expect(result).toEqual(data);
    });

    it("throws when RPC fails and no cached data exists", async () => {
      mockedFindCurrentRound.mockRejectedValue(new Error("Rate limited"));

      await expect(getCachedGameRound(fakeProgram)).rejects.toThrow(
        "Rate limited"
      );
    });

    it("returns null when no round exists", async () => {
      mockedFindCurrentRound.mockResolvedValue(null);

      const result = await getCachedGameRound(fakeProgram);
      expect(result).toBeNull();
    });

    it("invalidation forces re-fetch", async () => {
      const data1 = makeGameState(1);
      const data2 = makeGameState(2);
      mockedFindCurrentRound
        .mockResolvedValueOnce(data1)
        .mockResolvedValueOnce(data2);

      await getCachedGameRound(fakeProgram);
      invalidateGameRoundCache();
      const result = await getCachedGameRound(fakeProgram);

      expect(result).toEqual(data2);
      expect(mockedFindCurrentRound).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCachedLeaderboardPlayers", () => {
    it("fetches from RPC on first call", async () => {
      const players = [makePlayerState(10), makePlayerState(5)];
      mockedFetchAllPlayers.mockResolvedValue(players);

      const result = await getCachedLeaderboardPlayers(fakeProgram, 1);
      expect(result).toEqual(players);
      expect(mockedFetchAllPlayers).toHaveBeenCalledTimes(1);
    });

    it("returns cached data for same round within TTL", async () => {
      const players = [makePlayerState()];
      mockedFetchAllPlayers.mockResolvedValue(players);

      await getCachedLeaderboardPlayers(fakeProgram, 1);
      await getCachedLeaderboardPlayers(fakeProgram, 1);

      expect(mockedFetchAllPlayers).toHaveBeenCalledTimes(1);
    });

    it("re-fetches when round changes", async () => {
      const players1 = [makePlayerState(5)];
      const players2 = [makePlayerState(10)];
      mockedFetchAllPlayers
        .mockResolvedValueOnce(players1)
        .mockResolvedValueOnce(players2);

      await getCachedLeaderboardPlayers(fakeProgram, 1);
      const result = await getCachedLeaderboardPlayers(fakeProgram, 2);

      expect(result).toEqual(players2);
      expect(mockedFetchAllPlayers).toHaveBeenCalledTimes(2);
    });

    it("returns stale data when RPC fails for same round", async () => {
      const players = [makePlayerState()];
      mockedFetchAllPlayers.mockResolvedValueOnce(players);

      await getCachedLeaderboardPlayers(fakeProgram, 1);
      invalidateLeaderboardCache();

      mockedFetchAllPlayers.mockRejectedValueOnce(new Error("Rate limited"));

      const result = await getCachedLeaderboardPlayers(fakeProgram, 1);
      expect(result).toEqual(players);
    });

    it("throws when RPC fails for different round with no cached data", async () => {
      mockedFetchAllPlayers.mockRejectedValue(new Error("Rate limited"));

      await expect(
        getCachedLeaderboardPlayers(fakeProgram, 1)
      ).rejects.toThrow("Rate limited");
    });

    it("invalidation forces re-fetch", async () => {
      const players1 = [makePlayerState(5)];
      const players2 = [makePlayerState(10)];
      mockedFetchAllPlayers
        .mockResolvedValueOnce(players1)
        .mockResolvedValueOnce(players2);

      await getCachedLeaderboardPlayers(fakeProgram, 1);
      invalidateLeaderboardCache();
      const result = await getCachedLeaderboardPlayers(fakeProgram, 1);

      expect(result).toEqual(players2);
      expect(mockedFetchAllPlayers).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidateAllCaches", () => {
    it("clears both game round and leaderboard caches", async () => {
      mockedFindCurrentRound.mockResolvedValue(makeGameState());
      mockedFetchAllPlayers.mockResolvedValue([makePlayerState()]);

      await getCachedGameRound(fakeProgram);
      await getCachedLeaderboardPlayers(fakeProgram, 1);

      invalidateAllCaches();

      await getCachedGameRound(fakeProgram);
      await getCachedLeaderboardPlayers(fakeProgram, 1);

      expect(mockedFindCurrentRound).toHaveBeenCalledTimes(2);
      expect(mockedFetchAllPlayers).toHaveBeenCalledTimes(2);
    });
  });
});
