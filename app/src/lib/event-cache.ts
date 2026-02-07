import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Connection } from "@solana/web3.js";
import { fetchRecentEvents } from "./sdk/events";
import type { FomoltEvent } from "./sdk/events";

// ─── Types ──────────────────────────────────────────────────────────

export interface CachedEvent {
  type: string;
  signature: string;
  key: string;
  data: Record<string, unknown>;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_CACHED_EVENTS = 1000;
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "events.json");

// ─── State ──────────────────────────────────────────────────────────

let events: CachedEvent[] = [];
let loaded = false;

// ─── Serialization ──────────────────────────────────────────────────

/** Convert a FomoltEvent (with PublicKey objects) into a JSON-safe CachedEvent */
export function serializeEvent(event: FomoltEvent): CachedEvent {
  const { type, signature, key, ...rest } = event;
  const data: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(rest)) {
    if (v && typeof v === "object" && "toBase58" in v) {
      data[k] = (v as { toBase58(): string }).toBase58();
    } else {
      data[k] = v;
    }
  }

  return {
    type,
    signature: signature ?? "",
    key: key ?? "",
    data,
  };
}

// ─── Disk I/O ───────────────────────────────────────────────────────

function loadFromDisk(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        events = parsed;
      }
    }
  } catch {
    // Corrupt file — start fresh
    events = [];
  }
}

function saveToDisk(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    // Atomic write: write to temp file then rename
    const tmpFile = path.join(os.tmpdir(), `fomolt-events-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(events), "utf-8");
    fs.renameSync(tmpFile, CACHE_FILE);
  } catch {
    // Best-effort persistence — cache still works in memory
  }
}

// ─── Garbage Collection ─────────────────────────────────────────────

function gc(): void {
  if (events.length > MAX_CACHED_EVENTS) {
    // Keep newest events (end of array = newest)
    events = events.slice(events.length - MAX_CACHED_EVENTS);
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/** Get all cached events (in chronological order, oldest first) */
export function getCachedEvents(): CachedEvent[] {
  loadFromDisk();
  return [...events];
}

/**
 * Append a live event (from WebSocket subscription) to the cache.
 * Deduplicates by event key. Persists to disk.
 */
export function appendLiveEvent(event: FomoltEvent): void {
  loadFromDisk();
  const cached = serializeEvent(event);
  // Deduplicate by key
  if (cached.key && events.some((e) => e.key === cached.key)) {
    return;
  }
  events.push(cached);
  gc();
  saveToDisk();
}

/**
 * Fetch new events since the last cached signature, merge into cache,
 * trim to MAX_CACHED_EVENTS, and persist. Returns the full cached event list.
 */
export async function refreshEventCache(
  connection: Connection
): Promise<CachedEvent[]> {
  loadFromDisk();

  // Find the most recent signature in cache (last element = newest)
  const lastSig =
    events.length > 0 ? events[events.length - 1].signature : undefined;

  // Fetch only events newer than the last cached signature
  const newEvents = await fetchRecentEvents(connection, {
    maxTransactions: 200,
    maxFeedEvents: 200,
    until: lastSig || undefined,
    feedFilter: false,
  });

  if (newEvents.length > 0) {
    const newCached = newEvents.map(serializeEvent);
    // Deduplicate: filter out any that already exist in cache by key
    const existingKeys = new Set(events.map((e) => e.key));
    const unique = newCached.filter((e) => !existingKeys.has(e.key));
    events.push(...unique);
    gc();
    saveToDisk();
  }

  return [...events];
}

/**
 * Reset the cache (for testing). Clears memory and optionally deletes the file.
 */
export function resetCache(deleteFile = false): void {
  events = [];
  loaded = false;
  if (deleteFile) {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }
    } catch {
      // ignore
    }
  }
}
