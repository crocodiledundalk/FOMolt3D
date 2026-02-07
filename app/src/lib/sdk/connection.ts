import { Connection, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "../idl-types";
import idl from "../idl.json";
import { PROGRAM_ID } from "./pdas";

// Server-only RPC_URL (not bundled into client JS) takes priority,
// then public NEXT_PUBLIC_RPC_URL for client-side, then devnet fallback.
const DEFAULT_RPC_URL =
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");

const DEFAULT_COMMITMENT = "confirmed" as const;

/** Create a Solana connection. Uses env var or devnet by default. */
export function getConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl ?? DEFAULT_RPC_URL, DEFAULT_COMMITMENT);
}

/**
 * Create an Anchor Program instance for read-only operations (no wallet).
 * Used by API routes and server-side code.
 */
export function getReadOnlyProgram(
  connection?: Connection
): Program<Fomolt3d> {
  const conn = connection ?? getConnection();
  // Anchor 0.31+ supports creating a Program with just a connection
  // by providing a minimal provider with no wallet
  const provider = {
    connection: conn,
    publicKey: PROGRAM_ID, // placeholder, not used for reads
  } as unknown as AnchorProvider;

  return new Program<Fomolt3d>(idl as unknown as Fomolt3d, provider);
}

/**
 * Create an Anchor Program instance with a full provider (for signing).
 * Used by frontend code with a connected wallet.
 */
export function getProgram(provider: AnchorProvider): Program<Fomolt3d> {
  return new Program<Fomolt3d>(idl as unknown as Fomolt3d, provider);
}

export { PROGRAM_ID, DEFAULT_RPC_URL, DEFAULT_COMMITMENT };
