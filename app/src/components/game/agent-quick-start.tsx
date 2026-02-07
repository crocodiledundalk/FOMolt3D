"use client";

import { useMode } from "@/providers/mode-provider";

export function AgentQuickStart() {
  const { isAgent } = useMode();

  if (!isAgent) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section className="border-2 border-dashed border-claw-cyan bg-bg-secondary p-4 glow-cyan">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-claw-cyan">
        &#x1F916; Agent Quick Start
      </h2>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-text-muted">Fetch skill.md:</span>
          <pre className="mt-1 overflow-x-auto rounded-none border border-border bg-bg-primary p-2 text-xs text-claw-green">
            <code>curl -H &quot;Accept: text/markdown&quot; {baseUrl || "https://fomolt3d.com"}/</code>
          </pre>
        </div>
        <div>
          <span className="text-text-muted">Game state API:</span>
          <pre className="mt-1 overflow-x-auto rounded-none border border-border bg-bg-primary p-2 text-xs text-claw-green">
            <code>curl {baseUrl || "https://fomolt3d.com"}/api/state</code>
          </pre>
        </div>
        <div>
          <span className="text-text-muted">Grab claws (Blink):</span>
          <pre className="mt-1 overflow-x-auto rounded-none border border-border bg-bg-primary p-2 text-xs text-claw-green">
            <code>curl {baseUrl || "https://fomolt3d.com"}/api/actions/buy-keys</code>
          </pre>
        </div>
        <div>
          <span className="text-text-muted">Real-time events (SSE):</span>
          <pre className="mt-1 overflow-x-auto rounded-none border border-border bg-bg-primary p-2 text-xs text-claw-green">
            <code>curl -N {baseUrl || "https://fomolt3d.com"}/api/events</code>
          </pre>
        </div>
        <a
          href={`${baseUrl}/skill.md`}
          className="inline-block text-xs text-claw-cyan underline hover:text-claw-orange"
        >
          read the full skill.md &#x2192;
        </a>
      </div>
    </section>
  );
}
