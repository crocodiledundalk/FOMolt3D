"use client";

import { useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "@/lib/idl-types";
import type { OnChainGameState } from "@/lib/sdk/types";
import {
  findCurrentRound,
  fetchGameState,
  fetchVaultBalance,
} from "@/lib/sdk/accounts";
import {
  buildInitializeFirstRound,
  buildStartNewRound,
} from "@/lib/sdk/instructions";
import { formatSol, formatTimestamp, formatTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface RoundPanelProps {
  program: Program<Fomolt3d>;
}

export function RoundPanel({ program }: RoundPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: currentRoundData, isLoading } = useQuery({
    queryKey: ["adminCurrentRound"],
    queryFn: () => findCurrentRound(program),
    refetchInterval: 5_000,
  });

  const round = currentRoundData?.round ?? null;
  const gameState = currentRoundData?.gameState ?? null;

  const { data: vaultBalance } = useQuery({
    queryKey: ["adminVaultBalance", round],
    queryFn: () => fetchVaultBalance(connection, round!),
    enabled: round !== null,
    refetchInterval: 5_000,
  });

  // Scan for round history (rounds 1..current)
  const { data: roundHistory } = useQuery({
    queryKey: ["adminRoundHistory", round],
    queryFn: async () => {
      if (!round) return [];
      const history: { round: number; gameState: OnChainGameState }[] = [];
      for (let r = 1; r <= round; r++) {
        const gs = await fetchGameState(program, r);
        if (gs) history.push({ round: r, gameState: gs });
      }
      return history;
    },
    enabled: round !== null && round > 0,
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["adminCurrentRound"] });
    await queryClient.invalidateQueries({ queryKey: ["adminRoundHistory"] });
    await queryClient.invalidateQueries({ queryKey: ["adminVaultBalance"] });
    await queryClient.invalidateQueries({ queryKey: ["gameState"] });
  };

  const handleInitializeFirstRound = async () => {
    if (!publicKey) return;
    setSubmitting(true);
    try {
      const ix = await buildInitializeFirstRound(program, publicKey);
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      toast.success("Round 1 initialized", {
        description: `tx: ${sig.slice(0, 8)}...`,
      });
      await invalidateAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Initialize failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNewRound = async () => {
    if (!publicKey || !round) return;
    setSubmitting(true);
    try {
      const ix = await buildStartNewRound(
        program,
        publicKey,
        round,
        round + 1
      );
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      toast.success(`Round ${round + 1} started`, {
        description: `tx: ${sig.slice(0, 8)}...`,
      });
      await invalidateAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Start new round failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const nowSecs = Math.floor(Date.now() / 1000);
  const timerRemaining = gameState
    ? Math.max(0, gameState.timerEnd - nowSecs)
    : 0;

  const canStartNewRound =
    gameState && !gameState.active && gameState.winnerClaimed;

  return (
    <section className="border-2 border-dashed border-border bg-bg-secondary p-4 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-claw-orange">
        Round Management
      </h2>

      {isLoading && (
        <p className="text-xs text-text-muted animate-pulse">
          Scanning rounds...
        </p>
      )}

      {/* No rounds exist */}
      {!isLoading && !gameState && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            No rounds found. Initialize round 1 to start the game.
          </p>
          <button
            onClick={handleInitializeFirstRound}
            disabled={submitting}
            className="border-2 border-claw-green/50 bg-claw-green/10 px-4 py-2 text-sm font-bold text-claw-green transition-colors hover:bg-claw-green/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Initializing..." : "Initialize Round 1"}
          </button>
        </div>
      )}

      {/* Current round stats */}
      {gameState && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCell label="Round" value={`#${gameState.round}`} />
            <StatCell
              label="Status"
              value={gameState.active ? "Active" : "Ended"}
              highlight={gameState.active ? "green" : "red"}
            />
            <StatCell
              label="Pot"
              value={`${formatSol(gameState.potLamports)} SOL`}
            />
            <StatCell
              label="Vault Balance"
              value={
                vaultBalance !== undefined
                  ? `${formatSol(vaultBalance)} SOL`
                  : "..."
              }
            />
            <StatCell
              label="Timer"
              value={
                gameState.active
                  ? formatTime(timerRemaining)
                  : "Expired"
              }
            />
            <StatCell label="Total Keys" value={String(gameState.totalKeys)} />
            <StatCell
              label="Total Players"
              value={String(gameState.totalPlayers)}
            />
            <StatCell
              label="Winner Claimed"
              value={gameState.winnerClaimed ? "Yes" : "No"}
            />
            <StatCell
              label="Winner Pot"
              value={`${formatSol(gameState.winnerPot)} SOL`}
            />
            <StatCell
              label="Dividend Pool"
              value={`${formatSol(gameState.totalDividendPool)} SOL`}
            />
            <StatCell
              label="Next Round Pot"
              value={`${formatSol(gameState.nextRoundPot)} SOL`}
            />
            <StatCell
              label="Round Start"
              value={formatTimestamp(gameState.roundStart)}
            />
          </div>

          {/* Start New Round action */}
          {!gameState.active && (
            <div className="border-t border-dashed border-border pt-3">
              {canStartNewRound ? (
                <button
                  onClick={handleStartNewRound}
                  disabled={submitting}
                  className="border-2 border-claw-green/50 bg-claw-green/10 px-4 py-2 text-sm font-bold text-claw-green transition-colors hover:bg-claw-green/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Starting..."
                    : `Start Round ${round! + 1}`}
                </button>
              ) : (
                <p className="text-xs text-text-muted">
                  Cannot start new round &mdash; winner must claim first.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Round history table */}
      {roundHistory && roundHistory.length > 1 && (
        <div className="space-y-2 border-t border-dashed border-border pt-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Round History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="px-2 py-1 text-left">Round</th>
                  <th className="px-2 py-1 text-right">Pot</th>
                  <th className="px-2 py-1 text-right">Keys</th>
                  <th className="px-2 py-1 text-right">Players</th>
                  <th className="px-2 py-1 text-center">Status</th>
                  <th className="px-2 py-1 text-center">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {roundHistory.map((rh) => (
                  <tr key={rh.round} className="border-b border-border/50">
                    <td className="px-2 py-1 tabular-nums">#{rh.round}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatSol(rh.gameState.potLamports)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {rh.gameState.totalKeys}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {rh.gameState.totalPlayers}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span
                        className={
                          rh.gameState.active
                            ? "text-claw-green"
                            : "text-text-muted"
                        }
                      >
                        {rh.gameState.active ? "Active" : "Ended"}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      {rh.gameState.winnerClaimed ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red";
}) {
  const colorClass =
    highlight === "green"
      ? "text-claw-green"
      : highlight === "red"
        ? "text-red-400"
        : "";
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`tabular-nums text-sm font-medium ${colorClass}`}>
        {value}
      </p>
    </div>
  );
}
