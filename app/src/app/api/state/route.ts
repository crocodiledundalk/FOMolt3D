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
import type { GameStateResponse } from "@/types/api";

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

    const response: GameStateResponse = {
      gameState,
      keyPriceLamports,
      nextKeyPriceLamports,
      phase,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Failed to fetch game state:", err);
    return NextResponse.json(
      { error: "Failed to fetch game state from chain" },
      { status: 500 }
    );
  }
}
