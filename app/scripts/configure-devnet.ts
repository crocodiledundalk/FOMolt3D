#!/usr/bin/env npx ts-node
/**
 * FOMolt3D Devnet Configuration Script
 *
 * Calls create_or_update_config with default parameters, then
 * initialize_first_round to start round 1.
 *
 * Usage:
 *   cd app && npx ts-node scripts/configure-devnet.ts [--protocol-wallet <PUBKEY>]
 *
 * Requirements:
 *   - Program already deployed to devnet
 *   - DEPLOYER_KEYPAIR env var pointing to admin keypair file
 *     (defaults to ~/.config/solana/id.json)
 *   - The admin keypair must have ~0.01 SOL for account rent + tx fees
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// --- Constants matching programs/fomolt3d/src/constants.rs ---
const PROGRAM_ID = new PublicKey(
  "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
);

const DEFAULTS = {
  basePriceLamports: new anchor.BN(10_000_000), // 0.01 SOL
  priceIncrementLamports: new anchor.BN(1_000_000), // 0.001 SOL
  timerExtensionSecs: new anchor.BN(30),
  maxTimerSecs: new anchor.BN(86_400), // 24 hours
  winnerBps: new anchor.BN(4800), // 48%
  dividendBps: new anchor.BN(4500), // 45%
  nextRoundBps: new anchor.BN(700), // 7%
  protocolFeeBps: new anchor.BN(200), // 2%
  referralBonusBps: new anchor.BN(1000), // 10%
};

// --- Helpers ---

function loadKeypair(filePath: string): Keypair {
  const resolved = filePath.startsWith("~")
    ? path.join(process.env.HOME || "/home/agent", filePath.slice(1))
    : filePath;
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function findPda(seeds: Buffer[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  let protocolWalletArg: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--protocol-wallet" && args[i + 1]) {
      protocolWalletArg = args[i + 1];
      i++;
    }
  }

  // Load admin keypair
  const keypairPath =
    process.env.DEPLOYER_KEYPAIR || "~/.config/solana/id.json";
  console.log(`Loading admin keypair from: ${keypairPath}`);
  const admin = loadKeypair(keypairPath);
  console.log(`  Admin pubkey: ${admin.publicKey.toBase58()}`);

  // Protocol wallet defaults to admin if not specified
  const protocolWallet = protocolWalletArg
    ? new PublicKey(protocolWalletArg)
    : admin.publicKey;
  console.log(`  Protocol wallet: ${protocolWallet.toBase58()}`);

  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(admin.publicKey);
  console.log(`  Admin balance: ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 10_000_000) {
    console.error(
      "ERROR: Admin balance too low. Need at least 0.01 SOL for rent + fees."
    );
    process.exit(1);
  }

  // Set up Anchor provider
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load IDL
  const idlPath = path.join(__dirname, "..", "src", "lib", "idl.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [configPda] = findPda([Buffer.from("config")], PROGRAM_ID);
  console.log(`\n  GlobalConfig PDA: ${configPda.toBase58()}`);

  const roundBytes = Buffer.alloc(8);
  roundBytes.writeBigUInt64LE(1n);
  const [gameStatePda] = findPda(
    [Buffer.from("game"), roundBytes],
    PROGRAM_ID
  );
  console.log(`  GameState PDA (round 1): ${gameStatePda.toBase58()}`);

  const [vaultPda] = findPda(
    [Buffer.from("vault"), gameStatePda.toBuffer()],
    PROGRAM_ID
  );
  console.log(`  Vault PDA: ${vaultPda.toBase58()}`);

  // --- Step 1: create_or_update_config ---
  console.log("\n=== Step 1: create_or_update_config ===");

  // Check if config already exists
  const existingConfig = await connection.getAccountInfo(configPda);
  if (existingConfig) {
    console.log("  GlobalConfig already exists. Will update.");
  } else {
    console.log("  GlobalConfig does not exist. Will create.");
  }

  const configParams = {
    basePriceLamports: DEFAULTS.basePriceLamports,
    priceIncrementLamports: DEFAULTS.priceIncrementLamports,
    timerExtensionSecs: DEFAULTS.timerExtensionSecs,
    maxTimerSecs: DEFAULTS.maxTimerSecs,
    winnerBps: DEFAULTS.winnerBps,
    dividendBps: DEFAULTS.dividendBps,
    nextRoundBps: DEFAULTS.nextRoundBps,
    protocolFeeBps: DEFAULTS.protocolFeeBps,
    referralBonusBps: DEFAULTS.referralBonusBps,
    protocolWallet: protocolWallet,
  };

  console.log("  Params:", {
    basePriceLamports: "10,000,000 (0.01 SOL)",
    priceIncrementLamports: "1,000,000 (0.001 SOL)",
    timerExtensionSecs: 30,
    maxTimerSecs: "86,400 (24h)",
    winnerBps: "4800 (48%)",
    dividendBps: "4500 (45%)",
    nextRoundBps: "700 (7%)",
    protocolFeeBps: "200 (2%)",
    referralBonusBps: "1000 (10%)",
    protocolWallet: protocolWallet.toBase58(),
  });

  try {
    const tx1 = await (program.methods as any)
      .createOrUpdateConfig(configParams)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    console.log(`  TX: ${tx1}`);
    console.log(
      `  Explorer: https://explorer.solana.com/tx/${tx1}?cluster=devnet`
    );
  } catch (err: any) {
    console.error("  ERROR creating config:", err.message || err);
    if (err.logs) {
      console.error("  Logs:", err.logs.join("\n    "));
    }
    process.exit(1);
  }

  // --- Step 2: initialize_first_round ---
  console.log("\n=== Step 2: initialize_first_round ===");

  // Check if round 1 already exists
  const existingGame = await connection.getAccountInfo(gameStatePda);
  if (existingGame) {
    console.log("  Round 1 GameState already exists. Skipping.");
    console.log("\n=== Configuration Complete ===");
    console.log(
      `  Explorer: https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`
    );
    return;
  }

  try {
    const tx2 = await (program.methods as any)
      .initializeFirstRound()
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        gameState: gameStatePda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    console.log(`  TX: ${tx2}`);
    console.log(
      `  Explorer: https://explorer.solana.com/tx/${tx2}?cluster=devnet`
    );
  } catch (err: any) {
    console.error("  ERROR initializing round:", err.message || err);
    if (err.logs) {
      console.error("  Logs:", err.logs.join("\n    "));
    }
    process.exit(1);
  }

  console.log("\n=== Configuration Complete ===");
  console.log(`  Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`  GlobalConfig: ${configPda.toBase58()}`);
  console.log(`  GameState (R1): ${gameStatePda.toBase58()}`);
  console.log(`  Vault (R1): ${vaultPda.toBase58()}`);
  console.log(
    `  Explorer: https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`
  );
  console.log("\nThe game is live! Agents can now buy keys.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
