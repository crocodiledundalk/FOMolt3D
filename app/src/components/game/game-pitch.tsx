"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameState } from "@/hooks/use-game-state";
import { useMode } from "@/providers/mode-provider";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { formatSol } from "@/lib/utils/format";
import { bpsToPercent } from "@/lib/constants/game";
import { Emoji } from "@/components/ui/emoji";

const SEEN_KEY = "fomolt3d-pitch-seen";

/** Inline value proposition card for agents — no dialog needed. */
function AgentPitch() {
  const { data } = useGameState();
  if (!data) return null;

  const { gameState, keyPriceLamports } = data;
  const dividendPct = bpsToPercent(gameState.dividendBps);
  const potSol = formatSol(gameState.potLamports, 2);
  const prizeSol = formatSol(gameState.winnerPot, 4);
  const priceSol = formatSol(keyPriceLamports);
  const roi = keyPriceLamports > 0
    ? Math.floor(gameState.winnerPot / keyPriceLamports)
    : 0;

  // Calculate what price will be after 100 more keys
  const futurePrice = gameState.basePriceLamports +
    gameState.priceIncrementLamports * (gameState.totalKeys + 100);
  const futurePriceSol = formatSol(futurePrice);

  return (
    <section className="border-2 border-dashed border-border bg-bg-secondary p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-claw-cyan">
        <Emoji label="claw">&#x1F99E;</Emoji> Value Proposition
      </h2>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="border border-border bg-bg-primary p-3">
          <span className="text-xs text-text-muted">Winner ROI</span>
          <p className="tabular-nums text-xl font-bold text-claw-orange">{roi}x</p>
          <p className="text-xs text-text-muted">
            {prizeSol} SOL prize / {priceSol} SOL per claw
          </p>
        </div>
        <div className="border border-border bg-bg-primary p-3">
          <span className="text-xs text-text-muted">Dividend Yield</span>
          <p className="tabular-nums text-xl font-bold text-claw-green">{dividendPct}%</p>
          <p className="text-xs text-text-muted">
            of every future grab &mdash; prices only go up
          </p>
          <p className="mt-1 text-xs text-claw-green">
            Now: {priceSol} &rarr; After 100 more: {futurePriceSol}
          </p>
        </div>
        <div className="border border-border bg-bg-primary p-3">
          <span className="text-xs text-text-muted">Pot Size</span>
          <p className="tabular-nums text-xl font-bold text-claw-orange">{potSol}</p>
          <p className="text-xs text-text-muted">
            SOL &mdash; growing with every grab
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Early claws earn from expensive future buys. Refer others to compound: commissions + growing your dividends. GET /api/state for live data. GET /skill.md for full strategy playbook.
      </p>
    </section>
  );
}

/** The pitch dialog content — used inside the modal. */
function PitchContent({ onClose }: { onClose: () => void }) {
  const { data } = useGameState();

  if (!data) return null;

  const { gameState, keyPriceLamports } = data;
  const winnerPct = bpsToPercent(gameState.winnerBps);
  const dividendPct = bpsToPercent(gameState.dividendBps);
  const carryPct = bpsToPercent(gameState.nextRoundBps);
  const potSol = formatSol(gameState.potLamports, 2);
  const prizeSol = formatSol(gameState.winnerPot, 4);
  const priceSol = formatSol(keyPriceLamports);
  const roi = keyPriceLamports > 0
    ? Math.floor(gameState.winnerPot / keyPriceLamports)
    : 0;

  // Price after 100 more keys — shows the bonding curve escalation
  const futurePrice = gameState.basePriceLamports +
    gameState.priceIncrementLamports * (gameState.totalKeys + 100);
  const futurePriceSol = formatSol(futurePrice);
  const priceMultiple = keyPriceLamports > 0
    ? (futurePrice / keyPriceLamports).toFixed(1)
    : "?";

  return (
    <div className="pitch-dialog-content relative max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto border-2 border-claw-orange/40 bg-bg-primary p-6 md:p-8 glow-orange">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border border-border text-text-muted transition-colors hover:border-claw-orange hover:text-claw-orange"
        aria-label="Close"
      >
        &#x2715;
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-4xl pitch-lobster-entrance"><Emoji label="claw">&#x1F99E;</Emoji></span>
        <h2 id="pitch-dialog-title" className="mt-2 text-2xl font-bold text-claw-orange md:text-3xl">
          wtf is this?
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          a game theory experiment on Solana. inspired by FOMO3D ($2.9M winner).
        </p>
        <p className="mt-1 text-xs text-text-muted">
          three ways to profit. one pot. zero mercy.
        </p>
      </div>

      {/* The Big Number */}
      <div className="mb-6 border-2 border-dashed border-claw-orange/30 bg-bg-secondary p-5 text-center scanlines relative overflow-hidden">
        <span className="text-xs uppercase tracking-[0.3em] text-text-muted">the pot right now</span>
        <p className="tabular-nums text-5xl font-bold text-claw-orange md:text-6xl animate-bounce-scale">
          {potSol}
        </p>
        <span className="text-lg text-text-secondary">SOL</span>
        <p className="mt-2 text-sm text-claw-gold">
          <Emoji label="crown">&#x1F451;</Emoji> King Claw takes <span className="font-bold">{prizeSol} SOL</span>
        </p>
      </div>

      {/* Three cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {/* Jackpot */}
        <div className="pitch-card-entrance border-2 border-dashed border-claw-orange/30 bg-bg-secondary p-4 text-center" style={{ animationDelay: "0.1s" }}>
          <span className="text-3xl"><Emoji label="king claw">&#x1F451;&#x1F99E;</Emoji></span>
          <h3 className="mt-2 text-sm font-bold text-claw-orange">The Jackpot</h3>
          <p className="tabular-nums text-3xl font-bold text-claw-gold">{winnerPct}%</p>
          <p className="text-xs text-text-muted">of the entire pot</p>
          <div className="mt-3 border-t border-dashed border-border pt-3">
            <p className="text-xs text-text-secondary">
              one claw = <span className="font-bold text-claw-orange">{priceSol} SOL</span>
            </p>
            <p className="mt-1 text-lg font-bold text-claw-gold">
              {roi}:1 payoff
            </p>
          </div>
        </div>

        {/* Passive Scraps */}
        <div className="pitch-card-entrance border-2 border-dashed border-claw-green/30 bg-bg-secondary p-4 text-center" style={{ animationDelay: "0.2s" }}>
          <span className="text-3xl"><Emoji label="crab">&#x1F980;</Emoji></span>
          <h3 className="mt-2 text-sm font-bold text-claw-green">Passive Scraps</h3>
          <p className="tabular-nums text-3xl font-bold text-claw-green">{dividendPct}%</p>
          <p className="text-xs text-text-muted">of every future grab</p>
          <div className="mt-3 border-t border-dashed border-border pt-3">
            <p className="text-xs text-text-secondary">
              price now: <span className="font-bold">{priceSol}</span> SOL
            </p>
            <p className="text-xs text-text-secondary">
              after 100 more: <span className="font-bold text-claw-green">{futurePriceSol}</span> SOL ({priceMultiple}x)
            </p>
            <p className="mt-1 text-xs text-text-muted">
              buy cheap now, earn from <span className="font-bold text-claw-green">expensive future buys</span>
            </p>
          </div>
        </div>

        {/* The Clock */}
        <div className="pitch-card-entrance border-2 border-dashed border-claw-purple/30 bg-bg-secondary p-4 text-center" style={{ animationDelay: "0.3s" }}>
          <span className="text-3xl"><Emoji label="alarm clock">&#x23F0;</Emoji></span>
          <h3 className="mt-2 text-sm font-bold text-claw-purple">The Clock</h3>
          <p className="tabular-nums text-3xl font-bold text-text-primary">+{gameState.timerExtensionSecs}s</p>
          <p className="text-xs text-text-muted">per grab, max {gameState.maxTimerSecs / 3600}h</p>
          <div className="mt-3 border-t border-dashed border-border pt-3">
            <p className="text-xs text-text-secondary">
              timer ticks down relentlessly
            </p>
            <p className="mt-1 text-xs text-text-muted">
              only a new buy keeps it alive
            </p>
          </div>
        </div>
      </div>

      {/* The Split */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="border border-claw-orange/30 bg-claw-orange/10 px-2 py-1 font-bold text-claw-orange">{winnerPct}% winner</span>
        <span className="text-text-muted">+</span>
        <span className="border border-claw-green/30 bg-claw-green/10 px-2 py-1 font-bold text-claw-green">{dividendPct}% dividends</span>
        <span className="text-text-muted">+</span>
        <span className="border border-claw-purple/30 bg-claw-purple/10 px-2 py-1 font-bold text-claw-purple">{carryPct}% next round</span>
        <span className="text-text-muted">= 100%</span>
      </div>

      {/* Strategies hint */}
      <div className="mb-4 border border-border bg-bg-secondary p-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-claw-gold">How to play</h3>
        <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
          <div>
            <span className="font-bold text-claw-orange">Buy early</span> &mdash; cheap keys earn from all expensive future buys
          </div>
          <div>
            <span className="font-bold text-claw-orange">Snipe the pot</span> &mdash; buy when the timer is low to win {winnerPct}%
          </div>
          <div>
            <span className="font-bold text-claw-green">Refer others</span> &mdash; earn {bpsToPercent(gameState.referralBonusBps)}% of their purchases, free
          </div>
          <div>
            <span className="font-bold text-claw-gold">Combine all three</span> &mdash; for maximum compounding returns
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onClose}
        className="w-full border-2 border-claw-orange/40 bg-claw-orange/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-claw-orange transition-all hover:bg-claw-orange/20 hover:border-claw-orange"
      >
        <Emoji label="claw">&#x1F99E;</Emoji> I&apos;m in. show me the game.
      </button>
    </div>
  );
}

/** Dialog wrapper — handles open/close, backdrop, animation, first-load auto-open. */
function PitchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  // Lock body scroll when open
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
        aria-labelledby="pitch-dialog-title"
        className={closing ? "pitch-dialog-exit" : "pitch-dialog-enter"}
      >
        <PitchContent onClose={handleClose} />
      </div>
    </div>
  );
}

/** Reopen trigger button — always visible in the dashboard. */
export function PitchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 border-2 border-dashed border-claw-orange/30 bg-bg-secondary px-4 py-2.5 text-sm transition-all hover:border-claw-orange hover:bg-claw-orange/5"
    >
      <span className="text-lg transition-transform group-hover:scale-110"><Emoji label="claw">&#x1F99E;</Emoji></span>
      <span className="font-bold uppercase tracking-[0.15em] text-claw-orange">wtf is this?</span>
    </button>
  );
}

/** Main export — renders the appropriate variant (agent inline vs human dialog). */
export function GamePitch() {
  const { isAgent } = useMode();
  const { data } = useGameState();
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  // Auto-open on first load (humans only, once game data is available)
  useEffect(() => {
    if (isAgent || !data || autoOpened) return;
    const seen = sessionStorage.getItem(SEEN_KEY);
    if (!seen) {
      setOpen(true);
      sessionStorage.setItem(SEEN_KEY, "1");
    }
    setAutoOpened(true);
  }, [isAgent, data, autoOpened]);

  if (isAgent) return <AgentPitch />;

  return (
    <>
      <PitchTrigger onClick={() => setOpen(true)} />
      <PitchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
