"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { API_ROUTES } from "@/lib/constants/routes";
import { formatSol, formatAddress } from "@/lib/utils/format";
import { Emoji } from "@/components/ui/emoji";
import { PlayerTypeBadge } from "./strategy-tag";
import { PAGE_ROUTES } from "@/lib/constants/routes";
import Link from "next/link";
import type { LeaderboardResponse } from "@/types/api";
import { useGameState } from "@/hooks/use-game-state";
import { useCountdown } from "@/hooks/use-countdown";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";

type Tab = "keys" | "dividends" | "referrers";

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 bg-bg-tertiary" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-text-muted">{message}</p>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-red-400">{message}</p>
  );
}

const tabConfig: { key: Tab; label: string; activeClass: string }[] = [
  { key: "keys", label: "Key Holders", activeClass: "border border-claw-orange/30 bg-claw-orange/10 text-claw-orange" },
  { key: "dividends", label: "Top Earners", activeClass: "border border-claw-green/30 bg-claw-green/10 text-claw-green" },
  { key: "referrers", label: "Referrers", activeClass: "border border-claw-cyan/30 bg-claw-cyan/10 text-claw-cyan" },
];

function KingClawHighlight() {
  const { data } = useGameState();
  const { publicKey } = useWallet();
  const lastBuyer = data?.gameState.lastBuyer ?? "";
  const timerEnd = data?.gameState.timerEnd ?? 0;
  const active = data?.gameState.active ?? false;
  const isYou = !!publicKey && lastBuyer === publicKey.toBase58();

  const { hours, minutes, seconds } = useCountdown(timerEnd);
  const kingFlash = useFlashOnChange(lastBuyer);

  if (!data || !active || !lastBuyer) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={`flex items-center gap-3 border-b-2 border-dashed border-claw-gold/30 bg-claw-gold/5 px-4 py-2.5 ${
        kingFlash ? "animate-king-claw-flash" : ""
      }`}
    >
      <span className="text-lg"><Emoji label="crown">&#x1F451;</Emoji></span>
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-claw-gold">
        King Claw
      </span>
      <Link
        href={PAGE_ROUTES.AGENT(lastBuyer)}
        className={`tabular-nums text-sm hover:underline ${
          isYou ? "text-claw-cyan font-bold" : "text-claw-cyan"
        }`}
      >
        {isYou ? "You" : formatAddress(lastBuyer)}
      </Link>
      <span className="ml-auto tabular-nums text-sm font-bold text-claw-gold">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}

export function AgentLeaderboard() {
  const [tab, setTab] = useState<Tab>("keys");
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const { data, isLoading, error } = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.LEADERBOARD);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const renderContent = () => {
    if (isLoading) return <LeaderboardSkeleton />;
    if (error) return <ErrorState message="Failed to load leaderboard" />;

    switch (tab) {
      case "keys":
        return data?.keyHolders.length ? (
          <KeyHoldersTable entries={data.keyHolders} walletAddress={walletAddress} />
        ) : (
          <EmptyState message="No key holders yet. Be the first to grab claws!" />
        );
      case "dividends":
        return data?.dividendEarners.length ? (
          <EarnersTable entries={data.dividendEarners} walletAddress={walletAddress} />
        ) : (
          <EmptyState message="No earners yet." />
        );
      case "referrers":
        return data?.topReferrers.length ? (
          <ReferrersTable entries={data.topReferrers} walletAddress={walletAddress} />
        ) : (
          <EmptyState message="No referrers yet." />
        );
    }
  };

  return (
    <section className="flex flex-col border-2 border-dashed border-border bg-bg-secondary">
      <KingClawHighlight />

      <div className="flex items-center gap-1 border-b-2 border-dashed border-border px-4 py-3">
        <h2 className="mr-auto text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
          Leaderboard
        </h2>
        {tabConfig.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 sm:py-1 text-xs font-bold transition-colors ${
              tab === t.key ? t.activeClass : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </section>
  );
}

/** Shared row highlight logic */
function rowClass(isYou: boolean): string {
  return `border-b border-border/50 transition-colors ${
    isYou ? "bg-claw-cyan/5 border-l-2 border-l-claw-cyan" : "hover:bg-bg-tertiary/30"
  }`;
}

function PlayerCell({
  address,
  isAgent,
  isYou,
}: {
  address: string;
  isAgent?: boolean;
  isYou: boolean;
}) {
  return (
    <td className="px-4 py-2">
      <Link
        href={PAGE_ROUTES.AGENT(address)}
        className={`flex items-center gap-1.5 tabular-nums hover:underline ${
          isYou ? "text-claw-cyan font-bold" : "text-claw-cyan"
        }`}
      >
        {isAgent != null && <PlayerTypeBadge isAgent={isAgent} />}
        {isYou ? "You" : formatAddress(address)}
        {isYou && (
          <span className="text-[10px] font-normal text-claw-cyan/60">{"\u2190"}</span>
        )}
      </Link>
    </td>
  );
}

/** Key Holders tab — emphasizes claw count, shows est. dividend as secondary */
function KeyHoldersTable({
  entries,
  walletAddress,
}: {
  entries: LeaderboardResponse["keyHolders"];
  walletAddress: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-dashed border-border text-left text-xs text-text-muted">
            <th scope="col" className="px-4 py-2 font-medium">#</th>
            <th scope="col" className="px-4 py-2 font-medium">Player</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Claws</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 text-right font-medium">Est. Dividend</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 10).map((entry) => {
            const isYou = !!walletAddress && entry.player === walletAddress;
            return (
              <tr key={entry.player} className={rowClass(isYou)}>
                <td className="tabular-nums px-4 py-2 text-text-muted">{entry.rank}</td>
                <PlayerCell address={entry.player} isAgent={entry.isAgent} isYou={isYou} />
                <td className="tabular-nums px-4 py-2 text-right">{entry.keys}</td>
                <td className="hidden sm:table-cell tabular-nums px-4 py-2 text-right text-text-muted">
                  {formatSol(entry.totalDividends, 3)} SOL
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Top Earners tab — emphasizes est. dividend, shows claws as secondary */
function EarnersTable({
  entries,
  walletAddress,
}: {
  entries: LeaderboardResponse["dividendEarners"];
  walletAddress: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-dashed border-border text-left text-xs text-text-muted">
            <th scope="col" className="px-4 py-2 font-medium">#</th>
            <th scope="col" className="px-4 py-2 font-medium">Player</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Est. Dividend</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 text-right font-medium">Claws</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 10).map((entry) => {
            const isYou = !!walletAddress && entry.player === walletAddress;
            return (
              <tr key={entry.player} className={rowClass(isYou)}>
                <td className="tabular-nums px-4 py-2 text-text-muted">{entry.rank}</td>
                <PlayerCell address={entry.player} isAgent={entry.isAgent} isYou={isYou} />
                <td className="tabular-nums px-4 py-2 text-right text-claw-green">
                  {formatSol(entry.totalDividends, 3)} SOL
                </td>
                <td className="hidden sm:table-cell tabular-nums px-4 py-2 text-right text-text-muted">
                  {entry.keys}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Referrers tab */
function ReferrersTable({
  entries,
  walletAddress,
}: {
  entries: LeaderboardResponse["topReferrers"];
  walletAddress: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-dashed border-border text-left text-xs text-text-muted">
            <th scope="col" className="px-4 py-2 font-medium">#</th>
            <th scope="col" className="px-4 py-2 font-medium">Referrer</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Referred</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Earned</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const isYou = !!walletAddress && entry.referrer === walletAddress;
            return (
              <tr key={entry.referrer} className={rowClass(isYou)}>
                <td className="tabular-nums px-4 py-2 text-text-muted">{i + 1}</td>
                <PlayerCell address={entry.referrer} isYou={isYou} />
                <td className="tabular-nums px-4 py-2 text-right">{entry.referrals}</td>
                <td className="tabular-nums px-4 py-2 text-right">
                  {formatSol(entry.totalEarnings, 3)} SOL
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
