import type { PublicKey } from "@solana/web3.js";

/**
 * On-chain GameState — matches IDL exactly.
 * All lamport values are `number` (safe up to ~9M SOL).
 */
export interface OnChainGameState {
  round: number;
  potLamports: number;
  timerEnd: number;
  lastBuyer: PublicKey;
  totalKeys: number;
  roundStart: number;
  active: boolean;
  winnerClaimed: boolean;
  totalPlayers: number;
  totalDividendPool: number;
  nextRoundPot: number;
  winnerPot: number;
  // Config snapshot
  basePriceLamports: number;
  priceIncrementLamports: number;
  timerExtensionSecs: number;
  maxTimerSecs: number;
  winnerBps: number;
  dividendBps: number;
  nextRoundBps: number;
  protocolFeeBps: number;
  referralBonusBps: number;
  protocolWallet: PublicKey;
  bump: number;
}

/**
 * On-chain PlayerState — matches IDL exactly.
 */
export interface OnChainPlayerState {
  player: PublicKey;
  keys: number;
  currentRound: number;
  claimedDividendsLamports: number;
  referrer: PublicKey | null;
  referralEarningsLamports: number;
  claimedReferralEarningsLamports: number;
  isAgent: boolean;
  bump: number;
}

/**
 * On-chain GlobalConfig — matches IDL exactly.
 */
export interface OnChainGlobalConfig {
  admin: PublicKey;
  basePriceLamports: number;
  priceIncrementLamports: number;
  timerExtensionSecs: number;
  maxTimerSecs: number;
  winnerBps: number;
  dividendBps: number;
  nextRoundBps: number;
  protocolFeeBps: number;
  referralBonusBps: number;
  protocolWallet: PublicKey;
  bump: number;
}

export type GamePhase = "waiting" | "active" | "ending" | "ended" | "claiming";

/**
 * Comprehensive player status — derived from comparing PlayerState + GameState.
 */
export interface PlayerStatus {
  /** No PlayerState PDA exists for this wallet */
  needsRegistration: boolean;
  /** Player is in an old round and must claim before joining current round */
  needsSettlement: boolean;
  /** The old round number that needs claiming (0 if none) */
  staleRound: number;
  /** Player can buy keys in the current round */
  canBuyKeys: boolean;
  /** Player can claim dividends (round ended, has keys, hasn't claimed yet) */
  canClaim: boolean;
  /** Player can claim referral earnings */
  canClaimReferral: boolean;
  /** Player is the last buyer (potential winner) */
  isWinner: boolean;
  /** Estimated dividend payout in lamports (0 if not applicable) */
  estimatedDividend: number;
  /** Winner prize in lamports (0 if not winner) */
  estimatedWinnerPrize: number;
  /** Unclaimed referral earnings in lamports */
  unclaimedReferralEarnings: number;
  /** Current game phase */
  phase: GamePhase;
  /** Player's keys in current round (0 if not in round) */
  keys: number;
}

/**
 * Cost breakdown for a key purchase.
 */
export interface BuyCostEstimate {
  /** Total cost to buyer in lamports */
  totalCost: number;
  /** Protocol fee (house edge) in lamports */
  protocolFee: number;
  /** After-fee amount */
  afterFee: number;
  /** Referral bonus in lamports (0 if no referrer) */
  referralBonus: number;
  /** Amount entering the pot */
  potContribution: number;
  /** Winner share of pot contribution */
  winnerShare: number;
  /** Dividend share of pot contribution */
  dividendShare: number;
  /** Next round share of pot contribution */
  nextRoundShare: number;
}

/**
 * PDAs for a specific game round.
 */
export interface RoundPDAs {
  gameState: PublicKey;
  gameStateBump: number;
  vault: PublicKey;
  vaultBump: number;
}
