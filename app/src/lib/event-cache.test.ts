// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import type { FomoltEvent } from "./sdk/events";

// Mock fs and fetchRecentEvents before importing the module
vi.mock("node:fs");
vi.mock("./sdk/events", () => ({
  fetchRecentEvents: vi.fn().mockResolvedValue([]),
}));

// Import after mocks are set up
import {
  getCachedEvents,
  appendLiveEvent,
  refreshEventCache,
  serializeEvent,
  resetCache,
} from "./event-cache";
import { fetchRecentEvents } from "./sdk/events";

const mockedFs = vi.mocked(fs);
const mockedFetchRecentEvents = vi.mocked(fetchRecentEvents);

function makeFakeEvent(
  overrides: Partial<FomoltEvent> & { type: string } = { type: "KeysPurchased" }
): FomoltEvent {
  return {
    type: "KeysPurchased",
    round: 1,
    player: { toBase58: () => "Player111111111111111111111111111111111111111" } as never,
    isAgent: false,
    keysBought: 1,
    totalPlayerKeys: 1,
    lamportsSpent: 10_000_000,
    potContribution: 8_000_000,
    timestamp: Date.now(),
    signature: "sig123",
    key: "sig123:0",
    ...overrides,
  } as FomoltEvent;
}

describe("event-cache", () => {
  beforeEach(() => {
    resetCache();
    vi.clearAllMocks();
    // Default: no file exists
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readFileSync.mockReturnValue("[]");
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.renameSync.mockImplementation(() => {});
    mockedFs.mkdirSync.mockImplementation(() => undefined as never);
    mockedFs.unlinkSync.mockImplementation(() => {});
  });

  afterEach(() => {
    resetCache();
  });

  describe("getCachedEvents", () => {
    it("returns empty array when no file exists", () => {
      const result = getCachedEvents();
      expect(result).toEqual([]);
    });

    it("loads events from disk on first access", () => {
      const cached = [
        { type: "KeysPurchased", signature: "sig1", key: "sig1:0", data: { round: 1 } },
      ];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(cached));

      const result = getCachedEvents();
      expect(result).toEqual(cached);
    });

    it("returns a copy (not a reference to internal state)", () => {
      const result1 = getCachedEvents();
      result1.push({ type: "fake", signature: "", key: "", data: {} });
      const result2 = getCachedEvents();
      expect(result2).toEqual([]);
    });

    it("handles corrupt file gracefully", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue("not-json{{{");

      const result = getCachedEvents();
      expect(result).toEqual([]);
    });
  });

  describe("serializeEvent", () => {
    it("converts PublicKey objects to base58 strings", () => {
      const event = makeFakeEvent();
      const cached = serializeEvent(event);

      expect(cached.type).toBe("KeysPurchased");
      expect(cached.signature).toBe("sig123");
      expect(cached.key).toBe("sig123:0");
      expect(cached.data.player).toBe(
        "Player111111111111111111111111111111111111111"
      );
    });

    it("preserves primitive values in data", () => {
      const event = makeFakeEvent();
      const cached = serializeEvent(event);

      expect(cached.data.round).toBe(1);
      expect(cached.data.keysBought).toBe(1);
      expect(cached.data.timestamp).toBeDefined();
    });

    it("handles missing signature and key", () => {
      const event = makeFakeEvent();
      delete (event as Record<string, unknown>).signature;
      delete (event as Record<string, unknown>).key;

      const cached = serializeEvent(event);
      expect(cached.signature).toBe("");
      expect(cached.key).toBe("");
    });
  });

  describe("appendLiveEvent", () => {
    it("adds event to cache", () => {
      const event = makeFakeEvent({ signature: "liveSig1", key: "liveSig1:0" });
      appendLiveEvent(event);

      const cached = getCachedEvents();
      expect(cached).toHaveLength(1);
      expect(cached[0].signature).toBe("liveSig1");
    });

    it("deduplicates by key", () => {
      const event1 = makeFakeEvent({ signature: "dup", key: "dup:0" });
      const event2 = makeFakeEvent({ signature: "dup", key: "dup:0" });

      appendLiveEvent(event1);
      appendLiveEvent(event2);

      const cached = getCachedEvents();
      expect(cached).toHaveLength(1);
    });

    it("persists to disk after append", () => {
      const event = makeFakeEvent({ signature: "persist1", key: "persist1:0" });
      appendLiveEvent(event);

      // Should write to temp file then rename
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(mockedFs.renameSync).toHaveBeenCalledTimes(1);
    });

    it("creates cache dir if missing", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const event = makeFakeEvent({ signature: "mkdir1", key: "mkdir1:0" });
      appendLiveEvent(event);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".cache"),
        { recursive: true }
      );
    });
  });

  describe("garbage collection", () => {
    it("trims to 1000 events keeping newest", () => {
      // Pre-load 1000 events
      const initial = Array.from({ length: 1000 }, (_, i) => ({
        type: "KeysPurchased",
        signature: `old-${i}`,
        key: `old-${i}:0`,
        data: { round: 1 },
      }));
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(initial));

      // Append 50 more → triggers GC
      for (let i = 0; i < 50; i++) {
        const event = makeFakeEvent({
          signature: `new-${i}`,
          key: `new-${i}:0`,
        });
        appendLiveEvent(event);
      }

      const cached = getCachedEvents();
      expect(cached).toHaveLength(1000);
      // Newest should be present
      expect(cached[cached.length - 1].signature).toBe("new-49");
      // Oldest should be trimmed (old-0 through old-49 should be gone)
      expect(cached[0].signature).toBe("old-50");
    });
  });

  describe("refreshEventCache", () => {
    it("passes until param with last cached signature", async () => {
      // Pre-load cache with one event
      const initial = [
        { type: "KeysPurchased", signature: "lastSig", key: "lastSig:0", data: {} },
      ];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(initial));

      mockedFetchRecentEvents.mockResolvedValue([]);

      const fakeConnection = {} as never;
      await refreshEventCache(fakeConnection);

      expect(mockedFetchRecentEvents).toHaveBeenCalledWith(fakeConnection, {
        maxTransactions: 200,
        maxFeedEvents: 200,
        until: "lastSig",
        feedFilter: false,
      });
    });

    it("fetches without until when cache is empty", async () => {
      mockedFetchRecentEvents.mockResolvedValue([]);

      const fakeConnection = {} as never;
      await refreshEventCache(fakeConnection);

      expect(mockedFetchRecentEvents).toHaveBeenCalledWith(fakeConnection, {
        maxTransactions: 200,
        maxFeedEvents: 200,
        until: undefined,
        feedFilter: false,
      });
    });

    it("merges new events and deduplicates", async () => {
      const initial = [
        { type: "KeysPurchased", signature: "existing1", key: "existing1:0", data: {} },
      ];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(initial));

      const newEvent = makeFakeEvent({ signature: "fresh1", key: "fresh1:0" });
      const dupEvent = makeFakeEvent({ signature: "existing1", key: "existing1:0" });
      mockedFetchRecentEvents.mockResolvedValue([dupEvent, newEvent]);

      const fakeConnection = {} as never;
      const result = await refreshEventCache(fakeConnection);

      // Should have 2: existing1 + fresh1 (dup filtered out)
      expect(result).toHaveLength(2);
      expect(result[0].signature).toBe("existing1");
      expect(result[1].signature).toBe("fresh1");
    });

    it("persists after merging new events", async () => {
      const newEvent = makeFakeEvent({ signature: "new1", key: "new1:0" });
      mockedFetchRecentEvents.mockResolvedValue([newEvent]);

      const fakeConnection = {} as never;
      await refreshEventCache(fakeConnection);

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(mockedFs.renameSync).toHaveBeenCalled();
    });

    it("does not write to disk when no new events", async () => {
      mockedFetchRecentEvents.mockResolvedValue([]);

      const fakeConnection = {} as never;
      await refreshEventCache(fakeConnection);

      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("resetCache", () => {
    it("clears in-memory state", () => {
      appendLiveEvent(makeFakeEvent({ signature: "x", key: "x:0" }));
      expect(getCachedEvents()).toHaveLength(1);

      resetCache();
      expect(getCachedEvents()).toHaveLength(0);
    });

    it("deletes file when deleteFile=true", () => {
      mockedFs.existsSync.mockReturnValue(true);
      resetCache(true);
      expect(mockedFs.unlinkSync).toHaveBeenCalled();
    });
  });
});
