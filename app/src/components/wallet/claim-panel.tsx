"use client";

import { useState, useCallback } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerState } from "@/hooks/use-player-state";
import { useAnchorProgram } from "@/hooks/use-anchor-program";
import { findCurrentRound, fetchPlayerState } from "@/lib/sdk/accounts";
import { buildSmartClaim } from "@/lib/sdk/composites";
import { formatSol } from "@/lib/utils/format";
import { parseProgramError } from "@/lib/sdk/errors";
import { toast } from "sonner";

export function ClaimPanel() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const address = publicKey?.toBase58() ?? null;
  const { data: gameData } = useGameState();
  const { data: playerData } = usePlayerState(address);
  const anchor = useAnchorProgram();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const status = playerData?.status;
  const gameState = gameData?.gameState;
  const phase = gameData?.phase;

  const roundEnded = phase === "ended" || phase === "claiming";
  const isWinner =
    status?.isWinner &&
    gameState &&
    !gameState.winnerClaimed &&
    publicKey?.toBase58() === gameState.lastBuyer;

  const canClaimDividends = roundEnded && status && status.estimatedDividend > 0;
  const canClaimWinner = roundEnded && isWinner;
  const canClaim = canClaimDividends || canClaimWinner;

  const handleClaim = useCallback(async () => {
    if (!publicKey || !anchor) return;
    setClaiming(true);
    try {
      const roundResult = await findCurrentRound(anchor.program);
      if (!roundResult) {
        toast.error("No round found");
        return;
      }

      const onChainPlayerState = await fetchPlayerState(anchor.program, publicKey);
      const ixs = await buildSmartClaim(
        anchor.program,
        publicKey,
        roundResult.gameState,
        onChainPlayerState
      );

      if (!ixs) {
        toast.error("Nothing to claim", {
          description: "Round is still active or you have no pending scraps.",
        });
        return;
      }

      const tx = new Transaction().add(...ixs);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      toast.success("Claimed successfully", {
        description: `tx: ${sig.slice(0, 8)}...`,
      });

      await queryClient.invalidateQueries({ queryKey: ["gameState"] });
      await queryClient.invalidateQueries({ queryKey: ["playerState"] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (err: unknown) {
      const programErr = parseProgramError(err);
      const msg = programErr
        ? `${programErr.name}: ${programErr.message}`
        : err instanceof Error
          ? err.message
          : "Claim failed";
      toast.error("Claim failed", { description: msg });
    } finally {
      setClaiming(false);
    }
  }, [publicKey, anchor, connection, sendTransaction, queryClient]);

  // Don't render if wallet not connected or nothing to claim
  if (!publicKey || !playerData || !gameData) return null;
  if (!canClaim) return null;

  return (
    <div className="space-y-3">
      {/* Winner Prize Claim */}
      {canClaimWinner && gameState && (
        <div className="border-2 border-claw-orange bg-claw-orange/10 p-4 glow-orange">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-claw-orange">
                You Won!
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                You were the last claw grabber. Claim your winner prize.
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="border-2 border-claw-orange bg-claw-orange/20 px-5 py-2.5 text-sm font-bold text-claw-orange transition-colors hover:bg-claw-orange/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {claiming
                ? "Claiming..."
                : `Claim ${formatSol(gameState.winnerPot)} SOL`}
            </button>
          </div>
        </div>
      )}

      {/* Dividend Claim */}
      {canClaimDividends && !canClaimWinner && status && (
        <div className="border-2 border-claw-green/30 bg-bg-secondary p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-claw-green">
                Harvest Scraps
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Molt has ended. Claim your accumulated dividend scraps.
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="border-2 border-claw-green bg-claw-green/10 px-5 py-2.5 text-sm font-bold text-claw-green transition-colors hover:bg-claw-green/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {claiming
                ? "Claiming..."
                : `Claim ~${formatSol(status.estimatedDividend)} SOL`}
            </button>
          </div>
        </div>
      )}

      {/* Note: When canClaimWinner is true, the claim instruction already claims
          both winner prize AND dividends in one tx via buildSmartClaim */}
    </div>
  );
}
