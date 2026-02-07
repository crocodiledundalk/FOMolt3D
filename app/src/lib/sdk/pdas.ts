import { PublicKey } from "@solana/web3.js";
import type { RoundPDAs } from "./types";

export const PROGRAM_ID = new PublicKey(
  "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
);

const SEED_CONFIG = Buffer.from("config");
const SEED_GAME = Buffer.from("game");
const SEED_PLAYER = Buffer.from("player");
const SEED_VAULT = Buffer.from("vault");

/** Encode a u64 as 8-byte little-endian buffer. */
function roundToSeed(round: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(round));
  return buf;
}

/** Derive the GlobalConfig PDA: seeds = ["config"] */
export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEED_CONFIG], PROGRAM_ID);
}

/** Derive the GameState PDA: seeds = ["game", round.to_le_bytes()] */
export function getGameStatePDA(round: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_GAME, roundToSeed(round)],
    PROGRAM_ID
  );
}

/** Derive the PlayerState PDA: seeds = ["player", player_pubkey] */
export function getPlayerStatePDA(player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_PLAYER, player.toBuffer()],
    PROGRAM_ID
  );
}

/** Derive the Vault PDA: seeds = ["vault", game_state_pda] */
export function getVaultPDA(gameStatePDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_VAULT, gameStatePDA.toBuffer()],
    PROGRAM_ID
  );
}

/** Get all PDAs for a given round. */
export function getRoundPDAs(round: number): RoundPDAs {
  const [gameState, gameStateBump] = getGameStatePDA(round);
  const [vault, vaultBump] = getVaultPDA(gameState);
  return { gameState, gameStateBump, vault, vaultBump };
}
