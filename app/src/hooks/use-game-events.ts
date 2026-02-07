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
 * Central SSE subscription hook.
 *
 * Events are stored in chronological order (oldest first).
 * De-duplicated by event key (signature:index).
 * Returns { events, connected }.
 */
export function useGameEvents() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(false);
  const retryCount = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const seenKeys = useRef(new Set<string>());
  const queryClient = useQueryClient();

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

      // De-duplicate by key
      if (seenKeys.current.has(feedEvent.id)) return;
      seenKeys.current.add(feedEvent.id);

      setEvents((prev) => {
        const next = [...prev, feedEvent];
        // Trim oldest events if over cap
        if (next.length > MAX_EVENTS) {
          const trimmed = next.slice(-MAX_EVENTS);
          // Rebuild seen keys from remaining events
          seenKeys.current = new Set(trimmed.map((e) => e.id));
          return trimmed;
        }
        return next;
      });
    },
    [queryClient]
  );

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

  useEffect(() => {
    activeRef.current = true;
    connect();
    return () => {
      activeRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { events, connected, error };
}
