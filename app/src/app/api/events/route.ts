import { getConnection, subscribeToGameEvents } from "@/lib/sdk";
import type { FomoltEvent } from "@/lib/sdk";
import {
  refreshEventCache,
  appendLiveEvent,
  getCachedEvents,
} from "@/lib/event-cache";

export const dynamic = "force-dynamic";

let sseIdCounter = 0;

function serializeEvent(event: Record<string, unknown>): string {
  return JSON.stringify(event, (_key, value) => {
    if (value && typeof value === "object" && "toBase58" in value) {
      return value.toBase58();
    }
    return value;
  });
}

function enqueueRawEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: FomoltEvent,
  prefix: string
) {
  const id = `${prefix}-${++sseIdCounter}`;
  const frame = `event: ${event.type}\nid: ${id}\ndata: ${serializeEvent(event as unknown as Record<string, unknown>)}\n\n`;
  try {
    controller.enqueue(encoder.encode(frame));
  } catch {
    // Stream closed
  }
}

function enqueueCachedEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: { type: string; data: Record<string, unknown>; key: string },
  prefix: string
) {
  const id = `${prefix}-${++sseIdCounter}`;
  const frame = `event: ${event.type}\nid: ${id}\ndata: ${JSON.stringify(event.data)}\n\n`;
  try {
    controller.enqueue(encoder.encode(frame));
  } catch {
    // Stream closed
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  const connection = getConnection();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send keepalive immediately
      controller.enqueue(encoder.encode(": keepalive\n\n"));

      // Start live WebSocket subscription — also feeds the cache
      unsubscribe = subscribeToGameEvents(connection, (event: FomoltEvent) => {
        appendLiveEvent(event);
        enqueueRawEvent(controller, encoder, event, "evt");
      });

      // Backfill from cache (incremental fetch — only new txs since last cached sig)
      refreshEventCache(connection)
        .then((cached) => {
          for (const event of cached) {
            enqueueCachedEvent(controller, encoder, event, "hist");
          }
        })
        .catch(() => {
          // Incremental fetch failed — try sending whatever is already cached
          const cached = getCachedEvents();
          for (const event of cached) {
            enqueueCachedEvent(controller, encoder, event, "hist");
          }
        });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
