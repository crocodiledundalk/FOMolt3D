"use client";

import { useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameState } from "@/hooks/use-game-state";
import { useAnchorProgram } from "@/hooks/use-anchor-program";
import { buildStartNewRound } from "@/lib/sdk/instructions";
import { formatSol } from "@/lib/utils/format";
import { parseProgramError } from "@/lib/sdk/errors";
import { toast } from "sonner";

export function StartNewRoundPanel() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { data: gameData } = useGameState();
  const anchor = useAnchorProgram();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const phase = gameData?.phase;
  const gameState = gameData?.gameState;

  // Only show when round has ended
  if (!publicKey || !gameData || !gameState) return null;
  if (phase !== "ended" && phase !== "claiming") return null;

  const nextRound = gameState.round + 1;

  const handleStartNewRound = async () => {
    if (!publicKey || !anchor || !gameState) return;
    setSubmitting(true);
    try {
      const ix = await buildStartNewRound(
        anchor.program,
        publicKey,
        gameState.round,
        nextRound
      );
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      toast.success(`Round #${nextRound} started`, {
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
          : "Start new round failed";
      toast.error("Start new round failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-cyan-400/30 bg-cyan-400/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            Start New Round
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Round #{gameState.round} has ended.{" "}
            {gameState.nextRoundPot > 0
              ? `${formatSol(gameState.nextRoundPot)} SOL carries over.`
              : "Start a fresh round."}
          </p>
        </div>
        <button
          onClick={handleStartNewRound}
          disabled={submitting}
          className="border-2 border-cyan-400 bg-cyan-400/10 px-5 py-2.5 text-sm font-bold text-cyan-400 transition-colors hover:bg-cyan-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Starting..." : `Start Round #${nextRound}`}
        </button>
      </div>
    </div>
  );
}
