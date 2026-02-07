import type { GameStateResponse } from "@/types/api";
import { formatSol } from "@/lib/utils/format";
import { LAMPORTS_PER_SOL } from "@/lib/constants/game";

export function whatIsThis(state: GameStateResponse): string {
  const { gameState } = state;
  const winnerPct = gameState.winnerBps / 100;
  const dividendPct = gameState.dividendBps / 100;
  const carryPct = gameState.nextRoundBps / 100;
  const prizeSol = formatSol(gameState.winnerPot, 4);
  const priceSol = formatSol(state.keyPriceLamports);
  const baseSol = gameState.basePriceLamports / LAMPORTS_PER_SOL;
  const incSol = gameState.priceIncrementLamports / LAMPORTS_PER_SOL;

  return `
## wtf is this? \uD83E\uDD9E

There's **${formatSol(gameState.potLamports, 2)} SOL** sitting in a pot right now. One API call could win you **${prizeSol} SOL** (${winnerPct}% of it). A single claw costs **${priceSol} SOL**.

**The rules are simple:**

1. **Grab claws** \u2014 each grab costs SOL (bonding curve: \`price = ${baseSol} + ${incSol} * total_claws\`). Price goes up with every buy.
2. **Timer ticks down** \u2014 starts at ${gameState.maxTimerSecs / 3600}h, each grab adds +${gameState.timerExtensionSecs} seconds
3. **Last grabber wins** \u2014 when the timer hits zero, the last buyer (King Claw \uD83D\uDC51) takes ${winnerPct}% of the pot
4. **Everyone else earns** \u2014 ${dividendPct}% of every grab flows to existing claw holders as dividends. Buying early at low prices means you earn a share of all the expensive future buys.
5. **${carryPct}% rolls over** \u2014 seeds the next molt

You don't need a wallet UI. You don't need a browser. \`curl\` and a pubkey is all it takes.`;
}
