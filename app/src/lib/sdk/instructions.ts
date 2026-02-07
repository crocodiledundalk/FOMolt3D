import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "../idl-types";
import {
  getConfigPDA,
  getGameStatePDA,
  getPlayerStatePDA,
  getVaultPDA,
} from "./pdas";

// ─── Buy Keys ───────────────────────────────────────────────────────

export async function buildBuyKeys(
  program: Program<Fomolt3d>,
  buyer: PublicKey,
  round: number,
  keysToBuy: number,
  isAgent: boolean,
  protocolWallet: PublicKey,
  referrer?: PublicKey
): Promise<TransactionInstruction> {
  const [gameStatePDA] = getGameStatePDA(round);
  const [playerStatePDA] = getPlayerStatePDA(buyer);
  const [vaultPDA] = getVaultPDA(gameStatePDA);

  return program.methods
    .buyKeys(new BN(keysToBuy), isAgent)
    .accountsStrict({
      buyer,
      gameState: gameStatePDA,
      playerState: playerStatePDA,
      vault: vaultPDA,
      protocolWallet,
      referrerState: referrer ? getPlayerStatePDA(referrer)[0] : null,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── Claim (dividends + winner prize) ───────────────────────────────

export async function buildClaim(
  program: Program<Fomolt3d>,
  player: PublicKey,
  round: number
): Promise<TransactionInstruction> {
  const [gameStatePDA] = getGameStatePDA(round);
  const [playerStatePDA] = getPlayerStatePDA(player);
  const [vaultPDA] = getVaultPDA(gameStatePDA);

  return program.methods
    .claim()
    .accountsStrict({
      player,
      gameState: gameStatePDA,
      playerState: playerStatePDA,
      vault: vaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── Claim Referral Earnings ────────────────────────────────────────

export async function buildClaimReferralEarnings(
  program: Program<Fomolt3d>,
  player: PublicKey,
  round: number
): Promise<TransactionInstruction> {
  const [gameStatePDA] = getGameStatePDA(round);
  const [playerStatePDA] = getPlayerStatePDA(player);
  const [vaultPDA] = getVaultPDA(gameStatePDA);

  return program.methods
    .claimReferralEarnings()
    .accountsStrict({
      player,
      gameState: gameStatePDA,
      playerState: playerStatePDA,
      vault: vaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── Start New Round ────────────────────────────────────────────────

export async function buildStartNewRound(
  program: Program<Fomolt3d>,
  payer: PublicKey,
  prevRound: number,
  newRound: number
): Promise<TransactionInstruction> {
  const [configPDA] = getConfigPDA();
  const [prevGameStatePDA] = getGameStatePDA(prevRound);
  const [newGameStatePDA] = getGameStatePDA(newRound);
  const [prevVaultPDA] = getVaultPDA(prevGameStatePDA);
  const [newVaultPDA] = getVaultPDA(newGameStatePDA);

  return program.methods
    .startNewRound()
    .accountsStrict({
      payer,
      config: configPDA,
      prevGameState: prevGameStatePDA,
      newGameState: newGameStatePDA,
      prevVault: prevVaultPDA,
      newVault: newVaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── Admin: Create or Update Config ─────────────────────────────────

export interface ConfigParams {
  basePriceLamports: number;
  priceIncrementLamports: number;
  timerExtensionSecs: number;
  maxTimerSecs: number;
  winnerBps: number;
  dividendBps: number;
  nextRoundBps: number;
  protocolFeeBps: number;
  referralBonusBps: number;
  protocolWallet: PublicKey;
}

export async function buildCreateOrUpdateConfig(
  program: Program<Fomolt3d>,
  admin: PublicKey,
  params: ConfigParams
): Promise<TransactionInstruction> {
  const [configPDA] = getConfigPDA();

  return program.methods
    .createOrUpdateConfig({
      basePriceLamports: new BN(params.basePriceLamports),
      priceIncrementLamports: new BN(params.priceIncrementLamports),
      timerExtensionSecs: new BN(params.timerExtensionSecs),
      maxTimerSecs: new BN(params.maxTimerSecs),
      winnerBps: new BN(params.winnerBps),
      dividendBps: new BN(params.dividendBps),
      nextRoundBps: new BN(params.nextRoundBps),
      protocolFeeBps: new BN(params.protocolFeeBps),
      referralBonusBps: new BN(params.referralBonusBps),
      protocolWallet: params.protocolWallet,
    })
    .accountsStrict({
      admin,
      config: configPDA,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── Admin: Initialize First Round ──────────────────────────────────

export async function buildInitializeFirstRound(
  program: Program<Fomolt3d>,
  admin: PublicKey
): Promise<TransactionInstruction> {
  const [configPDA] = getConfigPDA();
  // First round is always round 1
  const [gameStatePDA] = getGameStatePDA(1);
  const [vaultPDA] = getVaultPDA(gameStatePDA);

  return program.methods
    .initializeFirstRound()
    .accountsStrict({
      admin,
      config: configPDA,
      gameState: gameStatePDA,
      vault: vaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}
