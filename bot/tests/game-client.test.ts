import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameClient } from "../src/game-client.js";
import type { Logger } from "../src/logging/logger.js";

function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function validGameStateJson() {
  return {
    gameState: {
      round: 1,
      potLamports: 5_000_000_000,
      totalKeys: 100,
      totalPlayers: 10,
      lastBuyer: "SoMeWaLLeTaDdReSs1111111111111111111111111",
      timerEnd: Math.floor(Date.now() / 1000) + 3600,
      active: true,
      winnerPot: 2_400_000_000,
      totalDividendPool: 2_250_000_000,
    },
    keyPriceLamports: 110_000_000,
    nextKeyPriceLamports: 111_000_000,
    phase: "active" as const,
  };
}

describe("GameClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should successfully fetch and parse a valid game state", async () => {
    const mockData = validGameStateJson();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const logger = createMockLogger();
    const client = new GameClient("http://localhost:3000", logger);
    const result = await client.fetchGameState();

    expect(result).not.toBeNull();
    expect(result!.gameState.round).toBe(1);
    expect(result!.gameState.potLamports).toBe(5_000_000_000);
    expect(result!.phase).toBe("active");
    expect(client.getConsecutiveFailures()).toBe(0);
  });

  it("should return null on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const logger = createMockLogger();
    const client = new GameClient("http://localhost:3000", logger);
    const result = await client.fetchGameState();

    expect(result).toBeNull();
    expect(client.getConsecutiveFailures()).toBe(1);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should return null on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const logger = createMockLogger();
    const client = new GameClient("http://localhost:3000", logger);
    const result = await client.fetchGameState();

    expect(result).toBeNull();
    expect(client.getConsecutiveFailures()).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Game API fetch failed",
      expect.objectContaining({ reason: "ECONNREFUSED" }),
    );
  });

  it("should return null on invalid JSON structure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ foo: "bar" }),
    });

    const logger = createMockLogger();
    const client = new GameClient("http://localhost:3000", logger);
    const result = await client.fetchGameState();

    expect(result).toBeNull();
    expect(client.getConsecutiveFailures()).toBe(1);
  });

  it("should track consecutive failures and reset on success", async () => {
    const logger = createMockLogger();
    const client = new GameClient("http://localhost:3000", logger);

    // Fail twice
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    await client.fetchGameState();
    await client.fetchGameState();
    expect(client.getConsecutiveFailures()).toBe(2);

    // Then succeed
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validGameStateJson()),
    });
    const result = await client.fetchGameState();
    expect(result).not.toBeNull();
    expect(client.getConsecutiveFailures()).toBe(0);
    expect(logger.info).toHaveBeenCalledWith(
      "Game API connection restored",
      expect.objectContaining({ previousFailures: 2 }),
    );
  });
});
