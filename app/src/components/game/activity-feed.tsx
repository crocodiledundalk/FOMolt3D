"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameEvents } from "@/hooks/use-game-events";
import { ActivityItem } from "./activity-item";

const PAGE_SIZE = 25;

export function ActivityFeed() {
  const { events, connected, error } = useGameEvents();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const [page, setPage] = useState(0);

  // Reset to page 0 when new events arrive (user is on first page)
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));

  // Events are stored oldest-first; display newest-first via pagination
  const displayEvents = useMemo(() => {
    const start = events.length - (page + 1) * PAGE_SIZE;
    const end = events.length - page * PAGE_SIZE;
    return events.slice(Math.max(0, start), end).reverse();
  }, [events, page]);

  return (
    <section className="flex flex-col border-2 border-dashed border-border bg-bg-secondary">
      <div className="flex items-center justify-between border-b-2 border-dashed border-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
          Activity Feed
        </h2>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            error ? "text-red-400" : connected ? "text-claw-green" : "text-text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              error ? "bg-red-400" : connected ? "bg-claw-green" : "bg-text-muted animate-pulse"
            }`}
          />
          {error ? "Disconnected" : connected ? "Live" : "Connecting..."}
        </span>
      </div>
      <div
        aria-live="polite"
        aria-label="Live game activity feed"
        className="flex-1 overflow-y-auto p-2"
        style={{ maxHeight: "400px" }}
      >
        {displayEvents.length === 0 ? (
          <p className={`py-8 text-center text-sm ${error ? "text-red-400" : "text-text-muted"}`}>
            {error
              ? "Failed to connect to event stream"
              : connected
                ? "the ocean is quiet... for now \uD83E\uDD9E"
                : "crawling to the reef..."}
          </p>
        ) : (
          displayEvents.map((event) => (
            <ActivityItem
              key={event.id}
              event={event}
              isYou={!!walletAddress && event.player === walletAddress}
            />
          ))
        )}
      </div>
      {events.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-dashed border-border px-4 py-2">
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
            className="min-h-[44px] text-xs text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-default"
          >
            Older
          </button>
          <span className="text-xs tabular-nums text-text-muted">
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="min-h-[44px] text-xs text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-default"
          >
            Newer
          </button>
        </div>
      )}
    </section>
  );
}
