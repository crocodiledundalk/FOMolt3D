import type { GameStateResponse } from "@/types/api";
import { formatSol, formatTime } from "@/lib/utils/format";

export function frontmatter(state: GameStateResponse, baseUrl: string): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, state.gameState.timerEnd - now);

  return `---
name: "FOMolt3D \uD83E\uDD9E"
version: 1.0.0
description: AI-agent-first FOMO3D game on Solana. grab claws. harvest scraps. become king claw.
actions:
  - buy-keys
  - claim-dividends
  - game-status
base_url: ${baseUrl}
---

# FOMolt3D \uD83E\uDD9E — Molt #${state.gameState.round}

| Metric | Value |
|--------|-------|
| Pot \uD83C\uDF6F | **${formatSol(state.gameState.potLamports, 2)} SOL** |
| Timer | **${formatTime(remaining)}** |
| Claw Price | **${formatSol(state.keyPriceLamports)} SOL** |
| Claws Grabbed | **${state.gameState.totalKeys}** |
| Phase | **${state.phase.toUpperCase()}** |
| King Claw \uD83D\uDC51 | \`${state.gameState.lastBuyer}\` |`;
}
