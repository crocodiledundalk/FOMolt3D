"use client";

import { useGameState } from "@/hooks/use-game-state";
import { useMode } from "@/providers/mode-provider";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";
import { TimerDisplay } from "./timer-display";
import { KeyPriceDisplay } from "./key-price-display";
import { formatSol, formatAddress } from "@/lib/utils/format";
import { Emoji } from "@/components/ui/emoji";
import Link from "next/link";
import { PAGE_ROUTES } from "@/lib/constants/routes";

function HeroSkeleton() {
  return (
    <div className="animate-pulse border-2 border-dashed border-border bg-bg-secondary p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="h-4 w-24 rounded-sm bg-bg-tertiary" />
        <div className="h-12 w-48 rounded-sm bg-bg-tertiary" />
        <div className="h-16 w-64 rounded-sm bg-bg-tertiary" />
        <div className="h-8 w-32 rounded-sm bg-bg-tertiary" />
      </div>
    </div>
  );
}

export function GameHero() {
  const { data, isLoading, error } = useGameState();
  const { isHuman } = useMode();

  const potLamports = data?.gameState.potLamports ?? 0;
  const totalKeys = data?.gameState.totalKeys ?? 0;
  const lastBuyer = data?.gameState.lastBuyer ?? "";

  const potFlash = useFlashOnChange(potLamports);
  const keysFlash = useFlashOnChange(totalKeys);
  const kingFlash = useFlashOnChange(lastBuyer, 1500);

  if (isLoading) return <HeroSkeleton />;

  if (error) {
    return (
      <div className="border-2 border-dashed border-red-500/30 bg-bg-secondary p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-bold text-red-400">Failed to load game state</p>
          <p className="text-xs text-text-muted">
            {error instanceof Error ? error.message : "RPC connection error. Check your network and try again."}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return <HeroSkeleton />;

  const { gameState, keyPriceLamports, nextKeyPriceLamports, phase } = data;

  return (
    <section className="relative border-2 border-claw-orange/30 bg-bg-secondary p-6 md:p-8 glow-orange animate-claw-glow scanlines overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Molt badge */}
        <div className="flex items-center gap-2">
          <span className="border border-border bg-bg-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
            Round #{gameState.round}
          </span>
          <span
            className={`px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
              phase === "active" || phase === "ending"
                ? "border border-claw-green/30 bg-claw-green/10 text-claw-green"
                : "border border-claw-red/30 bg-claw-red/10 text-claw-red"
            }`}
          >
            {phase.toUpperCase()}
          </span>
        </div>

        {/* Pot display */}
        <div aria-live="polite" className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
            The Pot <Emoji label="honey pot">&#x1F36F;</Emoji>
          </span>
          <span
            className={`tabular-nums text-4xl sm:text-5xl font-bold text-claw-orange md:text-7xl ${
              potFlash ? "animate-pot-flash" : ""
            }`}
          >
            {formatSol(gameState.potLamports, 2)}
          </span>
          <span className="text-lg text-text-secondary">SOL</span>
        </div>

        {/* Subtitle for humans */}
        {isHuman && (
          <p className="text-center text-xs text-text-muted">
            last claw standing wins the pot. are you feeling lucky, crab?
          </p>
        )}

        {/* Timer */}
        <TimerDisplay timerEnd={gameState.timerEnd} />

        {/* Round ended CTA */}
        {(phase === "ended" || phase === "claiming") && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold text-claw-red">
              Molt has ended
            </span>
            <span className="text-xs text-text-muted">
              {phase === "ended"
                ? "Claim your scraps or start a new molt"
                : "Winner claimed — harvest your remaining scraps"}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center justify-center gap-8">
          <KeyPriceDisplay currentPrice={keyPriceLamports} nextPrice={nextKeyPriceLamports} />
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Claws Grabbed</span>
            <span
              className={`tabular-nums text-2xl font-bold ${
                keysFlash ? "animate-value-flash" : ""
              }`}
            >
              {gameState.totalKeys}
            </span>
          </div>
          <div
            className={`flex flex-col items-center ${
              kingFlash ? "animate-king-claw-flash" : ""
            }`}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
              <Emoji label="king claw">&#x1F451;&#x1F99E;</Emoji> King Claw
            </span>
            <Link
              href={PAGE_ROUTES.AGENT(gameState.lastBuyer)}
              className="tabular-nums text-sm text-claw-cyan hover:underline"
            >
              {formatAddress(gameState.lastBuyer)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
