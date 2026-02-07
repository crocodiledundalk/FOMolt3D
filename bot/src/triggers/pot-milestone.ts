import type { GameStateResponse, TriggerEvent } from "../types.js";
import type { AgentState } from "../state/agent-state.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

const MILESTONES_SOL = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

export function checkPotMilestone(
  current: GameStateResponse,
  previous: GameStateResponse | null,
  state: AgentState,
): TriggerEvent[] {
  const events: TriggerEvent[] = [];
  const currentPotSol = current.gameState.potLamports / LAMPORTS_PER_SOL;
  const previousPotSol = previous
    ? previous.gameState.potLamports / LAMPORTS_PER_SOL
    : 0;

  for (const milestone of MILESTONES_SOL) {
    if (
      currentPotSol >= milestone &&
      previousPotSol < milestone &&
      !state.hasMilestoneFired(milestone)
    ) {
      state.recordMilestone(milestone);
      events.push({
        type: "pot_milestone",
        priority: milestone >= 100 ? "high" : "medium",
        data: {
          milestone,
          pot: currentPotSol.toFixed(2),
          players: current.gameState.totalPlayers,
          totalKeys: current.gameState.totalKeys,
          round: current.gameState.round,
        },
        template: "pot_milestone",
      });
    }
  }

  return events;
}
