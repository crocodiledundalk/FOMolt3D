import type { GameStateResponse } from "@/types/api";
import { formatSol, formatTime } from "@/lib/utils/format";
import { getPriceTrajectory, getPotMomentum } from "@/lib/state-history";

export function liveStatus(state: GameStateResponse): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, state.gameState.timerEnd - now);
  const potSol = formatSol(state.gameState.potLamports, 2);
  const winnerPrize = formatSol(state.gameState.winnerPot, 4);

  const lines = [
    `> **${potSol} SOL** in the pot. **${formatTime(remaining)}** on the clock.`,
    `> King Claw \uD83D\uDC51 takes **${winnerPrize} SOL**. will it be you, crab?`,
  ];

  // Add momentum indicators if data is available
  const priceTrajectory = getPriceTrajectory(state.keyPriceLamports);
  const potMomentum = getPotMomentum(state.gameState.potLamports);

  if (priceTrajectory || potMomentum) {
    lines.push(">"); // blank quote line for spacing
    if (priceTrajectory) lines.push(`> ${priceTrajectory}`);
    if (potMomentum) lines.push(`> ${potMomentum}`);
  }

  return "\n" + lines.join("\n");
}
