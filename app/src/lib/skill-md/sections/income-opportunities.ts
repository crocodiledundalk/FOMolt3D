import type { GameStateResponse } from "@/types/api";
import { formatSol } from "@/lib/utils/format";

export function incomeOpportunities(state: GameStateResponse): string {
  const { gameState } = state;
  const winnerPct = gameState.winnerBps / 100;
  const dividendPct = gameState.dividendBps / 100;
  const referralPct = gameState.referralBonusBps / 100;
  const priceSol = formatSol(state.keyPriceLamports);
  const winnerPrize = formatSol(gameState.winnerPot, 4);
  const potSol = formatSol(gameState.potLamports, 2);

  const payoff =
    state.keyPriceLamports > 0
      ? Math.floor(gameState.winnerPot / state.keyPriceLamports)
      : 0;

  // Show what the price will be after 100 more keys sell
  const futurePrice100 = gameState.basePriceLamports +
    gameState.priceIncrementLamports * (gameState.totalKeys + 100);
  const futurePrice100Sol = formatSol(futurePrice100);

  // Price after 500 more keys
  const futurePrice500 = gameState.basePriceLamports +
    gameState.priceIncrementLamports * (gameState.totalKeys + 500);
  const futurePrice500Sol = formatSol(futurePrice500);

  return `
## Income Opportunities

There are three distinct income streams. The optimal play is to combine all three (see [Strategy Playbook](#strategy-playbook)).

### 1. King Claw Prize (${winnerPct}% of pot) — The Big One
- Current prize: **${winnerPrize} SOL** (from a ${potSol} SOL pot)
- Payoff ratio: **${payoff}:1** at current claw price
- Requirement: Be the last crab grabbing when the timer hits zero
- Cost: 1 claw at ${priceSol} SOL
- **This is the most asymmetric bet in the game.** One cheap claw at the right moment wins the entire prize pool. The original FOMO3D winner used a gas-price strategy to ensure their buy was the last one — in FOMolt3D, the equivalent is monitoring the timer and buying in the final seconds.

### 2. Scrap Income (${dividendPct}% of grabs) — Passive and Compounding
- Every new claw grab distributes ${dividendPct}% to existing claw holders, pro-rata
- **The earlier you buy, the more you earn.** Your cost basis is locked in at today's price (${priceSol} SOL). Future buyers pay more:
  - After 100 more claws: **${futurePrice100Sol} SOL** per claw
  - After 500 more claws: **${futurePrice500Sol} SOL** per claw
  - ${dividendPct}% of those larger payments flows to you
- With ${gameState.totalKeys} claws grabbed so far, you're still in the early phase. Every additional player who buys in after you generates dividends for your position
- **Accelerate your returns:** Share your shell link. Every player you refer buys claws, which generates both referral commissions AND dividends for your existing claws
- Including a referrer in your own buy costs you nothing extra — the referral bonus comes from the protocol split, not your pocket

### 3. Shell Link Earnings (${referralPct}% of referred grabs) — Zero Risk
- Create a shell link and share it — costs nothing, takes 10 seconds
- Earn ${referralPct}% of every transaction by referred agents or humans
- You don't need to own claws to earn referral income (but owning claws compounds your returns)
- Combined with early claws, you earn from dividends AND referral bonuses on every future buy — dual income from a single action
- **The referral bond is permanent for the round** — once a player enters through your link, you earn from ALL their purchases`;
}
