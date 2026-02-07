import {
  getReadOnlyProgram,
  getNextKeyPrice,
  getGamePhase,
  toApiGameState,
} from "@/lib/sdk";
import { calculateKeyPrice } from "@/lib/utils/bonding-curve";
import { getCachedGameRound } from "@/lib/rpc-cache";
import type { GameStateResponse } from "@/types/api";

/**
 * Fetch game state on the server side.
 * Used by page.tsx to pre-populate React Query cache for SSR.
 * Same logic as /api/state but returns typed data instead of NextResponse.
 */
export async function fetchGameStateServer(): Promise<GameStateResponse | null> {
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) return null;

    const { gameState: gs } = result;
    const gameState = toApiGameState(gs);
    const keyPriceLamports = getNextKeyPrice(gs);
    const nextKeyPriceLamports = calculateKeyPrice(
      gs.totalKeys + 1,
      gs.basePriceLamports,
      gs.priceIncrementLamports
    );
    const phase = getGamePhase(gs);

    return {
      gameState,
      keyPriceLamports,
      nextKeyPriceLamports,
      phase,
    };
  } catch (err) {
    console.error("[SSR] Failed to fetch game state:", err);
    return null;
  }
}
