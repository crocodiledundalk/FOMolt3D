// ─── Addresses (@solana/kit boundary) ────────────────────────────────
export {
  PROGRAM_ADDRESS,
  isValidSolanaAddress,
  assertSolanaAddress,
} from "./addresses";
export type { SolanaAddress } from "./addresses";

// ─── Types ──────────────────────────────────────────────────────────
export type {
  OnChainGameState,
  OnChainPlayerState,
  OnChainGlobalConfig,
  GamePhase,
  PlayerStatus,
  BuyCostEstimate,
  RoundPDAs,
} from "./types";

// ─── PDAs ───────────────────────────────────────────────────────────
export {
  PROGRAM_ID,
  getConfigPDA,
  getGameStatePDA,
  getPlayerStatePDA,
  getVaultPDA,
  getRoundPDAs,
} from "./pdas";

// ─── Connection ─────────────────────────────────────────────────────
export {
  getConnection,
  getReadOnlyProgram,
  getProgram,
} from "./connection";

// ─── Account Fetching ───────────────────────────────────────────────
export {
  fetchGlobalConfig,
  fetchGameState,
  fetchPlayerState,
  fetchVaultBalance,
  findCurrentRound,
  fetchAllPlayersInRound,
} from "./accounts";

// ─── Player Status ──────────────────────────────────────────────────
export { getGamePhase, getPlayerStatus } from "./player-status";

// ─── Instruction Builders ───────────────────────────────────────────
export {
  buildBuyKeys,
  buildClaim,
  buildClaimReferralEarnings,
  buildStartNewRound,
  buildCreateOrUpdateConfig,
  buildInitializeFirstRound,
} from "./instructions";
export type { ConfigParams } from "./instructions";

// ─── Composite Transactions ─────────────────────────────────────────
export {
  buildClaimAll,
  buildSmartBuy,
  buildSmartClaim,
} from "./composites";

// ─── Cost & Fee Estimation ──────────────────────────────────────────
export {
  calculateCost,
  getNextKeyPrice,
  estimateBuyCost,
  estimateDividend,
  estimateWinnerPrize,
  maxKeysForBudget,
} from "./estimates";

// ─── Error Handling ─────────────────────────────────────────────────
export {
  getErrorByCode,
  getErrorByName,
  parseProgramError,
  isProgramError,
  ErrorCode,
} from "./errors";
export type { FomoltError } from "./errors";

// ─── Mappers ────────────────────────────────────────────────────────
export { toApiGameState, toApiPlayerState } from "./mappers";

// ─── Event Parsing ──────────────────────────────────────────────────
export {
  parseTransactionEvents,
  fetchRecentEvents,
  subscribeToGameEvents,
} from "./events";
export type {
  FomoltEvent,
  KeysPurchasedEvent,
  ReferralEarnedEvent,
  GameUpdatedEvent,
  ClaimedEvent,
  ReferralClaimedEvent,
  RoundStartedEvent,
  ProtocolFeeCollectedEvent,
  RoundConcludedEvent,
} from "./events";
