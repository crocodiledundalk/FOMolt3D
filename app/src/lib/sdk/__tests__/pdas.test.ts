// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  getConfigPDA,
  getGameStatePDA,
  getPlayerStatePDA,
  getVaultPDA,
  getRoundPDAs,
  PROGRAM_ID,
} from "../pdas";

describe("PDA derivation", () => {
  it("derives config PDA with correct seeds", () => {
    const [pda, bump] = getConfigPDA();
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);

    // Should be deterministic
    const [pda2] = getConfigPDA();
    expect(pda.equals(pda2)).toBe(true);
  });

  it("derives game state PDA for round 1", () => {
    const [pda, bump] = getGameStatePDA(1);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);

    // Different rounds produce different PDAs
    const [pda2] = getGameStatePDA(2);
    expect(pda.equals(pda2)).toBe(false);
  });

  it("derives player state PDA", () => {
    const player = new PublicKey(
      "AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs"
    );
    const [pda, bump] = getPlayerStatePDA(player);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);

    // Different players produce different PDAs
    const player2 = new PublicKey(
      "FfEm7xR2N8i3gmpMH2pZaM1S3VHtLq9KQEoN1XaCrYj"
    );
    const [pda2] = getPlayerStatePDA(player2);
    expect(pda.equals(pda2)).toBe(false);
  });

  it("derives vault PDA from game state PDA", () => {
    const [gameStatePDA] = getGameStatePDA(1);
    const [vaultPDA, bump] = getVaultPDA(gameStatePDA);
    expect(vaultPDA).toBeInstanceOf(PublicKey);
    expect(bump).toBeGreaterThanOrEqual(0);

    // Vault for different rounds should differ
    const [gameStatePDA2] = getGameStatePDA(2);
    const [vaultPDA2] = getVaultPDA(gameStatePDA2);
    expect(vaultPDA.equals(vaultPDA2)).toBe(false);
  });

  it("getRoundPDAs returns consistent set", () => {
    const pdas = getRoundPDAs(1);
    const [expectedGame] = getGameStatePDA(1);
    const [expectedVault] = getVaultPDA(expectedGame);

    expect(pdas.gameState.equals(expectedGame)).toBe(true);
    expect(pdas.vault.equals(expectedVault)).toBe(true);
  });

  it("round 0 and round 1 produce different PDAs", () => {
    const pdas0 = getRoundPDAs(0);
    const pdas1 = getRoundPDAs(1);
    expect(pdas0.gameState.equals(pdas1.gameState)).toBe(false);
  });

  it("uses correct program ID", () => {
    expect(PROGRAM_ID.toBase58()).toBe(
      "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw"
    );
  });

  it("handles large round numbers", () => {
    const [pda] = getGameStatePDA(999999);
    expect(pda).toBeInstanceOf(PublicKey);
  });
});
