"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Blink, useAction } from "@dialectlabs/blinks";
import { useActionSolanaWalletAdapter } from "@dialectlabs/blinks/hooks/solana";
import "@dialectlabs/blinks/index.css";

export function BlinkCard() {
  const { connection } = useConnection();
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const actionApiUrl = baseUrl
    ? `${baseUrl}/api/actions/buy-keys`
    : "";

  const { adapter } = useActionSolanaWalletAdapter(connection);
  const { action, isLoading } = useAction({ url: actionApiUrl || "about:blank" });

  if (!baseUrl || isLoading || !action) {
    return (
      <div className="h-48 animate-pulse border-2 border-dashed border-border bg-bg-secondary" />
    );
  }

  return (
    <div className="border-2 border-claw-cyan/30 bg-bg-secondary p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-claw-cyan">
        Quick Grab via Blink
      </h3>
      <Blink action={action} adapter={adapter} stylePreset="x-dark" />
    </div>
  );
}
