import type { OnChainGameState, OnChainPlayerState } from "./types";
import type { GameState, PlayerState } from "@/types/game";

/** Convert SDK OnChainGameState to API GameState (serializable). */
export function toApiGameState(gs: OnChainGameState): GameState {
  return {
    round: gs.round,
    potLamports: gs.potLamports,
    timerEnd: gs.timerEnd,
    lastBuyer: gs.lastBuyer.toBase58(),
    totalKeys: gs.totalKeys,
    roundStart: gs.roundStart,
    active: gs.active,
    winnerClaimed: gs.winnerClaimed,
    totalPlayers: gs.totalPlayers,
    totalDividendPool: gs.totalDividendPool,
    nextRoundPot: gs.nextRoundPot,
    winnerPot: gs.winnerPot,
    basePriceLamports: gs.basePriceLamports,
    priceIncrementLamports: gs.priceIncrementLamports,
    timerExtensionSecs: gs.timerExtensionSecs,
    maxTimerSecs: gs.maxTimerSecs,
    winnerBps: gs.winnerBps,
    dividendBps: gs.dividendBps,
    nextRoundBps: gs.nextRoundBps,
    protocolFeeBps: gs.protocolFeeBps,
    referralBonusBps: gs.referralBonusBps,
    protocolWallet: gs.protocolWallet.toBase58(),
  };
}

/** Convert SDK OnChainPlayerState to API PlayerState (serializable). */
export function toApiPlayerState(ps: OnChainPlayerState): PlayerState {
  return {
    player: ps.player.toBase58(),
    keys: ps.keys,
    currentRound: ps.currentRound,
    claimedDividendsLamports: ps.claimedDividendsLamports,
    referrer: ps.referrer ? ps.referrer.toBase58() : null,
    referralEarningsLamports: ps.referralEarningsLamports,
    claimedReferralEarningsLamports: ps.claimedReferralEarningsLamports,
    isAgent: ps.isAgent,
  };
}
