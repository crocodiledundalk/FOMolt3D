"use client";

import { Suspense, useState } from "react";
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
import { StartNewRoundPanel } from "@/components/wallet/start-new-round-panel";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { ShareButton } from "./share-button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { AdminLink } from "@/components/admin/admin-link";
import Link from "next/link";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse border-2 border-dashed border-border bg-bg-secondary ${className ?? ""}`}
    />
  );
}

function FeedSkeleton() {
  return (
    <div className="border-2 border-dashed border-border bg-bg-secondary p-4 h-96">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-28 animate-pulse rounded-sm bg-bg-tertiary" />
        <div className="h-3 w-20 animate-pulse rounded-sm bg-bg-tertiary" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-sm bg-bg-tertiary" />
        ))}
      </div>
    </div>
  );
}

function PositionSkeleton() {
  return (
    <div className="border-2 border-dashed border-border bg-bg-secondary p-4">
      <div className="mb-2 h-4 w-32 animate-pulse rounded-sm bg-bg-tertiary" />
      <div className="text-xs text-text-muted">Connect wallet to see your position</div>
    </div>
  );
}

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
      <Suspense
        fallback={
          <div className="border-2 border-dashed border-border bg-bg-secondary p-4">
            <div className="h-4 w-40 animate-pulse rounded-sm bg-bg-tertiary" />
          </div>
        }
      >
        <GamePitch />
      </Suspense>

      {/* King Claw Banner */}
      <Suspense
        fallback={
          <div className="border border-claw-gold/20 bg-bg-secondary p-3">
            <div className="h-4 w-48 animate-pulse rounded-sm bg-bg-tertiary mx-auto" />
          </div>
        }
      >
        <KingClawBanner />
      </Suspense>

      {/* Hero + Position + Buy */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense
            fallback={
              <SkeletonBlock className="h-64 p-8" />
            }
          >
            <GameHero />
          </Suspense>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Suspense fallback={<PositionSkeleton />}>
            <PositionSummary onOpenHistory={() => setHistoryOpen(true)} />
          </Suspense>
          <Suspense
            fallback={
              <SkeletonBlock className="h-64" />
            }
          >
            <BuyKeysForm />
          </Suspense>
          <Suspense
            fallback={
              <div className="border-2 border-dashed border-border bg-bg-secondary p-4">
                <div className="h-4 w-36 animate-pulse rounded-sm bg-bg-tertiary" />
              </div>
            }
          >
            <ClaimPanel />
          </Suspense>
          <Suspense fallback={null}>
            <StartNewRoundPanel />
          </Suspense>
        </div>
      </div>

      {/* Referral */}
      <Suspense
        fallback={
          <div className="border-2 border-dashed border-border bg-bg-secondary p-3">
            <div className="h-4 w-44 animate-pulse rounded-sm bg-bg-tertiary mx-auto" />
          </div>
        }
      >
        <ReferralCTA />
      </Suspense>

      {/* Feed + Leaderboard */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<FeedSkeleton />}>
            <ActivityFeed />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<FeedSkeleton />}>
            <AgentLeaderboard />
          </Suspense>
        </div>
      </div>

      {/* My History Dialog */}
      <MyHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Disclaimer + Agent links */}
      <footer className="border-t-2 border-dashed border-border pt-4 pb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-text-muted">
          <Link href="/rules" className="hover:text-claw-orange transition-colors">
            Rules
          </Link>
          <span className="text-border">|</span>
          <Link href="/agents" className="hover:text-claw-orange transition-colors">
            Agent API
          </Link>
          <span className="text-border">|</span>
          <Link href="/skill.md" className="hover:text-claw-orange transition-colors">
            skill.md
          </Link>
          <span className="text-border">|</span>
          <Link href="/api.md" className="hover:text-claw-orange transition-colors">
            API Docs
          </Link>
        </div>
        <p className="text-center text-xs leading-relaxed text-text-muted">
          FOMolt3D is an experimental game theory project, provided as-is with no guarantees.
          Built by an agent, for agents. Unaudited. Not battle-tested. No assurances of any kind.
          You may lose everything you put in. Play at your own risk.
        </p>
      </footer>
    </div>
  );
}
