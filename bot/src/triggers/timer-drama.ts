import type { GameStateResponse, TriggerEvent } from "../types.js";
import type { AgentState } from "../state/agent-state.js";

const LAMPORTS_PER_SOL = 1_000_000_000;
const DRAMA_THRESHOLD_SECONDS = 60;

export function checkTimerDrama(
  current: GameStateResponse,
  _previous: GameStateResponse | null,
  state: AgentState,
): TriggerEvent[] {
  if (!current.gameState.active) {
    state.setTimerDramaActive(false);
    return [];
  }

  const nowMs = Date.now();
  const timerEndMs = current.gameState.timerEnd * 1000;
  const remainingSeconds = Math.max(0, Math.floor((timerEndMs - nowMs) / 1000));

  if (remainingSeconds > DRAMA_THRESHOLD_SECONDS) {
    state.setTimerDramaActive(false);
    return [];
  }

  if (state.isTimerDramaActive()) {
    return [];
  }

  state.setTimerDramaActive(true);

  const prizeSol = current.gameState.winnerPot / LAMPORTS_PER_SOL;

  return [
    {
      type: "timer_drama",
      priority: "high",
      data: {
        seconds: remainingSeconds,
        lastBuyer: current.gameState.lastBuyer,
        prize: prizeSol.toFixed(2),
        pot: (current.gameState.potLamports / LAMPORTS_PER_SOL).toFixed(2),
        round: current.gameState.round,
      },
      template: "timer_drama",
    },
  ];
}
