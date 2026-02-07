import type { GameStateResponse, TriggerEvent } from "../types.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function createHourlySummary(
  current: GameStateResponse,
): TriggerEvent {
  const potSol = current.gameState.potLamports / LAMPORTS_PER_SOL;
  const priceSol = current.keyPriceLamports / LAMPORTS_PER_SOL;
  const nowMs = Date.now();
  const timerEndMs = current.gameState.timerEnd * 1000;
  const remainingMinutes = Math.max(
    0,
    Math.floor((timerEndMs - nowMs) / 60000),
  );

  return {
    type: "hourly_summary",
    priority: "low",
    data: {
      round: current.gameState.round,
      pot: potSol.toFixed(2),
      players: current.gameState.totalPlayers,
      totalKeys: current.gameState.totalKeys,
      price: priceSol.toFixed(4),
      remainingMinutes,
      active: current.gameState.active,
      phase: current.phase,
    },
    template: "hourly_summary",
  };
}

export function createDailyRecap(
  current: GameStateResponse,
): TriggerEvent {
  const potSol = current.gameState.potLamports / LAMPORTS_PER_SOL;
  const priceSol = current.keyPriceLamports / LAMPORTS_PER_SOL;
  const dividendsSol =
    current.gameState.totalDividendPool / LAMPORTS_PER_SOL;

  return {
    type: "daily_recap",
    priority: "low",
    data: {
      round: current.gameState.round,
      pot: potSol.toFixed(2),
      players: current.gameState.totalPlayers,
      totalKeys: current.gameState.totalKeys,
      price: priceSol.toFixed(4),
      dividends: dividendsSol.toFixed(2),
      active: current.gameState.active,
      phase: current.phase,
      lastBuyer: current.gameState.lastBuyer,
    },
    template: "daily_recap",
  };
}
