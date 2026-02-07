/**
 * Typed interfaces matching on-chain program events.
 * These mirror the Anchor event structs emitted by the Solana program.
 *
 * IMPORTANT: These types represent the SSE-serialized form of FomoltEvent
 * from sdk/events.ts — PublicKey fields are base58 strings here (not PublicKey objects)
 * because the SSE layer JSON-serializes them via toBase58().
 */

export interface KeysPurchasedEvent {
  type: "KeysPurchased";
  round: number;
  player: string;
  isAgent: boolean;
  keysBought: number;
  totalPlayerKeys: number;
  lamportsSpent: number;
  potContribution: number;
  timestamp: number;
}

export interface ReferralEarnedEvent {
  type: "ReferralEarned";
  round: number;
  player: string;
  referrer: string;
  keysBought: number;
  lamportsSpent: number;
  referrerLamports: number;
  timestamp: number;
}

export interface GameUpdatedEvent {
  type: "GameUpdated";
  round: number;
  potLamports: number;
  totalKeys: number;
  nextKeyPrice: number;
  lastBuyer: string;
  timerEnd: number;
  winnerPot: number;
  nextRoundPot: number;
  timestamp: number;
}

export interface ClaimedEvent {
  type: "Claimed";
  round: number;
  player: string;
  dividendLamports: number;
  winnerLamports: number;
  totalLamports: number;
  timestamp: number;
}

export interface ReferralClaimedEvent {
  type: "ReferralClaimed";
  round: number;
  player: string;
  lamports: number;
  timestamp: number;
}

export interface RoundStartedEvent {
  type: "RoundStarted";
  round: number;
  carryOverLamports: number;
  timerEnd: number;
  basePriceLamports: number;
  priceIncrementLamports: number;
  timestamp: number;
}

export interface RoundConcludedEvent {
  type: "RoundConcluded";
  round: number;
  winner: string;
  winnerLamports: number;
  potLamports: number;
  totalKeys: number;
  totalPlayers: number;
  nextRoundPot: number;
  roundStart: number;
  roundEnd: number;
  timestamp: number;
}

export interface ProtocolFeeCollectedEvent {
  type: "ProtocolFeeCollected";
  round: number;
  lamports: number;
  recipient: string;
  timestamp: number;
}

/** Discriminated union of all program events */
export type ProgramEvent = (
  | GameUpdatedEvent
  | KeysPurchasedEvent
  | ReferralEarnedEvent
  | ClaimedEvent
  | ReferralClaimedEvent
  | RoundStartedEvent
  | RoundConcludedEvent
  | ProtocolFeeCollectedEvent
) & { signature?: string; key?: string };

/** All possible event type discriminators */
export type ProgramEventType = ProgramEvent["type"];
