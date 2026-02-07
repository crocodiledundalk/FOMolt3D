"use client";

import { useMode } from "@/providers/mode-provider";

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex items-center rounded-none border-2 border-dashed border-border bg-bg-secondary p-0.5">
      <button
        onClick={() => setMode("human")}
        className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-colors ${
          mode === "human"
            ? "border border-claw-orange bg-claw-orange/15 text-claw-orange"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        &#x1F464; Human
      </button>
      <button
        onClick={() => setMode("agent")}
        className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-colors ${
          mode === "agent"
            ? "border border-claw-cyan bg-claw-cyan/15 text-claw-cyan"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        &#x1F916; Agent
      </button>
    </div>
  );
}
