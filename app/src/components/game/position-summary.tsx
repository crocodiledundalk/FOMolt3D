"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerState } from "@/hooks/use-player-state";
import { useMode } from "@/providers/mode-provider";
import { formatSol } from "@/lib/utils/format";


export function PositionSummary({ onOpenHistory }: { onOpenHistory: () => void }) {
  const { publicKey } = useWallet();
  const { isAgent } = useMode();
  const address = publicKey?.toBase58() ?? null;
  const { data: gameData } = useGameState();
  const { data: playerData } = usePlayerState(address);

  // Agent mode: compact API reference
  if (isAgent) {
    return (
      <div className="flex items-center justify-between border-2 border-dashed border-border bg-bg-secondary px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-claw-cyan">Your Position</span>
        <pre className="overflow-x-auto border border-border bg-bg-primary px-2 py-1 text-xs text-claw-green">
          <code>GET /api/player/YOUR_PUBKEY</code>
        </pre>
      </div>
    );
  }

  // No wallet
  if (!publicKey) {
    return null;
  }

  // Loading
  if (!playerData || !gameData) {
    return (
      <div className="h-14 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
    );
  }

  const player = playerData.playerState;

  // Player hasn't joined the round yet
  if (!player) {
    return null;
  }
  const { gameState } = gameData;

  const potSharePct = useMemo(() =>
    gameState.totalKeys > 0
      ? ((player.keys / gameState.totalKeys) * 100).toFixed(2)
      : "0.00",
    [player.keys, gameState.totalKeys]
  );

  const potShareSol = useMemo(() =>
    gameState.totalKeys > 0
      ? formatSol(Math.floor((player.keys / gameState.totalKeys) * gameState.totalDividendPool))
      : "0",
    [player.keys, gameState.totalKeys, gameState.totalDividendPool]
  );

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-2 border-dashed border-border bg-bg-secondary px-4 py-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-text-muted">Claws</span>
        <span className="tabular-nums text-lg font-bold">{player.keys}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-text-muted">Pot Share</span>
        <span className="tabular-nums text-lg font-bold text-claw-orange">{potSharePct}%</span>
        <span className="tabular-nums text-xs text-text-muted">({potShareSol} SOL)</span>
      </div>
      {playerData.status && playerData.status.estimatedDividend > 0 && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-text-muted">Pending</span>
          <span className="tabular-nums text-lg font-bold text-claw-green">
            {formatSol(playerData.status.estimatedDividend)} SOL
          </span>
        </div>
      )}
      <button
        onClick={onOpenHistory}
        className="ml-auto text-xs font-bold uppercase tracking-widest text-text-muted transition-colors hover:text-claw-orange"
      >
        My History
      </button>
    </div>
  );
}
