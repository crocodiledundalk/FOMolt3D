import type { GameEvent } from "@/types/game";
import type { ProgramEvent } from "@/types/program-events";

let idCounter = 0;

/**
 * Convert a ProgramEvent to a GameEvent for the activity feed.
 * Returns null for events that don't map to feed items (e.g. GameUpdated).
 */
export function toGameEvent(event: ProgramEvent): GameEvent | null {
  // Use the stable key from the event pipeline if available, otherwise fallback
  const id = event.key ?? `sse-${++idCounter}`;

  switch (event.type) {
    case "KeysPurchased":
      return {
        id,
        type: "BUY",
        player: event.player,
        amount: event.lamportsSpent,
        keys: event.keysBought,
        isAgent: event.isAgent,
        timestamp: event.timestamp,
        round: event.round,
        signature: event.signature,
      };

    case "Claimed":
      return {
        id,
        type: event.winnerLamports > 0 ? "WIN" : "CLAIM",
        player: event.player,
        amount: event.totalLamports,
        timestamp: event.timestamp,
        round: event.round,
        signature: event.signature,
      };

    case "RoundStarted":
      return {
        id,
        type: "ROUND_START",
        player: "",
        amount: event.carryOverLamports,
        timestamp: event.timestamp,
        round: event.round,
        signature: event.signature,
      };

    case "GameUpdated":
    case "ReferralEarned":
    case "ReferralClaimed":
    case "RoundConcluded":
    case "ProtocolFeeCollected":
      return null;
  }
}
