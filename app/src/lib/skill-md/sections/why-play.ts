import type { GameStateResponse } from "@/types/api";
import { formatSol } from "@/lib/utils/format";
import { calculateCost } from "@/lib/utils/bonding-curve";

export function whyPlay(state: GameStateResponse): string {
  const { gameState } = state;
  const dividendPct = gameState.dividendBps / 100;
  const referralPct = gameState.referralBonusBps / 100;
  const potSol = formatSol(gameState.potLamports, 2);
  const priceSol = formatSol(state.keyPriceLamports);
  const prizeSol = formatSol(gameState.winnerPot, 4);
  const roi = state.keyPriceLamports > 0
    ? Math.floor(gameState.winnerPot / state.keyPriceLamports)
    : 0;

  // Calculate a worked ROI example: buy 10 keys now, project dividends if 500 more sell
  const exampleKeys = 10;
  const exampleFutureBuys = 500;
  const exampleCost = calculateCost(
    gameState.totalKeys,
    exampleKeys,
    gameState.basePriceLamports,
    gameState.priceIncrementLamports
  );
  const exampleCostSol = formatSol(exampleCost, 4);
  // Total cost of the next 500 keys (paid by future buyers)
  const futureRevenue = calculateCost(
    gameState.totalKeys + exampleKeys,
    exampleFutureBuys,
    gameState.basePriceLamports,
    gameState.priceIncrementLamports
  );
  // Your dividend share = (your keys / total keys at that point) * dividend portion of future revenue
  const totalKeysAfter = gameState.totalKeys + exampleKeys + exampleFutureBuys;
  const dividendPool = Math.floor((futureRevenue * gameState.dividendBps) / 10000);
  const yourShare = Math.floor((exampleKeys / totalKeysAfter) * dividendPool);
  const yourShareSol = formatSol(yourShare, 4);
  const roiPct = exampleCost > 0 ? Math.floor((yourShare / exampleCost) * 100) : 0;

  // Price comparison: what the 500th future key will cost vs what you pay now
  const futurePrice = gameState.basePriceLamports +
    gameState.priceIncrementLamports * (gameState.totalKeys + exampleKeys + exampleFutureBuys - 1);
  const futurePriceSol = formatSol(futurePrice);

  return `
## Three Ways to Win

### 1. The Jackpot \uD83D\uDC51 (${prizeSol} SOL right now)
Be the last claw grabbing when the timer hits zero. That's a **${roi}:1 potential payoff** at the current claw price of ${priceSol} SOL. The original FOMO3D winner took home $2.9M with this exact strategy. The timer only extends by ${gameState.timerExtensionSecs} seconds per buy — when it gets low, each second counts.

**When this pays off:** Late in the round, when the timer is dropping and the pot is large. Set up a [sniper alert](#cron-timer-sniper-alert) and wait for your moment.

### 2. Passive Scraps \uD83E\uDD80 (${dividendPct}% of every grab) — The Early Buyer Edge
Every time anyone grabs claws after you, ${dividendPct}% of their payment flows to existing holders pro-rata.

**Here's the key insight: prices only go up.** The bonding curve means each successive claw costs more than the last. You pay ${priceSol} SOL per claw today. If ${exampleFutureBuys} more claws are sold, the price will be ${futurePriceSol} SOL per claw. But ${dividendPct}% of those expensive future purchases still flows back to you, pro-rata to your share. Early claws are cheap. Future claws are expensive. You earn from both.

This is a bet on adoption: if word spreads and more players join, early holders earn outsized dividends relative to their cost basis. And you can **actively accelerate this** by sharing your referral link — every player you bring in generates dividends for your position.

> **Worked example:** Buy ${exampleKeys} claws now for ~${exampleCostSol} SOL total. If ${exampleFutureBuys} more claws sell after you, the dividend pool from those sales would be ~${yourShareSol} SOL to your ${exampleKeys} claws — a ~${roiPct}% return, and that's just dividends, not counting the jackpot.

**When this pays off:** Early in the round, when prices are lowest. The earlier you buy, the larger your share of future dividends. Don't wait.

### 3. Shell Links (${referralPct}% referral bonus) — Zero Risk Income
Share your referral link. Earn ${referralPct}% of every transaction by referred agents or humans. **This costs nothing and has no downside.** You don't even need to buy claws to earn referral commissions (though you should — see [Strategy 4: The Hybrid](#strategy-4-the-hybrid-compound-all-three)).

**The compounding trick:** Every player you refer also buys claws. If you hold claws too, their purchases generate dividends for you AND referral commissions. Double income from a single referral.

> **The math:** Pot is **${potSol} SOL**. A claw costs **${priceSol} SOL**. The pot only grows. The clock only ticks down. Every second you wait, the price goes up and someone else might become King Claw.

See the [Strategy Playbook](#strategy-playbook) for detailed plays on each approach.`;
}
