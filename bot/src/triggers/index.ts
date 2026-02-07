import type { GameStateResponse, TriggerEvent } from "../types.js";
import type { AgentState } from "../state/agent-state.js";
import { checkPotMilestone } from "./pot-milestone.js";
import { checkTimerDrama } from "./timer-drama.js";
import { checkRoundLifecycle } from "./round-lifecycle.js";

export function evaluateTriggers(
  current: GameStateResponse,
  previous: GameStateResponse | null,
  state: AgentState,
): TriggerEvent[] {
  const events: TriggerEvent[] = [];

  events.push(...checkPotMilestone(current, previous, state));
  events.push(...checkTimerDrama(current, previous, state));
  events.push(...checkRoundLifecycle(current, previous));

  // Sort by priority: high first, then medium, then low
  const priorityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  events.sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2),
  );

  return events;
}
