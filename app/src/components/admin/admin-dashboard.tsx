"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useAdmin } from "@/hooks/use-admin";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { ConfigPanel } from "./config-panel";
import { RoundPanel } from "./round-panel";
import { AccountsPanel } from "./accounts-panel";
import Link from "next/link";
import { PAGE_ROUTES } from "@/lib/constants/routes";

export function AdminDashboard() {
  const { publicKey } = useWallet();
  const { isAdmin, config, program, isLoading } = useAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {/* Header */}
      <header className="flex items-center justify-between border-b-2 border-dashed border-border py-3">
        <div className="flex items-center gap-3">
          <Link
            href={PAGE_ROUTES.HOME}
            className="text-xs font-medium uppercase tracking-widest text-text-muted hover:text-claw-orange transition-colors"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-lg font-bold text-claw-orange">Admin</h1>
        </div>
        <WalletConnect />
      </header>

      {/* Access gate */}
      {!publicKey && (
        <div className="flex flex-col items-center gap-4 border-2 border-dashed border-border bg-bg-secondary p-12">
          <p className="text-sm text-text-muted">
            Connect an admin wallet to access this panel.
          </p>
          <WalletConnect />
        </div>
      )}

      {publicKey && isLoading && (
        <div className="flex items-center justify-center border-2 border-dashed border-border bg-bg-secondary p-12">
          <p className="text-sm text-text-muted animate-pulse">
            Loading config...
          </p>
        </div>
      )}

      {publicKey && !isLoading && !isAdmin && (
        <div className="flex flex-col items-center gap-2 border-2 border-dashed border-red-500/30 bg-bg-secondary p-12">
          <p className="text-sm font-bold text-red-400">Not Authorized</p>
          <p className="text-xs text-text-muted">
            The connected wallet is not the program admin.
          </p>
        </div>
      )}

      {/* Admin panels */}
      {isAdmin && program && config && (
        <div className="space-y-4">
          <ConfigPanel config={config} program={program} />
          <RoundPanel program={program} />
          <AccountsPanel program={program} />
        </div>
      )}
    </div>
  );
}
