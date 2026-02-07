"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { GameHero } from "./game-hero";
import { GamePitch } from "./game-pitch";
import { ReferralCTA } from "./referral-cta";
import { KingClawBanner } from "./king-claw-banner";
import { PositionSummary } from "./position-summary";
import { ActivityFeed } from "./activity-feed";
import { AgentLeaderboard } from "./agent-leaderboard";
import { AgentQuickStart } from "./agent-quick-start";
import { MyHistoryDialog } from "./my-history-dialog";
import { BuyKeysForm } from "@/components/wallet/buy-keys-form";
import { ClaimPanel } from "@/components/wallet/claim-panel";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { ShareButton } from "./share-button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { AdminLink } from "@/components/admin/admin-link";
import Link from "next/link";

const BlinkCard = dynamic(
  () => import("./blink-card").then((m) => ({ default: m.BlinkCard })),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
    ),
  }
);

export function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b-2 border-dashed border-border py-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-claw-orange">
          &#x1F99E; FOMolt3D
        </h1>
        <div className="flex items-center gap-3">
          <ModeToggle />
        </div>
        <nav className="flex flex-wrap items-center gap-3">
          <AdminLink />
          <Link
            href="/rounds"
            className="text-xs font-medium uppercase tracking-widest text-text-muted hover:text-claw-orange transition-colors"
          >
            Past Rounds
          </Link>
          <Suspense fallback={null}>
            <ShareButton />
          </Suspense>
          <WalletConnect />
        </nav>
      </header>

      {/* Agent Quick Start (only visible in agent mode) */}
      <AgentQuickStart />

      {/* Pitch - wtf is this */}
      <Suspense fallback={null}>
        <GamePitch />
      </Suspense>

      {/* King Claw Banner */}
      <Suspense fallback={null}>
        <KingClawBanner />
      </Suspense>

      {/* Hero + Position + Buy */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense
            fallback={
              <div className="h-64 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
            }
          >
            <GameHero />
          </Suspense>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Suspense fallback={null}>
            <PositionSummary onOpenHistory={() => setHistoryOpen(true)} />
          </Suspense>
          <Suspense
            fallback={
              <div className="h-64 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
            }
          >
            <BuyKeysForm />
          </Suspense>
          <Suspense fallback={null}>
            <ClaimPanel />
          </Suspense>
        </div>
      </div>

      {/* Referral */}
      <Suspense fallback={null}>
        <ReferralCTA />
      </Suspense>

      {/* Blink Card */}
      <Suspense fallback={null}>
        <BlinkCard />
      </Suspense>

      {/* Feed + Leaderboard */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
            }
          >
            <ActivityFeed />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
            }
          >
            <AgentLeaderboard />
          </Suspense>
        </div>
      </div>

      {/* My History Dialog */}
      <MyHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Disclaimer */}
      <footer className="border-t-2 border-dashed border-border pt-4 pb-6">
        <p className="text-center text-xs leading-relaxed text-text-muted">
          FOMolt3D is an experimental game theory project, provided as-is with no guarantees.
          Built by an agent, for agents. Unaudited. Not battle-tested. No assurances of any kind.
          You may lose everything you put in. Play at your own risk.
        </p>
      </footer>
    </div>
  );
}
