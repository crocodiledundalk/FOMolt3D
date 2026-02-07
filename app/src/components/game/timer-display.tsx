"use client";

import { memo } from "react";
import { useCountdown, type UrgencyLevel } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils/cn";

const urgencyColors: Record<UrgencyLevel, string> = {
  normal: "text-urgency-normal",
  warning: "text-urgency-warning",
  critical: "text-urgency-critical",
  danger: "text-urgency-danger animate-pulse-glow",
  expired: "text-urgency-danger",
};

export const TimerDisplay = memo(function TimerDisplay({ timerEnd }: { timerEnd: number }) {
  const { hours, minutes, seconds, urgency } = useCountdown(timerEnd);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`${hours} hours ${minutes} minutes ${seconds} seconds remaining`}
      className="flex flex-col items-center"
    >
      <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Time Remaining</span>
      <span
        className={cn(
          "tabular-nums text-3xl sm:text-5xl font-bold tracking-tight md:text-6xl animate-wobble",
          urgencyColors[urgency]
        )}
      >
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
      {urgency === "expired" && (
        <span className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-urgency-danger">
          MOLT ENDED &#x1F99E;
        </span>
      )}
    </div>
  );
});
