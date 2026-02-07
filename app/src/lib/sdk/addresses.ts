/**
 * @solana/kit address utilities — the non-Anchor boundary.
 *
 * ## Migration Boundary
 *
 * This project uses @coral-xyz/anchor (v0.31.1) which depends on @solana/web3.js
 * internally. Anchor's `Program`, `Provider`, and all instruction builders return
 * web3.js types (`PublicKey`, `Transaction`, `Connection`).
 *
 * **What uses @solana/kit (this file):**
 * - Address string validation (isValidSolanaAddress)
 * - Address type alias (SolanaAddress)
 * - Program ID as a string constant (PROGRAM_ADDRESS)
 *
 * **What stays on @solana/web3.js (no change):**
 * - pdas.ts — PublicKey.findProgramAddressSync (Anchor-coupled)
 * - instructions.ts — Anchor Program instruction builders
 * - composites.ts — Multi-instruction transaction builders
 * - connection.ts — Anchor Provider requires web3.js Connection
 * - accounts.ts — Anchor Program.account uses web3.js
 * - events.ts — Anchor EventParser uses web3.js
 * - All wallet components — @solana/wallet-adapter-react uses web3.js
 *
 * Full migration to @solana/kit is blocked until @coral-xyz/anchor migrates.
 */

/** Base58-encoded Solana address string (branded type placeholder). */
export type SolanaAddress = string & { readonly __brand: "SolanaAddress" };

/** The FOMolt3D program address as a plain string. */
export const PROGRAM_ADDRESS: SolanaAddress =
  "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw" as SolanaAddress;

/**
 * Validate whether a string is a valid Solana base58 address.
 * Uses the same regex as the existing pubkeySchema — pure validation
 * without constructing a PublicKey object.
 */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(value: string): value is SolanaAddress {
  return BASE58_RE.test(value);
}

/**
 * Assert that a string is a valid Solana address, returning the branded type.
 * Throws if invalid.
 */
export function assertSolanaAddress(value: string): SolanaAddress {
  if (!isValidSolanaAddress(value)) {
    throw new Error(`Invalid Solana address: ${value}`);
  }
  return value;
}
