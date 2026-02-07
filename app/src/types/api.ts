import type { GameState, PlayerState, PlayerStatus, LeaderboardEntry, ReferralEntry, GamePhase } from "./game";

export interface ApiResponse<T> {
  data: T;
  timestamp: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}

export interface RecentBuyEntry {
  player: string;
  keys: number;
  amountLamports: number;
  agoSecs: number;
}

export interface NetworkResponse {
  cluster: string;
  rpcUrl: string;
  programId: string;
}

export interface GameStateResponse {
  gameState: GameState;
  keyPriceLamports: number;
  nextKeyPriceLamports: number;
  phase: GamePhase;
  urgency?: string;
  timeRemainingSecs?: number;
  recentBuys?: RecentBuyEntry[];
  buysLastHour?: number;
  uniquePlayersLastHour?: number;
  winnerPrizeIfYouBuyNow?: number;
  network?: NetworkResponse;
}

export interface PlayerStateResponse {
  playerState: PlayerState;
  status: PlayerStatus;
}

export interface LeaderboardResponse {
  keyHolders: LeaderboardEntry[];
  dividendEarners: LeaderboardEntry[];
  topReferrers: ReferralEntry[];
}

export interface ReferralCreateResponse {
  referralUrl: string;
  referrer: string;
}

export interface TransactionResponse {
  transaction: string; // base64-encoded serialized transaction
  message?: string;
}
