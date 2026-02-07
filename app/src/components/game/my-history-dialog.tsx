"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerState } from "@/hooks/use-player-state";
import { useGameEvents } from "@/hooks/use-game-events";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { formatSol, formatAddress, formatRelativeTime } from "@/lib/utils/format";
import { WalletConnect } from "@/components/wallet/wallet-connect";

const eventBadge: Record<string, { label: string; className: string }> = {
  BUY: { label: "GRAB", className: "bg-claw-orange/15 text-claw-orange border border-claw-orange/30" },
  CLAIM: { label: "CLAIM", className: "bg-claw-green/15 text-claw-green border border-claw-green/30" },
  WIN: { label: "WIN", className: "bg-claw-gold/15 text-claw-gold border border-claw-gold/30" },
  ROUND_START: { label: "START", className: "bg-claw-purple/15 text-claw-purple border border-claw-purple/30" },
};

function HistoryContent({ onClose }: { onClose: () => void }) {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58() ?? null;
  const { data: gameData } = useGameState();
  const { data: playerData } = usePlayerState(address);
  const { events: allEvents } = useGameEvents();

  if (!publicKey || !address) {
    return (
      <div className="pitch-dialog-content relative max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto border-2 border-border bg-bg-primary p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-border text-text-muted transition-colors hover:border-claw-orange hover:text-claw-orange"
          aria-label="Close"
        >&#x2715;</button>
        <h2 id="history-dialog-title" className="mb-4 text-lg font-bold text-text-primary">My History</h2>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-text-secondary">Connect a wallet to view your history.</p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  const player = playerData?.playerState;
  const status = playerData?.status;
  const gameState = gameData?.gameState;

  // Filter SSE events for this player
  const myEvents = useMemo(
    () => allEvents.filter((e) => e.player === address),
    [allEvents, address]
  );

  const estimatedDividend = status?.estimatedDividend ?? 0;
  const unclaimedReferral = player
    ? player.referralEarningsLamports - player.claimedReferralEarningsLamports
    : 0;

  const potSharePct = useMemo(() =>
    gameState && gameState.totalKeys > 0 && player
      ? ((player.keys / gameState.totalKeys) * 100).toFixed(2)
      : "0.00",
    [player?.keys, gameState?.totalKeys]
  );

  return (
    <div className="pitch-dialog-content relative max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto border-2 border-border bg-bg-primary p-6">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-border text-text-muted transition-colors hover:border-claw-orange hover:text-claw-orange"
        aria-label="Close"
      >&#x2715;</button>

      <h2 id="history-dialog-title" className="mb-1 text-lg font-bold text-text-primary">My History</h2>
      <p className="mb-5 tabular-nums text-xs text-text-muted">{formatAddress(address)}</p>

      {/* Holdings summary */}
      {player && gameState && (
        <div className="mb-5 border-2 border-dashed border-border bg-bg-secondary p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
            Current Holdings
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-text-muted">Claws</span>
              <p className="tabular-nums text-xl font-bold">{player.keys}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Pool Share</span>
              <p className="tabular-nums text-xl font-bold">{potSharePct}%</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Pending Dividends</span>
              <p className="tabular-nums font-bold text-claw-green">
                {formatSol(estimatedDividend)} SOL
              </p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Pending Referrals</span>
              <p className="tabular-nums font-bold text-claw-green">
                {formatSol(unclaimedReferral)} SOL
              </p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Total Earned</span>
              <p className="tabular-nums">
                {formatSol(
                  player.claimedDividendsLamports +
                  estimatedDividend +
                  player.claimedReferralEarningsLamports +
                  unclaimedReferral
                )} SOL
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action history from SSE events */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
          Recent Activity
        </h3>
        {myEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            No activity yet this session. Events appear as they happen live.
          </p>
        ) : (
          <div className="space-y-1">
            {myEvents.map((e) => {
              const badge = eventBadge[e.type] ?? { label: e.type, className: "bg-border text-text-secondary" };
              return (
                <div key={e.id} className="flex items-center gap-3 border-b border-border/30 px-2 py-2 text-sm last:border-0">
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-bold ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="tabular-nums">{formatSol(e.amount)} SOL</span>
                  {e.keys && <span className="tabular-nums text-text-muted">({e.keys} claws)</span>}
                  <span className="ml-auto tabular-nums text-xs text-text-muted">
                    {formatRelativeTime(e.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function MyHistoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(open);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "pitch-backdrop-exit" : "pitch-backdrop-enter"}`}
      onClick={(e) => {
        if (e.target === backdropRef.current) handleClose();
      }}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-dialog-title"
        className={closing ? "pitch-dialog-exit" : "pitch-dialog-enter"}
      >
        <HistoryContent onClose={handleClose} />
      </div>
    </div>
  );
}

export function MyHistoryTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium uppercase tracking-widest text-text-muted transition-colors hover:text-claw-orange"
    >
      My History
    </button>
  );
}
