/**
 * Network detection and public configuration.
 *
 * Derives the current Solana cluster from the RPC URL and exposes
 * only the public-facing values that agents need to submit transactions.
 */

const PUBLIC_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

/** Solana genesis hashes used for X-Blockchain-Ids (Solana Actions spec) */
const GENESIS_HASHES: Record<string, string> = {
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  testnet: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
  "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
};

export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

/** Detect the cluster from the public RPC URL. */
export function getCluster(): SolanaCluster {
  const url = PUBLIC_RPC_URL.toLowerCase();
  if (url.includes("devnet")) return "devnet";
  if (url.includes("testnet")) return "testnet";
  return "mainnet-beta";
}

/** Get the genesis hash for the current cluster. */
export function getGenesisHash(): string {
  return GENESIS_HASHES[getCluster()];
}

/** `solana:<genesis_hash>` for X-Blockchain-Ids header. */
export function getBlockchainId(): string {
  return `solana:${getGenesisHash()}`;
}

/** The public RPC URL agents should use to submit transactions. */
export function getPublicRpcUrl(): string {
  return PUBLIC_RPC_URL;
}

/** The program ID from env. */
export function getProgramId(): string {
  return (
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    process.env.PROGRAM_ID ||
    "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
  );
}
