import type { GameStateResponse, TriggerEvent } from "../types.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function checkRoundLifecycle(
  current: GameStateResponse,
  previous: GameStateResponse | null,
): TriggerEvent[] {
  const events: TriggerEvent[] = [];

  if (!previous) {
    return events;
  }

  // Round start: round number changed
  if (current.gameState.round !== previous.gameState.round) {
    const priceSol = current.keyPriceLamports / LAMPORTS_PER_SOL;
    events.push({
      type: "round_start",
      priority: "high",
      data: {
        round: current.gameState.round,
        price: priceSol.toFixed(4),
        previousRound: previous.gameState.round,
      },
      template: "round_start",
    });
  }

  // Round end: active changed from true to false
  if (previous.gameState.active && !current.gameState.active) {
    const prizeSol = previous.gameState.winnerPot / LAMPORTS_PER_SOL;
    events.push({
      type: "round_end",
      priority: "high",
      data: {
        round: previous.gameState.round,
        winner: previous.gameState.lastBuyer,
        prize: prizeSol.toFixed(2),
        totalKeys: previous.gameState.totalKeys,
        players: previous.gameState.totalPlayers,
        pot: (previous.gameState.potLamports / LAMPORTS_PER_SOL).toFixed(2),
      },
      template: "round_end",
    });
  }

  return events;
}
