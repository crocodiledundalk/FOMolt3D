import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Deduplicator } from "../src/guardrails/deduplicator.js";

describe("Deduplicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should report first post as not duplicate", () => {
    const dedup = new Deduplicator();
    expect(dedup.isDuplicate("Hello world")).toBe(false);
  });

  it("should detect identical content as duplicate after recording", () => {
    const dedup = new Deduplicator();
    const content = "The pot just crossed 10 SOL!";

    dedup.record(content);
    expect(dedup.isDuplicate(content)).toBe(true);
  });

  it("should not flag different content as duplicate", () => {
    const dedup = new Deduplicator();

    dedup.record("Message A");
    expect(dedup.isDuplicate("Message B")).toBe(false);
  });

  it("should allow repost after TTL expires", () => {
    const ttlMs = 60 * 60 * 1000; // 1 hour
    const dedup = new Deduplicator(ttlMs);
    const content = "Time-sensitive update!";

    dedup.record(content);
    expect(dedup.isDuplicate(content)).toBe(true);

    // Advance past TTL
    vi.advanceTimersByTime(ttlMs + 1000);
    expect(dedup.isDuplicate(content)).toBe(false);
  });

  it("should clear all hashes on round reset", () => {
    const dedup = new Deduplicator();

    dedup.record("Message 1");
    dedup.record("Message 2");
    expect(dedup.getEntryCount()).toBe(2);

    dedup.resetForNewRound();
    expect(dedup.getEntryCount()).toBe(0);
    expect(dedup.isDuplicate("Message 1")).toBe(false);
    expect(dedup.isDuplicate("Message 2")).toBe(false);
  });

  it("should handle empty strings", () => {
    const dedup = new Deduplicator();

    dedup.record("");
    expect(dedup.isDuplicate("")).toBe(true);
    expect(dedup.isDuplicate("non-empty")).toBe(false);
  });

  it("should not double-record the same content", () => {
    const dedup = new Deduplicator();

    dedup.record("Same content");
    dedup.record("Same content");
    expect(dedup.getEntryCount()).toBe(1);
  });

  it("should use custom TTL", () => {
    const shortTtl = 5000; // 5 seconds
    const dedup = new Deduplicator(shortTtl);

    dedup.record("Quick expiry");
    expect(dedup.isDuplicate("Quick expiry")).toBe(true);

    vi.advanceTimersByTime(6000);
    expect(dedup.isDuplicate("Quick expiry")).toBe(false);
  });
});
