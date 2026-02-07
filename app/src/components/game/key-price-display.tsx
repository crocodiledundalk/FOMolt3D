"use client";

import { memo } from "react";
import { formatSol } from "@/lib/utils/format";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";

interface KeyPriceDisplayProps {
  currentPrice: number;
  nextPrice: number;
}

export const KeyPriceDisplay = memo(function KeyPriceDisplay({ currentPrice, nextPrice }: KeyPriceDisplayProps) {
  const priceFlash = useFlashOnChange(currentPrice);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Claw Price</span>
      <span
        className={`tabular-nums text-2xl font-bold text-claw-orange ${
          priceFlash ? "animate-value-flash" : ""
        }`}
      >
        {formatSol(currentPrice)} SOL
      </span>
      <span className="tabular-nums text-xs text-text-muted">
        Next: {formatSol(nextPrice)} SOL
      </span>
    </div>
  );
});
