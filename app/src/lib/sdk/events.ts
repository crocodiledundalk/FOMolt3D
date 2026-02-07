import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder, EventParser } from "@coral-xyz/anchor";
import type { Fomolt3d } from "../idl-types";
import idl from "../idl.json";
import { PROGRAM_ID } from "./pdas";

// ─── Event Types (matching on-chain events) ─────────────────────────

export interface KeysPurchasedEvent {
  type: "KeysPurchased";
  round: number;
  player: PublicKey;
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
  player: PublicKey;
  referrer: PublicKey;
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
  lastBuyer: PublicKey;
  timerEnd: number;
  winnerPot: number;
  nextRoundPot: number;
  timestamp: number;
}

export interface ClaimedEvent {
  type: "Claimed";
  round: number;
  player: PublicKey;
  dividendLamports: number;
  winnerLamports: number;
  totalLamports: number;
  timestamp: number;
}

export interface ReferralClaimedEvent {
  type: "ReferralClaimed";
  round: number;
  player: PublicKey;
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

export interface ProtocolFeeCollectedEvent {
  type: "ProtocolFeeCollected";
  round: number;
  lamports: number;
  recipient: PublicKey;
  timestamp: number;
}

export interface RoundConcludedEvent {
  type: "RoundConcluded";
  round: number;
  winner: PublicKey;
  winnerLamports: number;
  potLamports: number;
  totalKeys: number;
  totalPlayers: number;
  nextRoundPot: number;
  roundStart: number;
  roundEnd: number;
  timestamp: number;
}

export type FomoltEvent = (
  | KeysPurchasedEvent
  | ReferralEarnedEvent
  | GameUpdatedEvent
  | ClaimedEvent
  | ReferralClaimedEvent
  | RoundStartedEvent
  | ProtocolFeeCollectedEvent
  | RoundConcludedEvent
) & { signature?: string; key?: string };

// ─── Event Parsing ──────────────────────────────────────────────────

/** Convert BN-like values to numbers */
function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

/**
 * Parse program events from transaction log messages.
 * Uses Anchor's EventParser to decode event data from program logs.
 */
export function parseTransactionEvents(logs: string[]): FomoltEvent[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coder = new BorshCoder(idl as any);
  const parser = new EventParser(PROGRAM_ID, coder);

  const events: FomoltEvent[] = [];

  for (const event of parser.parseLogs(logs)) {
    // Anchor 0.30+ IDL uses snake_case field names
    const d = event.data as Record<string, unknown>;

    switch (event.name) {
      case "KeysPurchased":
        events.push({
          type: "KeysPurchased",
          round: num(d.round),
          player: d.player as PublicKey,
          isAgent: d.is_agent as boolean,
          keysBought: num(d.keys_bought),
          totalPlayerKeys: num(d.total_player_keys),
          lamportsSpent: num(d.lamports_spent),
          potContribution: num(d.pot_contribution),
          timestamp: num(d.timestamp),
        });
        break;

      case "ReferralEarned":
        events.push({
          type: "ReferralEarned",
          round: num(d.round),
          player: d.player as PublicKey,
          referrer: d.referrer as PublicKey,
          keysBought: num(d.keys_bought),
          lamportsSpent: num(d.lamports_spent),
          referrerLamports: num(d.referrer_lamports),
          timestamp: num(d.timestamp),
        });
        break;

      case "GameUpdated":
        events.push({
          type: "GameUpdated",
          round: num(d.round),
          potLamports: num(d.pot_lamports),
          totalKeys: num(d.total_keys),
          nextKeyPrice: num(d.next_key_price),
          lastBuyer: d.last_buyer as PublicKey,
          timerEnd: num(d.timer_end),
          winnerPot: num(d.winner_pot),
          nextRoundPot: num(d.next_round_pot),
          timestamp: num(d.timestamp),
        });
        break;

      case "Claimed":
        events.push({
          type: "Claimed",
          round: num(d.round),
          player: d.player as PublicKey,
          dividendLamports: num(d.dividend_lamports),
          winnerLamports: num(d.winner_lamports),
          totalLamports: num(d.total_lamports),
          timestamp: num(d.timestamp),
        });
        break;

      case "ReferralClaimed":
        events.push({
          type: "ReferralClaimed",
          round: num(d.round),
          player: d.player as PublicKey,
          lamports: num(d.lamports),
          timestamp: num(d.timestamp),
        });
        break;

      case "RoundStarted":
        events.push({
          type: "RoundStarted",
          round: num(d.round),
          carryOverLamports: num(d.carry_over_lamports),
          timerEnd: num(d.timer_end),
          basePriceLamports: num(d.base_price_lamports),
          priceIncrementLamports: num(d.price_increment_lamports),
          timestamp: num(d.timestamp),
        });
        break;

      case "ProtocolFeeCollected":
        events.push({
          type: "ProtocolFeeCollected",
          round: num(d.round),
          lamports: num(d.lamports),
          recipient: d.recipient as PublicKey,
          timestamp: num(d.timestamp),
        });
        break;

      case "RoundConcluded":
        events.push({
          type: "RoundConcluded",
          round: num(d.round),
          winner: d.winner as PublicKey,
          winnerLamports: num(d.winner_lamports),
          potLamports: num(d.pot_lamports),
          totalKeys: num(d.total_keys),
          totalPlayers: num(d.total_players),
          nextRoundPot: num(d.next_round_pot),
          roundStart: num(d.round_start),
          roundEnd: num(d.round_end),
          timestamp: num(d.timestamp),
        });
        break;
    }
  }

  return events;
}

/** Event types that appear in the activity feed */
const FEED_EVENT_TYPES = new Set([
  "KeysPurchased",
  "Claimed",
  "RoundStarted",
  "RoundConcluded",
]);

/**
 * Fetch recent feed-worthy events from on-chain transaction history.
 * Scans up to maxTransactions, stops early when maxFeedEvents reached.
 * Returns events in chronological order (oldest first).
 */
export async function fetchRecentEvents(
  connection: Connection,
  options: {
    maxTransactions?: number;
    maxFeedEvents?: number;
    until?: string;
    feedFilter?: boolean;
  } = {}
): Promise<FomoltEvent[]> {
  const { maxTransactions = 200, maxFeedEvents = 50, until, feedFilter = true } = options;

  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, {
    limit: maxTransactions,
    ...(until ? { until } : {}),
  });

  const feedEvents: FomoltEvent[] = [];
  let feedCount = 0;

  // Signatures arrive newest-first
  for (const sig of signatures) {
    if (feedCount >= maxFeedEvents) break;
    if (sig.err) continue;
    try {
      const tx = await connection.getTransaction(sig.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta?.logMessages) continue;
      const parsed = parseTransactionEvents(tx.meta.logMessages);
      for (let i = 0; i < parsed.length; i++) {
        const e = parsed[i];
        e.signature = sig.signature;
        e.key = `${sig.signature}:${i}`;
        if (!feedFilter || FEED_EVENT_TYPES.has(e.type)) {
          feedEvents.push(e);
          feedCount++;
        }
      }
    } catch {
      // Skip transactions that fail to fetch
    }
  }

  // Reverse: oldest first (chronological order)
  return feedEvents.reverse();
}

/**
 * Subscribe to program events via WebSocket log subscription.
 * Calls the callback for each parsed event.
 * Returns an unsubscribe function.
 */
export function subscribeToGameEvents(
  connection: Connection,
  callback: (event: FomoltEvent) => void
): () => void {
  const subscriptionId = connection.onLogs(
    PROGRAM_ID,
    (logInfo) => {
      if (logInfo.err) return;
      const events = parseTransactionEvents(logInfo.logs);
      for (let i = 0; i < events.length; i++) {
        events[i].signature = logInfo.signature;
        events[i].key = `${logInfo.signature}:${i}`;
        callback(events[i]);
      }
    },
    "confirmed"
  );

  return () => {
    connection.removeOnLogsListener(subscriptionId);
  };
}
