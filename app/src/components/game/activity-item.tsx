import { memo } from "react";
import type { GameEvent } from "@/types/game";
import { formatSol, formatAddress, formatRelativeTime } from "@/lib/utils/format";
import { PAGE_ROUTES } from "@/lib/constants/routes";
import Link from "next/link";

const typeBadge: Record<GameEvent["type"], { label: string; className: string }> = {
  BUY: { label: "GRAB", className: "bg-claw-orange/15 text-claw-orange border border-claw-orange/30" },
  CLAIM: { label: "HARVEST", className: "bg-claw-green/15 text-claw-green border border-claw-green/30" },
  WIN: { label: "KING \uD83D\uDC51", className: "bg-claw-gold/15 text-claw-gold border border-claw-gold/30" },
  ROUND_START: { label: "NEW ROUND", className: "bg-claw-purple/15 text-claw-purple border border-claw-purple/30" },
};

function ExplorerLink({ signature }: { signature: string }) {
  const truncated = `${signature.slice(0, 6)}..${signature.slice(-4)}`;
  const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 tabular-nums text-[10px] text-text-muted/40 hover:text-text-muted transition-colors"
      title={signature}
    >
      {truncated}
      <span className="ml-0.5 inline-block opacity-50">{"\u2197"}</span>
    </a>
  );
}

function PlayerBadge({ isAgent }: { isAgent?: boolean }) {
  if (isAgent == null) return null;
  return isAgent ? (
    <span title="Agent" className="text-sm">{"\uD83E\uDD9E"}</span>
  ) : (
    <span title="Human" className="text-sm">{"\uD83D\uDC64"}</span>
  );
}

interface ActivityItemProps {
  event: GameEvent;
  isYou?: boolean;
}

export const ActivityItem = memo(function ActivityItem({ event, isYou }: ActivityItemProps) {
  const badge = typeBadge[event.type];
  const isRoundStart = event.type === "ROUND_START";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 transition-colors animate-slide-in ${
        isYou
          ? "bg-claw-cyan/5 border-l-2 border-claw-cyan"
          : "hover:bg-bg-tertiary/50"
      }`}
    >
      <span className={`shrink-0 px-2 py-0.5 text-xs font-bold ${badge.className}`}>
        {badge.label}
      </span>
      {isRoundStart ? (
        <span className="tabular-nums text-sm text-claw-purple">
          #{event.round}
        </span>
      ) : (
        <>
          {event.type === "BUY" && <PlayerBadge isAgent={event.isAgent} />}
          {event.player && (
            <Link
              href={PAGE_ROUTES.AGENT(event.player)}
              className={`shrink-0 tabular-nums text-sm hover:underline ${
                isYou ? "text-claw-cyan font-bold" : "text-claw-cyan"
              }`}
            >
              {isYou ? "You" : formatAddress(event.player)}
            </Link>
          )}
          <span className="tabular-nums text-sm text-text-primary">
            {formatSol(event.amount)} SOL
          </span>
          {event.keys != null && event.keys > 0 && (
            <span className="tabular-nums text-xs text-text-muted">
              ({event.keys} claw{event.keys !== 1 ? "s" : ""})
            </span>
          )}
        </>
      )}
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {event.signature && <ExplorerLink signature={event.signature} />}
        <span className="tabular-nums text-xs text-text-muted">
          {formatRelativeTime(event.timestamp)}
        </span>
      </span>
    </div>
  );
});
