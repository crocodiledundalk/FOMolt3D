/**
 * Priority fee estimation and compute budget instruction builder.
 *
 * Prepend the returned instructions to any transaction to set an
 * appropriate compute unit limit and priority fee for mainnet landing.
 */

import {
  Connection,
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

/** Fallback priority fee when RPC estimate is unavailable (microLamports per CU). */
const FALLBACK_PRIORITY_FEE = 50_000;

/** Maximum priority fee cap to prevent overpayment (microLamports per CU). */
const MAX_PRIORITY_FEE = 1_000_000;

/** Program ID — used to get account-specific fee data. */
const PROGRAM_ID = new PublicKey(
  "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
);

/** Compute unit budgets per instruction type. */
export const ComputeUnits = {
  /** buy_keys (smartBuy may include prior claim + buy, with init_if_needed) */
  BUY_KEYS: 200_000,
  /** claim (smartClaim may include claim + claim_referral) */
  CLAIM: 150_000,
  /** claim_referral_earnings (single instruction) */
  CLAIM_REFERRAL: 80_000,
  /** claim winner prize (single claim instruction) */
  CLAIM_WINNER: 100_000,
  /** start_new_round (creates new GameState + Vault accounts) */
  START_NEW_ROUND: 150_000,
  /** create_or_update_config (admin) */
  CONFIG: 80_000,
  /** initialize_first_round (admin, creates GameState + Vault) */
  INIT_ROUND: 120_000,
} as const;

/**
 * Estimate a priority fee from recent slot data.
 *
 * Passes our program's account addresses to `getRecentPrioritizationFees`
 * so the RPC returns fees for transactions that write-lock the same accounts
 * (rather than the global minimum, which is always 0). Falls back to a static
 * value when the RPC returns no non-zero data or errors.
 *
 * @param connection - Solana RPC connection
 * @param accounts - Optional additional writable account addresses for fee estimation
 */
export async function estimatePriorityFee(
  connection: Connection,
  accounts?: PublicKey[]
): Promise<number> {
  try {
    // Include the program ID + any writable accounts for targeted fee data
    const addresses = [PROGRAM_ID, ...(accounts ?? [])];
    const fees = await connection.getRecentPrioritizationFees({
      lockedWritableAccounts: addresses,
    });
    if (!fees.length) return FALLBACK_PRIORITY_FEE;

    // Filter to non-zero fees and take the median
    const nonZero = fees
      .map((f) => f.prioritizationFee)
      .filter((f) => f > 0)
      .sort((a, b) => a - b);

    if (!nonZero.length) return FALLBACK_PRIORITY_FEE;

    const median = nonZero[Math.floor(nonZero.length / 2)];
    return Math.min(Math.max(median, 1), MAX_PRIORITY_FEE);
  } catch {
    return FALLBACK_PRIORITY_FEE;
  }
}

/**
 * Build the two compute budget instructions to prepend to a transaction.
 *
 * @param connection  - Solana RPC connection (used to estimate priority fee)
 * @param computeUnits - Max compute units for the transaction (use ComputeUnits.*)
 * @returns Two instructions: [setComputeUnitLimit, setComputeUnitPrice]
 */
export async function getComputeBudgetInstructions(
  connection: Connection,
  computeUnits: number
): Promise<TransactionInstruction[]> {
  const priorityFee = await estimatePriorityFee(connection);
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
  ];
}
