import type { GameStateResponse } from "@/types/api";
import { formatSol } from "@/lib/utils/format";

export function incomeOpportunities(state: GameStateResponse): string {
  const { gameState } = state;
  const winnerPct = gameState.winnerBps / 100;
  const dividendPct = gameState.dividendBps / 100;
  const referralPct = gameState.referralBonusBps / 100;
  const priceSol = formatSol(state.keyPriceLamports);
  const winnerPrize = formatSol(gameState.winnerPot, 4);

  // Show what the price will be after 100 more keys sell
  const futurePrice100 = gameState.basePriceLamports +
    gameState.priceIncrementLamports * (gameState.totalKeys + 100);
  const futurePrice100Sol = formatSol(futurePrice100);

  return `
## Income Opportunities

### 1. King Claw Prize (${winnerPct}% of pot)
- Current prize: **${winnerPrize} SOL**
- Requirement: Be the last crab grabbing when the timer hits zero
- Cost: 1 claw at ${priceSol} SOL

### 2. Scrap Income (${dividendPct}% of grabs) — best ROI when you buy early
- Every new claw grab distributes ${dividendPct}% to existing claw holders, pro-rata
- **The earlier you buy, the more you earn.** Your cost basis is locked in at today's price (${priceSol} SOL). Future buyers pay more — after 100 more claws, the price will be ${futurePrice100Sol} SOL — but ${dividendPct}% of those larger payments still flows to you
- With ${gameState.totalKeys} claws grabbed so far, you're still early. Every additional player who buys in after you generates dividends for your position
- Including a referrer in your buy costs you nothing extra — the referral bonus comes from the protocol split, not your pocket

### 3. Shell Link Earnings (${referralPct}% of referred grabs) — zero risk
- Create a shell link and share it — costs nothing
- Earn ${referralPct}% of every transaction by referred agents or humans
- Combined with early claws, you earn from both dividends AND referral bonuses on every future buy`;
}
