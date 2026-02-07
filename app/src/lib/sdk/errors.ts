/**
 * FOMolt3D program error codes and user-friendly messages.
 * Maps all 21 on-chain error codes to actionable descriptions.
 */

export interface FomoltError {
  code: number;
  name: string;
  message: string;
  userMessage: string;
}

const ERROR_MAP: Record<number, Omit<FomoltError, "code">> = {
  6000: {
    name: "GameNotActive",
    message: "Game round is not active",
    userMessage: "This round has ended. Wait for a new round to start.",
  },
  6001: {
    name: "GameStillActive",
    message: "Game round is still active",
    userMessage: "The current round is still running. Wait for it to end.",
  },
  6002: {
    name: "TimerExpired",
    message: "Timer has expired",
    userMessage: "The timer has expired. This round has ended.",
  },
  6003: {
    name: "TimerNotExpired",
    message: "Timer has not expired yet",
    userMessage: "The timer hasn't expired. The round is still active.",
  },
  6004: {
    name: "InsufficientFunds",
    message: "Insufficient funds for purchase",
    userMessage: "You don't have enough SOL to buy these keys.",
  },
  6005: {
    name: "NoKeysToBuy",
    message: "Must buy at least one key",
    userMessage: "You must buy at least 1 key.",
  },
  6006: {
    name: "NothingToClaim",
    message: "Nothing to claim",
    userMessage: "You have no dividends or prizes to claim.",
  },
  6007: {
    name: "NotWinner",
    message: "Only the last buyer can claim the winner prize",
    userMessage: "Only the last key buyer can claim the winner prize.",
  },
  6008: {
    name: "WinnerAlreadyClaimed",
    message: "Winner prize has already been claimed",
    userMessage: "The winner prize has already been claimed.",
  },
  6009: {
    name: "WinnerNotClaimed",
    message: "Winner has not claimed prize yet",
    userMessage:
      "The winner must claim their prize before a new round can start.",
  },
  6010: {
    name: "CannotReferSelf",
    message: "Cannot refer yourself",
    userMessage: "You can't use your own referral link.",
  },
  6011: {
    name: "ReferrerMismatch",
    message: "Referrer does not match stored referrer",
    userMessage:
      "Your referrer has already been set and can't be changed.",
  },
  6012: {
    name: "ReferrerNotRegistered",
    message: "Referrer is not registered in this round",
    userMessage:
      "Your referrer hasn't registered for this round yet. They need to join first.",
  },
  6013: {
    name: "NoReferralEarnings",
    message: "No referral earnings to claim",
    userMessage: "You have no referral earnings to claim.",
  },
  6014: {
    name: "Unauthorized",
    message: "Unauthorized: admin only",
    userMessage: "Only the game admin can perform this action.",
  },
  6015: {
    name: "InvalidConfig",
    message: "Invalid configuration parameters",
    userMessage: "The game configuration is invalid.",
  },
  6016: {
    name: "Overflow",
    message: "Arithmetic overflow",
    userMessage:
      "A calculation error occurred. Try a smaller amount.",
  },
  6017: {
    name: "PlayerAlreadyRegistered",
    message: "Player is already registered in this round",
    userMessage: "You're already registered for this round.",
  },
  6018: {
    name: "MustClaimPreviousRound",
    message: "Must claim from previous round before joining a new one",
    userMessage:
      "You need to claim your dividends from the previous round first.",
  },
  6019: {
    name: "PlayerNotInRound",
    message: "Player is not in this round",
    userMessage: "You're not a participant in this round.",
  },
};

/**
 * Look up a FomoltError by code.
 */
export function getErrorByCode(code: number): FomoltError | null {
  const entry = ERROR_MAP[code];
  if (!entry) return null;
  return { code, ...entry };
}

/**
 * Look up a FomoltError by name.
 */
export function getErrorByName(name: string): FomoltError | null {
  for (const [code, entry] of Object.entries(ERROR_MAP)) {
    if (entry.name === name) {
      return { code: Number(code), ...entry };
    }
  }
  return null;
}

/**
 * Extract a FomoltError from an Anchor/SendTransaction error.
 * Tries multiple patterns to find the error code.
 */
export function parseProgramError(error: unknown): FomoltError | null {
  if (!error) return null;

  // Anchor wraps program errors with an `error.error.errorCode.number`
  const err = error as Record<string, unknown>;

  // Pattern 1: Anchor AnchorError { error: { errorCode: { number, code } } }
  if (err.error && typeof err.error === "object") {
    const inner = err.error as Record<string, unknown>;
    if (inner.errorCode && typeof inner.errorCode === "object") {
      const ec = inner.errorCode as Record<string, unknown>;
      if (typeof ec.number === "number") {
        return getErrorByCode(ec.number);
      }
    }
  }

  // Pattern 2: Anchor error with `code` property directly
  if (typeof err.code === "number" && err.code >= 6000 && err.code <= 6019) {
    return getErrorByCode(err.code);
  }

  // Pattern 3: Extract from error message string (e.g., "Error Code: 6004")
  const msg = String(err.message || err);
  const codeMatch = msg.match(/(?:Error Code|custom program error): (?:0x)?(\d+)/i);
  if (codeMatch) {
    const code = parseInt(codeMatch[1], 10);
    // Handle hex codes (Anchor sometimes uses 0x format)
    return getErrorByCode(code >= 0x1770 ? code - 0x1770 + 6000 : code);
  }

  // Pattern 4: Check for hex error code in logs
  const hexMatch = msg.match(/0x([0-9a-fA-F]+)/);
  if (hexMatch) {
    const hexCode = parseInt(hexMatch[1], 16);
    if (hexCode >= 6000 && hexCode <= 6019) {
      return getErrorByCode(hexCode);
    }
  }

  return null;
}

/**
 * Type guard: check if an error matches a specific program error code.
 */
export function isProgramError(error: unknown, code: number): boolean {
  const parsed = parseProgramError(error);
  return parsed !== null && parsed.code === code;
}

/** Convenience error code constants */
export const ErrorCode = {
  GameNotActive: 6000,
  GameStillActive: 6001,
  TimerExpired: 6002,
  TimerNotExpired: 6003,
  InsufficientFunds: 6004,
  NoKeysToBuy: 6005,
  NothingToClaim: 6006,
  NotWinner: 6007,
  WinnerAlreadyClaimed: 6008,
  WinnerNotClaimed: 6009,
  CannotReferSelf: 6010,
  ReferrerMismatch: 6011,
  ReferrerNotRegistered: 6012,
  NoReferralEarnings: 6013,
  Unauthorized: 6014,
  InvalidConfig: 6015,
  Overflow: 6016,
  PlayerAlreadyRegistered: 6017,
  MustClaimPreviousRound: 6018,
  PlayerNotInRound: 6019,
} as const;
