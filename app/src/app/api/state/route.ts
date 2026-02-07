import { NextResponse } from "next/server";
import {
  getReadOnlyProgram,
  getNextKeyPrice,
  getGamePhase,
  toApiGameState,
} from "@/lib/sdk";
import { calculateKeyPrice } from "@/lib/utils/bonding-curve";
import { recordSnapshot } from "@/lib/state-history";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { getCachedEvents } from "@/lib/event-cache";
import { getActivityMetrics } from "@/lib/activity-metrics";
import { getUrgencyLevel } from "@/lib/utils/urgency";
import { formatAddress } from "@/lib/utils/format";
import { getCluster, getPublicRpcUrl, getProgramId } from "@/lib/network";
import type { GameStateResponse, RecentBuyEntry } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) {
      return NextResponse.json(
        { error: "No game rounds found. The game has not been initialized." },
        { status: 404 }
      );
    }

    const { gameState: gs } = result;
    const gameState = toApiGameState(gs);
    const keyPriceLamports = getNextKeyPrice(gs);
    const nextKeyPriceLamports = calculateKeyPrice(
      gs.totalKeys + 1,
      gs.basePriceLamports,
      gs.priceIncrementLamports
    );
    const phase = getGamePhase(gs);

    // Record snapshot for price trajectory and pot momentum tracking
    recordSnapshot(gs.totalKeys, gs.potLamports, keyPriceLamports);

    // Compute urgency and activity metrics
    const now = Math.floor(Date.now() / 1000);
    const timeRemainingSecs = Math.max(0, gameState.timerEnd - now);
    const urgency = getUrgencyLevel(timeRemainingSecs);

    const cachedEvents = getCachedEvents();
    const activity = getActivityMetrics(cachedEvents, gameState.totalPlayers);

    const recentBuys: RecentBuyEntry[] = activity.recentBuys.map((b) => ({
      player: formatAddress(b.player),
      keys: b.keys,
      amountLamports: b.amountLamports,
      agoSecs: b.agoSecs,
    }));

    const response: GameStateResponse = {
      gameState,
      keyPriceLamports,
      nextKeyPriceLamports,
      phase,
      urgency,
      timeRemainingSecs,
      recentBuys,
      buysLastHour: activity.buysLastHour,
      uniquePlayersLastHour: activity.uniquePlayersLastHour,
      winnerPrizeIfYouBuyNow: gameState.winnerPot,
      network: {
        cluster: getCluster(),
        rpcUrl: getPublicRpcUrl(),
        programId: getProgramId(),
      },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("Failed to fetch game state:", err);
    return NextResponse.json(
      { error: "Failed to fetch game state from chain" },
      { status: 500 }
    );
  }
}
