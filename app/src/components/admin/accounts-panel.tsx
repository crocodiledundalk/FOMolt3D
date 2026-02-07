"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import type { Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "@/lib/idl-types";
import {
  fetchGlobalConfig,
  fetchGameState,
  fetchPlayerState,
  fetchVaultBalance,
} from "@/lib/sdk/accounts";
import { getConfigPDA, getGameStatePDA, getPlayerStatePDA, getVaultPDA } from "@/lib/sdk/pdas";
import { formatSol, formatTimestamp } from "@/lib/utils/format";
import { toast } from "sonner";

interface AccountsPanelProps {
  program: Program<Fomolt3d>;
}

type Tab = "config" | "gameState" | "player";

export function AccountsPanel({ program }: AccountsPanelProps) {
  const [tab, setTab] = useState<Tab>("config");

  return (
    <section className="border-2 border-dashed border-border bg-bg-secondary p-4 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-claw-orange">
        Account Inspector
      </h2>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {(["config", "gameState", "player"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === t
                ? "border-b-2 border-claw-orange text-claw-orange"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t === "gameState" ? "Game State" : t === "player" ? "Player" : "Config"}
          </button>
        ))}
      </div>

      {tab === "config" && <ConfigInspector program={program} />}
      {tab === "gameState" && <GameStateInspector program={program} />}
      {tab === "player" && <PlayerInspector program={program} />}
    </section>
  );
}

// ─── Config Inspector ───────────────────────────────────────────

function ConfigInspector({ program }: { program: Program<Fomolt3d> }) {
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const config = await fetchGlobalConfig(program);
      if (!config) {
        toast.error("Config not found");
        setData(null);
        return;
      }
      const [pda] = getConfigPDA();
      setData({
        "PDA": pda.toBase58(),
        "Admin": config.admin.toBase58(),
        "Base Price": `${config.basePriceLamports} lamports (${formatSol(config.basePriceLamports)} SOL)`,
        "Price Increment": `${config.priceIncrementLamports} lamports (${formatSol(config.priceIncrementLamports)} SOL)`,
        "Timer Extension": `${config.timerExtensionSecs}s`,
        "Max Timer": `${config.maxTimerSecs}s (${(config.maxTimerSecs / 3600).toFixed(1)}h)`,
        "Winner BPS": `${config.winnerBps}`,
        "Dividend BPS": `${config.dividendBps}`,
        "Next Round BPS": `${config.nextRoundBps}`,
        "Protocol Fee BPS": `${config.protocolFeeBps}`,
        "Referral Bonus BPS": `${config.referralBonusBps}`,
        "Protocol Wallet": config.protocolWallet.toBase58(),
        "Bump": String(config.bump),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Fetch failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={fetch}
        disabled={loading}
        className="border border-border bg-bg-primary px-3 py-1 text-xs font-bold text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
      >
        {loading ? "Fetching..." : "Fetch Config"}
      </button>
      {data && <DataGrid data={data} />}
    </div>
  );
}

// ─── Game State Inspector ───────────────────────────────────────

function GameStateInspector({ program }: { program: Program<Fomolt3d> }) {
  const { connection } = useConnection();
  const [roundInput, setRoundInput] = useState("1");
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const roundNum = parseInt(roundInput);
    if (isNaN(roundNum) || roundNum < 1) {
      toast.error("Invalid round number");
      return;
    }
    setLoading(true);
    try {
      const gs = await fetchGameState(program, roundNum);
      if (!gs) {
        toast.error(`Round ${roundNum} not found`);
        setData(null);
        return;
      }
      const [gameStatePDA] = getGameStatePDA(roundNum);
      const [vaultPDA] = getVaultPDA(gameStatePDA);
      let vaultBal = 0;
      try {
        vaultBal = await fetchVaultBalance(connection, roundNum);
      } catch {
        // vault may not exist
      }
      setData({
        "Game State PDA": gameStatePDA.toBase58(),
        "Vault PDA": vaultPDA.toBase58(),
        "Vault Balance": `${vaultBal} lamports (${formatSol(vaultBal)} SOL)`,
        "Round": String(gs.round),
        "Active": String(gs.active),
        "Pot": `${gs.potLamports} lamports (${formatSol(gs.potLamports)} SOL)`,
        "Timer End": gs.timerEnd > 0 ? formatTimestamp(gs.timerEnd) : "N/A",
        "Last Buyer": gs.lastBuyer.toBase58(),
        "Total Keys": String(gs.totalKeys),
        "Total Players": String(gs.totalPlayers),
        "Winner Claimed": String(gs.winnerClaimed),
        "Winner Pot": `${gs.winnerPot} lamports (${formatSol(gs.winnerPot)} SOL)`,
        "Dividend Pool": `${gs.totalDividendPool} lamports (${formatSol(gs.totalDividendPool)} SOL)`,
        "Next Round Pot": `${gs.nextRoundPot} lamports (${formatSol(gs.nextRoundPot)} SOL)`,
        "Round Start": formatTimestamp(gs.roundStart),
        "Bump": String(gs.bump),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Fetch failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs text-text-muted mb-1">
            Round Number
          </label>
          <input
            type="text"
            value={roundInput}
            onChange={(e) => setRoundInput(e.target.value)}
            className="w-24 border border-border bg-bg-primary px-3 py-1.5 text-sm tabular-nums text-text-primary outline-none focus:border-claw-orange/50"
          />
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="border border-border bg-bg-primary px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
        >
          {loading ? "Fetching..." : "Fetch"}
        </button>
      </div>
      {data && <DataGrid data={data} />}
    </div>
  );
}

// ─── Player Inspector ───────────────────────────────────────────

function PlayerInspector({ program }: { program: Program<Fomolt3d> }) {
  const [pubkeyInput, setPubkeyInput] = useState("");
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    let playerPubkey: PublicKey;
    try {
      playerPubkey = new PublicKey(pubkeyInput.trim());
    } catch {
      toast.error("Invalid public key");
      return;
    }
    setLoading(true);
    try {
      const ps = await fetchPlayerState(program, playerPubkey);
      if (!ps) {
        toast.error("Player not found");
        setData(null);
        return;
      }
      const [playerStatePDA] = getPlayerStatePDA(playerPubkey);
      setData({
        "Player State PDA": playerStatePDA.toBase58(),
        "Player": ps.player.toBase58(),
        "Keys": String(ps.keys),
        "Current Round": String(ps.currentRound),
        "Claimed Dividends": `${ps.claimedDividendsLamports} lamports (${formatSol(ps.claimedDividendsLamports)} SOL)`,
        "Referrer": ps.referrer ? ps.referrer.toBase58() : "None",
        "Referral Earnings": `${ps.referralEarningsLamports} lamports (${formatSol(ps.referralEarningsLamports)} SOL)`,
        "Claimed Referral": `${ps.claimedReferralEarningsLamports} lamports (${formatSol(ps.claimedReferralEarningsLamports)} SOL)`,
        "Is Agent": String(ps.isAgent),
        "Bump": String(ps.bump),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Fetch failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">
            Player Public Key
          </label>
          <input
            type="text"
            value={pubkeyInput}
            onChange={(e) => setPubkeyInput(e.target.value)}
            placeholder="Enter base58 public key..."
            className="w-full border border-border bg-bg-primary px-3 py-1.5 text-sm tabular-nums text-text-primary outline-none focus:border-claw-orange/50"
          />
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="border border-border bg-bg-primary px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
        >
          {loading ? "Fetching..." : "Fetch"}
        </button>
      </div>
      {data && <DataGrid data={data} />}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────

function DataGrid({ data }: { data: Record<string, string> }) {
  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  return (
    <div className="border border-border divide-y divide-border/50">
      {Object.entries(data).map(([key, value]) => {
        const isLongValue = value.length > 30;
        return (
          <div
            key={key}
            className="flex items-start justify-between gap-3 px-3 py-2"
          >
            <span className="text-xs text-text-muted shrink-0">{key}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`text-xs tabular-nums text-right ${isLongValue ? "break-all" : ""}`}
              >
                {value}
              </span>
              {isLongValue && (
                <button
                  onClick={() => copyValue(value)}
                  className="shrink-0 text-xs text-text-muted hover:text-claw-orange transition-colors"
                  title="Copy"
                >
                  [copy]
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
