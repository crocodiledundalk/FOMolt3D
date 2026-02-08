"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { GameEvent } from "@/types/game";
import type { GameStateResponse } from "@/types/api";
import type { ProgramEvent, ProgramEventType } from "@/types/program-events";
import { toGameEvent } from "@/lib/events/to-game-event";
import { API_ROUTES } from "@/lib/constants/routes";

const MAX_EVENTS = 200;
const MAX_RETRIES = 10;
const BASE_DELAY = 1000;
const POLL_INTERVAL = 10_000; // 10 seconds

/** All event types we listen for via named SSE events */
const EVENT_TYPES: ProgramEventType[] = [
  "GameUpdated",
  "KeysPurchased",
  "Claimed",
  "ReferralEarned",
  "ReferralClaimed",
  "RoundStarted",
  "RoundConcluded",
  "ProtocolFeeCollected",
];

/**
 * Central event hook.
 *
 * Two data sources:
 *  1. SSE stream (/api/events) — real-time WebSocket-backed events
 *  2. Polling (/api/events/recent) — reliable REST fallback every 10s
 *
 * Both feed into the same deduplication layer.
 * Events are stored in chronological order (oldest first).
 */
export function useGameEvents() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(false);
  const retryCount = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);
  const seenKeys = useRef(new Set<string>());
  const queryClient = useQueryClient();

  /** Add a single feed event with dedup + trim */
  const addFeedEvent = useCallback((feedEvent: GameEvent) => {
    if (seenKeys.current.has(feedEvent.id)) return;
    seenKeys.current.add(feedEvent.id);

    setEvents((prev) => {
      const next = [...prev, feedEvent];
      if (next.length > MAX_EVENTS) {
        const trimmed = next.slice(-MAX_EVENTS);
        seenKeys.current = new Set(trimmed.map((e) => e.id));
        return trimmed;
      }
      return next;
    });
  }, []);

  /** Process a single ProgramEvent — update caches + add to feed */
  const handleProgramEvent = useCallback(
    (programEvent: ProgramEvent) => {
      // Update game state cache for GameUpdated events
      if (programEvent.type === "GameUpdated") {
        queryClient.setQueryData<GameStateResponse>(
          ["gameState"],
          (old) => {
            if (!old) return old;
            const updatedGameState = {
              ...old.gameState,
              potLamports: programEvent.potLamports,
              totalKeys: programEvent.totalKeys,
              lastBuyer: programEvent.lastBuyer,
              timerEnd: programEvent.timerEnd,
              winnerPot: programEvent.winnerPot,
              nextRoundPot: programEvent.nextRoundPot,
            };
            return {
              ...old,
              gameState: updatedGameState,
              keyPriceLamports: programEvent.nextKeyPrice,
              nextKeyPriceLamports: programEvent.nextKeyPrice,
            };
          }
        );
      }

      // Invalidate leaderboard and player state on buys/claims
      if (
        programEvent.type === "KeysPurchased" ||
        programEvent.type === "Claimed"
      ) {
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["playerState"] });
      }

      // On round events, refetch game state entirely
      if (
        programEvent.type === "RoundStarted" ||
        programEvent.type === "RoundConcluded"
      ) {
        queryClient.invalidateQueries({ queryKey: ["gameState"] });
      }

      // Convert to feed event
      const feedEvent = toGameEvent(programEvent);
      if (!feedEvent) return;

      addFeedEvent(feedEvent);
    },
    [queryClient, addFeedEvent]
  );

  /** Merge an array of polled ProgramEvents into the feed (batch, sorted) */
  const mergePolledEvents = useCallback(
    (polledEvents: ProgramEvent[]) => {
      const newFeedEvents: GameEvent[] = [];
      for (const pe of polledEvents) {
        // Also update caches for GameUpdated, invalidate for buys/claims, etc.
        if (pe.type === "GameUpdated") {
          // Cache update already handled by useGameState polling — skip to avoid
          // overwriting with stale polled data
        } else if (
          pe.type === "KeysPurchased" ||
          pe.type === "Claimed"
        ) {
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["playerState"] });
        } else if (
          pe.type === "RoundStarted" ||
          pe.type === "RoundConcluded"
        ) {
          queryClient.invalidateQueries({ queryKey: ["gameState"] });
        }

        const feedEvent = toGameEvent(pe);
        if (!feedEvent) continue;
        if (seenKeys.current.has(feedEvent.id)) continue;
        newFeedEvents.push(feedEvent);
      }

      if (newFeedEvents.length === 0) return;

      // Sort by timestamp to maintain chronological order
      newFeedEvents.sort((a, b) => a.timestamp - b.timestamp);
      for (const fe of newFeedEvents) {
        addFeedEvent(fe);
      }
    },
    [queryClient, addFeedEvent]
  );

  // ─── SSE (real-time) ────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!activeRef.current) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const es = new EventSource(API_ROUTES.EVENTS);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!activeRef.current) return;
      setConnected(true);
      setError(false);
      retryCount.current = 0;
    };

    // Listen for each named event type
    for (const eventType of EVENT_TYPES) {
      es.addEventListener(eventType, (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data) as ProgramEvent;
          handleProgramEvent(data);
        } catch {
          // Ignore malformed events
        }
      });
    }

    es.onerror = () => {
      if (!activeRef.current) return;
      es.close();
      setConnected(false);

      if (retryCount.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount.current);
        retryCount.current++;
        retryTimeoutRef.current = setTimeout(connect, delay);
      } else {
        setError(true);
      }
    };
  }, [handleProgramEvent]);

  // ─── Polling (reliable fallback) ────────────────────────────────

  const poll = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      const res = await fetch(`${API_ROUTES.EVENTS_RECENT}?limit=50`);
      if (!res.ok) return;
      const data = (await res.json()) as ProgramEvent[];
      // The REST endpoint returns newest-first; reverse for chronological merge
      mergePolledEvents([...data].reverse());
    } catch {
      // Polling failure is non-critical — SSE or next poll will catch up
    }
  }, [mergePolledEvents]);

  // ─── Lifecycle ──────────────────────────────────────────────────

  useEffect(() => {
    activeRef.current = true;
    connect();

    // Initial poll to populate feed immediately
    poll();

    // Start polling interval
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      activeRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      eventSourceRef.current?.close();
    };
  }, [connect, poll]);

  return { events, connected, error };
}
