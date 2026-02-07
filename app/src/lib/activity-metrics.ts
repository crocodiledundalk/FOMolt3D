import type { CachedEvent } from "./event-cache";
import { formatRelativeTime } from "./utils/format";

export interface RecentBuy {
  player: string;
  keys: number;
  amountLamports: number;
  relativeTime: string;
  agoSecs: number;
}

export interface ActivityMetrics {
  recentBuys: RecentBuy[];
  buysLastHour: number;
  uniquePlayersLastHour: number;
  timeSinceLastBuy: string;
  totalPlayers: number;
}

/** Derive social proof metrics from cached events and game state */
export function getActivityMetrics(
  events: CachedEvent[],
  totalPlayers: number
): ActivityMetrics {
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;

  // Filter to KeysPurchased events only
  const buyEvents = events.filter((e) => e.type === "KeysPurchased");

  // Events are chronological (oldest first), reverse for recency
  const reversed = [...buyEvents].reverse();

  // Last 5 buys
  const recentBuys: RecentBuy[] = reversed.slice(0, 5).map((e) => {
    const timestamp = (e.data.timestamp as number) ?? 0;
    return {
      player: (e.data.player as string) ?? "",
      keys: (e.data.numKeys as number) ?? 0,
      amountLamports: (e.data.cost as number) ?? 0,
      relativeTime: timestamp > 0 ? formatRelativeTime(timestamp) : "unknown",
      agoSecs: timestamp > 0 ? Math.max(0, now - timestamp) : 0,
    };
  });

  // Buys in last hour
  const buysInLastHour = reversed.filter((e) => {
    const ts = (e.data.timestamp as number) ?? 0;
    return ts >= oneHourAgo;
  });

  const uniquePlayers = new Set(
    buysInLastHour.map((e) => (e.data.player as string) ?? "")
  );

  const timeSinceLastBuy =
    recentBuys.length > 0 ? recentBuys[0].relativeTime : "no buys yet";

  return {
    recentBuys,
    buysLastHour: buysInLastHour.length,
    uniquePlayersLastHour: uniquePlayers.size,
    timeSinceLastBuy,
    totalPlayers,
  };
}
