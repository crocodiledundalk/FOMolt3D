"use client";

import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getComputeBudgetInstructions, ComputeUnits } from "@/lib/priority-fees";
import { useQueryClient } from "@tanstack/react-query";
import type { Program } from "@coral-xyz/anchor";
import type { Fomolt3d } from "@/lib/idl-types";
import type { OnChainGlobalConfig } from "@/lib/sdk/types";
import { buildCreateOrUpdateConfig } from "@/lib/sdk/instructions";
import { formatSol, formatAddress } from "@/lib/utils/format";
import { toast } from "sonner";

interface ConfigPanelProps {
  config: OnChainGlobalConfig;
  program: Program<Fomolt3d>;
}

interface ConfigFormState {
  basePriceLamports: string;
  priceIncrementLamports: string;
  timerExtensionSecs: string;
  maxTimerSecs: string;
  winnerBps: string;
  dividendBps: string;
  nextRoundBps: string;
  protocolFeeBps: string;
  referralBonusBps: string;
  protocolWallet: string;
}

function configToFormState(config: OnChainGlobalConfig): ConfigFormState {
  return {
    basePriceLamports: String(config.basePriceLamports),
    priceIncrementLamports: String(config.priceIncrementLamports),
    timerExtensionSecs: String(config.timerExtensionSecs),
    maxTimerSecs: String(config.maxTimerSecs),
    winnerBps: String(config.winnerBps),
    dividendBps: String(config.dividendBps),
    nextRoundBps: String(config.nextRoundBps),
    protocolFeeBps: String(config.protocolFeeBps),
    referralBonusBps: String(config.referralBonusBps),
    protocolWallet: config.protocolWallet.toBase58(),
  };
}

export function ConfigPanel({ config, program }: ConfigPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ConfigFormState>(() =>
    configToFormState(config)
  );
  const [submitting, setSubmitting] = useState(false);

  const bpsSum =
    (parseInt(form.winnerBps) || 0) +
    (parseInt(form.dividendBps) || 0) +
    (parseInt(form.nextRoundBps) || 0);
  const bpsValid = bpsSum === 10_000;

  let protocolWalletValid = false;
  try {
    new PublicKey(form.protocolWallet);
    protocolWalletValid = true;
  } catch {
    protocolWalletValid = false;
  }

  const formValid = bpsValid && protocolWalletValid;

  const handleSubmit = async () => {
    if (!publicKey || !formValid) return;
    setSubmitting(true);
    try {
      const ix = await buildCreateOrUpdateConfig(program, publicKey, {
        basePriceLamports: parseInt(form.basePriceLamports),
        priceIncrementLamports: parseInt(form.priceIncrementLamports),
        timerExtensionSecs: parseInt(form.timerExtensionSecs),
        maxTimerSecs: parseInt(form.maxTimerSecs),
        winnerBps: parseInt(form.winnerBps),
        dividendBps: parseInt(form.dividendBps),
        nextRoundBps: parseInt(form.nextRoundBps),
        protocolFeeBps: parseInt(form.protocolFeeBps),
        referralBonusBps: parseInt(form.referralBonusBps),
        protocolWallet: new PublicKey(form.protocolWallet),
      });

      const budgetIxs = await getComputeBudgetInstructions(connection, ComputeUnits.CONFIG);
      const tx = new Transaction().add(...budgetIxs, ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      toast.success("Config updated", {
        description: `tx: ${sig.slice(0, 8)}...`,
      });
      await queryClient.invalidateQueries({ queryKey: ["globalConfig"] });
      setEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Config update failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm(configToFormState(config));
    setEditing(false);
  };

  return (
    <section className="border-2 border-dashed border-border bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-claw-orange">
          Global Config
        </h2>
        {!editing && (
          <button
            onClick={() => {
              setForm(configToFormState(config));
              setEditing(true);
            }}
            className="border border-claw-orange/30 bg-claw-orange/10 px-3 py-1 text-xs font-bold text-claw-orange hover:bg-claw-orange/20 transition-colors"
          >
            Edit Config
          </button>
        )}
      </div>

      {!editing ? (
        /* Read-only stat grid */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCell label="Admin" value={formatAddress(config.admin.toBase58())} />
          <StatCell
            label="Base Price"
            value={`${formatSol(config.basePriceLamports)} SOL`}
          />
          <StatCell
            label="Price Increment"
            value={`${formatSol(config.priceIncrementLamports)} SOL`}
          />
          <StatCell
            label="Timer Extension"
            value={`${config.timerExtensionSecs}s`}
          />
          <StatCell
            label="Max Timer"
            value={`${(config.maxTimerSecs / 3600).toFixed(1)}h`}
          />
          <StatCell
            label="Winner BPS"
            value={`${config.winnerBps} (${config.winnerBps / 100}%)`}
          />
          <StatCell
            label="Dividend BPS"
            value={`${config.dividendBps} (${config.dividendBps / 100}%)`}
          />
          <StatCell
            label="Next Round BPS"
            value={`${config.nextRoundBps} (${config.nextRoundBps / 100}%)`}
          />
          <StatCell
            label="Protocol Fee BPS"
            value={`${config.protocolFeeBps} (${config.protocolFeeBps / 100}%)`}
          />
          <StatCell
            label="Referral BPS"
            value={`${config.referralBonusBps} (${config.referralBonusBps / 100}%)`}
          />
          <StatCell
            label="Protocol Wallet"
            value={formatAddress(config.protocolWallet.toBase58())}
          />
          <StatCell label="Bump" value={String(config.bump)} />
        </div>
      ) : (
        /* Edit form */
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label="Base Price (lamports)"
              value={form.basePriceLamports}
              hint={`= ${formatSol(parseInt(form.basePriceLamports) || 0)} SOL`}
              onChange={(v) => setForm({ ...form, basePriceLamports: v })}
            />
            <FormField
              label="Price Increment (lamports)"
              value={form.priceIncrementLamports}
              hint={`= ${formatSol(parseInt(form.priceIncrementLamports) || 0)} SOL`}
              onChange={(v) =>
                setForm({ ...form, priceIncrementLamports: v })
              }
            />
            <FormField
              label="Timer Extension (secs)"
              value={form.timerExtensionSecs}
              onChange={(v) => setForm({ ...form, timerExtensionSecs: v })}
            />
            <FormField
              label="Max Timer (secs)"
              value={form.maxTimerSecs}
              hint={`= ${((parseInt(form.maxTimerSecs) || 0) / 3600).toFixed(1)}h`}
              onChange={(v) => setForm({ ...form, maxTimerSecs: v })}
            />
          </div>

          {/* BPS fields */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Pot Split BPS (must sum to 10000)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <FormField
                label="Winner BPS"
                value={form.winnerBps}
                onChange={(v) => setForm({ ...form, winnerBps: v })}
              />
              <FormField
                label="Dividend BPS"
                value={form.dividendBps}
                onChange={(v) => setForm({ ...form, dividendBps: v })}
              />
              <FormField
                label="Next Round BPS"
                value={form.nextRoundBps}
                onChange={(v) => setForm({ ...form, nextRoundBps: v })}
              />
            </div>
            <p
              className={`text-xs tabular-nums ${bpsValid ? "text-claw-green" : "text-red-400"}`}
            >
              Sum: {bpsSum} / 10000{" "}
              {bpsValid ? "(valid)" : `(off by ${bpsSum - 10_000})`}
            </p>
          </div>

          {/* Other BPS */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Protocol Fee BPS"
              value={form.protocolFeeBps}
              hint="House edge (separate from pot)"
              onChange={(v) => setForm({ ...form, protocolFeeBps: v })}
            />
            <FormField
              label="Referral Bonus BPS"
              value={form.referralBonusBps}
              hint="% of after-fee to referrer"
              onChange={(v) => setForm({ ...form, referralBonusBps: v })}
            />
          </div>

          {/* Protocol wallet */}
          <FormField
            label="Protocol Wallet"
            value={form.protocolWallet}
            error={!protocolWalletValid ? "Invalid public key" : undefined}
            onChange={(v) => setForm({ ...form, protocolWallet: v })}
          />

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-dashed border-border pt-3">
            <button
              onClick={handleSubmit}
              disabled={!formValid || submitting}
              className="border-2 border-claw-orange/50 bg-claw-orange/10 px-4 py-2 text-sm font-bold text-claw-orange transition-colors hover:bg-claw-orange/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Update Config"}
            </button>
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="tabular-nums text-sm font-medium">{value}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  hint,
  error,
  onChange,
}: {
  label: string;
  value: string;
  hint?: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-bg-primary px-3 py-1.5 text-sm tabular-nums text-text-primary outline-none focus:border-claw-orange/50"
      />
      {hint && !error && (
        <p className="mt-0.5 text-xs text-text-muted">{hint}</p>
      )}
      {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
