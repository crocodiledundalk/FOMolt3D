#!/usr/bin/env npx ts-node
/**
 * FOMolt3D Mainnet Configuration Script
 *
 * Reads parameters from config/mainnet.json, calls create_or_update_config,
 * then initialize_first_round to start round 1 on mainnet.
 *
 * Usage:
 *   cd app && npx ts-node scripts/configure-mainnet.ts
 *
 * Requirements:
 *   - Program already deployed to mainnet-beta
 *   - config/mainnet.json filled in (no placeholders)
 *   - DEPLOYER_KEYPAIR env var pointing to admin keypair file
 *     (defaults to ~/.config/solana/id.json)
 *   - The admin keypair must have ~0.05 SOL for account rent + tx fees
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey(
  "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
);

// --- Load config ---

interface MainnetConfig {
  network: { rpc_url: string };
  wallets: { protocol_wallet: string };
  game_parameters: {
    base_price_lamports: number;
    price_increment_lamports: number;
    timer_extension_secs: number;
    max_timer_secs: number;
  };
  fee_splits: {
    winner_bps: number;
    dividend_bps: number;
    next_round_bps: number;
    protocol_fee_bps: number;
    referral_bonus_bps: number;
  };
  authority: { deployer_keypair: string };
}

function loadConfig(): MainnetConfig {
  const configPath = path.join(__dirname, "..", "..", "config", "mainnet.json");
  if (!fs.existsSync(configPath)) {
    console.error("ERROR: config/mainnet.json not found.");
    console.error("  Please create and fill in the config file first.");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // Validate no placeholders remain
  const configStr = JSON.stringify(raw);
  if (configStr.includes("YOUR_") && configStr.includes("_HERE")) {
    console.error("ERROR: config/mainnet.json still contains placeholder values.");
    console.error("  Fill in all YOUR_*_HERE fields before running this script.");
    process.exit(1);
  }

  return raw as MainnetConfig;
}

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
  const config = loadConfig();

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          FOMolt3D MAINNET Configuration                     ║");
  console.log("║                                                              ║");
  console.log("║  This will create GlobalConfig + initialize round 1          ║");
  console.log("║  on mainnet-beta with REAL SOL.                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  // Load admin keypair
  const keypairPath =
    process.env.DEPLOYER_KEYPAIR || config.authority.deployer_keypair;
  console.log(`Loading admin keypair from: ${keypairPath}`);
  const admin = loadKeypair(keypairPath);
  console.log(`  Admin pubkey: ${admin.publicKey.toBase58()}`);

  // Protocol wallet
  const protocolWallet = new PublicKey(config.wallets.protocol_wallet);
  console.log(`  Protocol wallet: ${protocolWallet.toBase58()}`);

  // Connect to mainnet
  const rpcUrl = config.network.rpc_url;
  console.log(`  RPC: ${rpcUrl}`);
  const connection = new Connection(rpcUrl, "confirmed");

  const balance = await connection.getBalance(admin.publicKey);
  console.log(`  Admin balance: ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 50_000_000) {
    console.error("ERROR: Admin balance too low. Need at least 0.05 SOL for rent + fees.");
    process.exit(1);
  }

  // Verify program exists on-chain
  const programInfo = await connection.getAccountInfo(
    new PublicKey(PROGRAM_ID)
  );
  if (!programInfo) {
    console.error("ERROR: Program not found on mainnet. Deploy first.");
    process.exit(1);
  }
  if (!programInfo.executable) {
    console.error("ERROR: Program account exists but is not executable.");
    process.exit(1);
  }
  console.log("  Program found and executable on mainnet.");

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

  // Display parameters for review
  const params = config.game_parameters;
  const fees = config.fee_splits;
  console.log("\n  Game Parameters:");
  console.log(`    Base price:       ${params.base_price_lamports} lamports (${params.base_price_lamports / 1e9} SOL)`);
  console.log(`    Price increment:  ${params.price_increment_lamports} lamports (${params.price_increment_lamports / 1e9} SOL)`);
  console.log(`    Timer extension:  ${params.timer_extension_secs}s`);
  console.log(`    Max timer:        ${params.max_timer_secs}s (${params.max_timer_secs / 3600}h)`);
  console.log(`    Winner:           ${fees.winner_bps} bps (${fees.winner_bps / 100}%)`);
  console.log(`    Dividend:         ${fees.dividend_bps} bps (${fees.dividend_bps / 100}%)`);
  console.log(`    Next round:       ${fees.next_round_bps} bps (${fees.next_round_bps / 100}%)`);
  console.log(`    Protocol fee:     ${fees.protocol_fee_bps} bps (${fees.protocol_fee_bps / 100}%)`);
  console.log(`    Referral bonus:   ${fees.referral_bonus_bps} bps (${fees.referral_bonus_bps / 100}%)`);
  console.log(`    Protocol wallet:  ${protocolWallet.toBase58()}`);

  // Validate BPS totals
  const potTotal = fees.winner_bps + fees.dividend_bps + fees.next_round_bps;
  if (potTotal !== 10000) {
    console.error(`\nERROR: Pot splits must sum to 10000 bps, got ${potTotal}`);
    process.exit(1);
  }

  // Safety confirmation
  console.log("\n  Review the parameters above carefully.");
  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question("  Type 'yes' to proceed with mainnet configuration: ", resolve);
  });
  rl.close();

  if (answer !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }

  // --- Step 1: create_or_update_config ---
  console.log("\n=== Step 1: create_or_update_config ===");

  const existingConfig = await connection.getAccountInfo(configPda);
  if (existingConfig) {
    console.log("  GlobalConfig already exists. Will update.");
  } else {
    console.log("  GlobalConfig does not exist. Will create.");
  }

  const configParams = {
    basePriceLamports: new anchor.BN(params.base_price_lamports),
    priceIncrementLamports: new anchor.BN(params.price_increment_lamports),
    timerExtensionSecs: new anchor.BN(params.timer_extension_secs),
    maxTimerSecs: new anchor.BN(params.max_timer_secs),
    winnerBps: new anchor.BN(fees.winner_bps),
    dividendBps: new anchor.BN(fees.dividend_bps),
    nextRoundBps: new anchor.BN(fees.next_round_bps),
    protocolFeeBps: new anchor.BN(fees.protocol_fee_bps),
    referralBonusBps: new anchor.BN(fees.referral_bonus_bps),
    protocolWallet: protocolWallet,
  };

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
    console.log(`  Explorer: https://explorer.solana.com/tx/${tx1}`);
  } catch (err: any) {
    console.error("  ERROR creating config:", err.message || err);
    if (err.logs) {
      console.error("  Logs:", err.logs.join("\n    "));
    }
    process.exit(1);
  }

  // --- Step 2: initialize_first_round ---
  console.log("\n=== Step 2: initialize_first_round ===");

  const existingGame = await connection.getAccountInfo(gameStatePda);
  if (existingGame) {
    console.log("  Round 1 GameState already exists. Skipping.");
    console.log("\n=== Configuration Complete ===");
    console.log(`  Explorer: https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}`);
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
    console.log(`  Explorer: https://explorer.solana.com/tx/${tx2}`);
  } catch (err: any) {
    console.error("  ERROR initializing round:", err.message || err);
    if (err.logs) {
      console.error("  Logs:", err.logs.join("\n    "));
    }
    process.exit(1);
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Configuration Complete!                                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  Program ID:   ${PROGRAM_ID.toBase58()}`);
  console.log(`  GlobalConfig: ${configPda.toBase58()}`);
  console.log(`  GameState:    ${gameStatePda.toBase58()}`);
  console.log(`  Vault:        ${vaultPda.toBase58()}`);
  console.log(`  Explorer:     https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}`);
  console.log("\nThe game is live on mainnet! Agents can now buy keys.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
