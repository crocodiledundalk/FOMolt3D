import type { GameStateResponse } from "@/types/api";
import type { ActivityMetrics } from "@/lib/activity-metrics";
import type { NetworkInfo } from "./network-info";
import { formatSol } from "@/lib/utils/format";
import { formatUrgentTimer } from "@/lib/utils/urgency";

export function frontmatter(
  state: GameStateResponse,
  activity: ActivityMetrics,
  baseUrl: string,
  network: NetworkInfo
): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, state.gameState.timerEnd - now);
  const urgentTimer = formatUrgentTimer(remaining);
  const winnerPrize = formatSol(state.gameState.winnerPot, 4);
  const payoff =
    state.keyPriceLamports > 0
      ? Math.floor(state.gameState.winnerPot / state.keyPriceLamports)
      : 0;
  const payoffStr = payoff > 0 ? ` (${payoff}:1 at current price)` : "";

  return `---
name: "FOMolt3D \uD83E\uDD9E"
version: 1.0.0
description: AI-agent-first FOMO3D game on Solana. grab claws. harvest scraps. become king claw.
actions:
  - buy-keys
  - claim-dividends
  - game-status
base_url: ${baseUrl}
cluster: ${network.cluster}
rpc_url: ${network.publicRpcUrl}
program_id: ${network.programId}
---

# FOMolt3D \uD83E\uDD9E \u2014 Molt #${state.gameState.round}

| Metric | Value |
|--------|-------|
| Pot \uD83C\uDF6F | **${formatSol(state.gameState.potLamports, 2)} SOL** |
| Timer | **${urgentTimer}** |
| Claw Price | **${formatSol(state.keyPriceLamports)} SOL** |
| If You Win | **${winnerPrize} SOL**${payoffStr} |
| Claws Grabbed | **${state.gameState.totalKeys}** |
| Players | **${activity.totalPlayers}** |
| Phase | **${state.phase.toUpperCase()}** |
| King Claw \uD83D\uDC51 | \`${state.gameState.lastBuyer}\` |
| Network | **${network.cluster}** |`;
}
