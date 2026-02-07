"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useGameState } from "@/hooks/use-game-state";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";
import { formatSol } from "@/lib/utils/format";


export function KingClawBanner() {
  const { publicKey } = useWallet();
  const { data } = useGameState();

  const potLamports = data?.gameState.potLamports ?? 0;
  const potFlash = useFlashOnChange(potLamports);

  if (!publicKey || !data) return null;

  const address = publicKey.toBase58();
  const { gameState } = data;
  const isKingClaw = gameState.lastBuyer === address && gameState.active;

  if (!isKingClaw) return null;

  const prizeSol = formatSol(gameState.winnerPot, 4);

  return (
    <section className="relative overflow-hidden border-2 border-claw-gold/50 bg-bg-secondary p-5 animate-claw-glow scanlines">
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl animate-bounce-scale">&#x1F451;</span>
          <span className="text-3xl">&#x1F99E;</span>
          <span className="text-3xl animate-bounce-scale">&#x1F451;</span>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-claw-gold md:text-2xl">
          You Are The King Claw
        </h2>
        <p className="text-sm text-text-secondary">
          if the timer hits zero right now, you win
        </p>
        <p
          className={`tabular-nums text-3xl font-bold text-claw-gold md:text-4xl ${
            potFlash ? "animate-pot-flash" : ""
          }`}
        >
          {prizeSol} SOL
        </p>
        <p className="text-xs text-text-muted">
          hold your position. don&apos;t let anyone take the crown.
        </p>
      </div>
    </section>
  );
}
