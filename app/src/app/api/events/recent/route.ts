export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getConnection } from "@/lib/sdk";
import { refreshEventCache, getCachedEvents } from "@/lib/event-cache";

/**
 * GET /api/events/recent
 *
 * Returns recent game events as JSON. Refreshes the server-side cache
 * from on-chain transaction history before responding.
 *
 * This is the reliable polling fallback for the activity feed — it works
 * even when the WebSocket subscription (SSE) isn't delivering events.
 *
 * Query params:
 *   round=N  — optional, filter to only events from round N
 *   limit=N  — optional, max events to return (default 100)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundParam = searchParams.get("round");
    const limitParam = searchParams.get("limit");
    const round = roundParam ? parseInt(roundParam, 10) : null;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100;

    // Refresh cache from on-chain history (incremental — only fetches new txs)
    const connection = getConnection();
    let cached;
    try {
      cached = await refreshEventCache(connection);
    } catch {
      // If refresh fails, use whatever is already cached
      cached = getCachedEvents();
    }

    // Flatten CachedEvent → ProgramEvent shape (same as SSE sends)
    let flat = cached.map((e) => ({
      type: e.type,
      signature: e.signature,
      key: e.key,
      ...e.data,
    }));

    // Filter by round if requested
    if (round !== null && !isNaN(round)) {
      flat = flat.filter((e) => (e as Record<string, unknown>).round === round);
    }

    // Return newest first, capped at limit
    const result = flat.slice(-limit).reverse();

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Events recent error:", err);
    return NextResponse.json(
      { error: "Failed to fetch recent events" },
      { status: 500 }
    );
  }
}
