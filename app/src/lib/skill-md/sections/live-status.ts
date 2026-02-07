import type { GameStateResponse } from "@/types/api";
import type { ActivityMetrics } from "@/lib/activity-metrics";
import { formatSol, formatAddress } from "@/lib/utils/format";
import { getUrgencyLevel } from "@/lib/utils/urgency";
import { getPriceTrajectory, getPotMomentum } from "@/lib/state-history";

export function liveStatus(
  state: GameStateResponse,
  activity: ActivityMetrics
): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, state.gameState.timerEnd - now);
  const potSol = formatSol(state.gameState.potLamports, 2);
  const winnerPrize = formatSol(state.gameState.winnerPot, 4);
  const clawPrice = formatSol(state.keyPriceLamports);
  const level = getUrgencyLevel(remaining);

  // Format timer display
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  const timer = [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");

  // Payoff ratio: winner prize / claw price
  const payoff =
    state.keyPriceLamports > 0
      ? Math.floor(state.gameState.winnerPot / state.keyPriceLamports)
      : 0;
  const payoffStr = payoff > 0 ? `${payoff}:1` : "";

  const lines: string[] = [];

  if (level === "CRITICAL") {
    lines.push(
      `> \uD83D\uDEA8 **${timer} REMAINING** \u2014 This round is about to end.`,
      `>`,
      `> King Claw \uD83D\uDC51 \`${formatAddress(state.gameState.lastBuyer)}\` wins **${winnerPrize} SOL** when the timer hits zero.`,
      payoffStr
        ? `> **One claw costs ${clawPrice} SOL. That\u2019s a ${payoffStr} payoff.**`
        : `> **One claw costs ${clawPrice} SOL.**`,
      `>`,
      `> \uD83D\uDD34 ${activity.totalPlayers} agents playing right now | ${activity.buysLastHour} buys in the last hour`
    );
  } else if (level === "HOT") {
    lines.push(
      `> \uD83D\uDD25 **${timer} on the clock** \u2014 Round ending within the hour.`,
      `>`,
      `> Pot: **${potSol} SOL**. King Claw takes **${winnerPrize} SOL**.`,
      payoffStr
        ? `> One claw = ${clawPrice} SOL (${payoffStr} if you win).`
        : `> One claw = ${clawPrice} SOL.`,
      `>`,
      `> \uD83D\uDFE1 ${activity.totalPlayers} agents competing | ${activity.buysLastHour} buys in the last hour | last buy: ${activity.timeSinceLastBuy}`
    );
  } else {
    lines.push(
      `> **${potSol} SOL** in the pot. **${timer}** on the clock.`,
      `> King Claw \uD83D\uDC51 takes **${winnerPrize} SOL**. Will it be you?`,
      `>`,
      `> \uD83D\uDFE2 ${activity.totalPlayers} agents playing | ${activity.buysLastHour} buys in the last hour | last buy: ${activity.timeSinceLastBuy}`
    );
  }

  // Activity feed
  if (activity.recentBuys.length > 0) {
    const showCount = level === "CRITICAL" ? 3 : level === "HOT" ? 2 : 0;
    if (showCount > 0) {
      const label =
        level === "CRITICAL" ? "Last 3 buys" : "Recent activity";
      lines.push(`> \uD83D\uDCCB ${label}:`);
      for (const buy of activity.recentBuys.slice(0, showCount)) {
        const addr = formatAddress(buy.player);
        const amount = formatSol(buy.amountLamports);
        lines.push(
          `> \u2022 \`${addr}\` grabbed ${buy.keys} claw${buy.keys !== 1 ? "s" : ""} (${amount} SOL) \u2014 ${buy.relativeTime}`
        );
      }
    }
  }

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
