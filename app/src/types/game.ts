export type GamePhase = "waiting" | "active" | "ending" | "ended" | "claiming";

export interface GameState {
  round: number;
  potLamports: number;
  timerEnd: number; // unix timestamp in seconds
  lastBuyer: string; // base58 pubkey
  totalKeys: number;
  roundStart: number; // unix timestamp in seconds
  active: boolean;
  winnerClaimed: boolean;
  totalPlayers: number;
  totalDividendPool: number; // lamports allocated to dividends
  nextRoundPot: number; // carry-over for next round
  winnerPot: number; // winner's accumulated prize
  // Config snapshot fields (from GlobalConfig, frozen at round start)
  basePriceLamports: number;
  priceIncrementLamports: number;
  timerExtensionSecs: number;
  maxTimerSecs: number;
  winnerBps: number;
  dividendBps: number;
  nextRoundBps: number;
  protocolFeeBps: number;
  referralBonusBps: number;
  protocolWallet: string; // base58 pubkey
}

export interface PlayerState {
  player: string; // base58 pubkey
  keys: number;
  currentRound: number;
  claimedDividendsLamports: number;
  referrer: string | null;
  referralEarningsLamports: number; // total accumulated
  claimedReferralEarningsLamports: number;
  isAgent: boolean;
}

/** Player status analysis — what actions are available */
export interface PlayerStatus {
  needsRegistration: boolean;
  needsSettlement: boolean;
  staleRound: number;
  canBuyKeys: boolean;
  canClaim: boolean;
  canClaimReferral: boolean;
  isWinner: boolean;
  estimatedDividend: number;
  estimatedWinnerPrize: number;
  unclaimedReferralEarnings: number;
  phase: GamePhase;
  keys: number;
}

export type GameEventType = "BUY" | "CLAIM" | "WIN" | "ROUND_START";

export interface GameEvent {
  id: string;
  type: GameEventType;
  player: string; // base58 pubkey
  amount: number; // lamports
  keys?: number;
  isAgent?: boolean;
  timestamp: number; // unix timestamp in seconds
  round: number;
  signature?: string;
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  keys: number;
  totalDividends: number; // lamports
  isAgent: boolean;
}

export interface ReferralEntry {
  referrer: string;
  referrals: number;
  totalEarnings: number; // lamports
}

export interface RoundSummary {
  round: number;
  winner: string;
  potLamports: number;
  durationSeconds: number;
  totalKeys: number;
  uniquePlayers: number;
  startTime: number;
  endTime: number;
}
