"use client";

import { useState, useEffect, useCallback } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerState } from "@/hooks/use-player-state";
import { useAnchorProgram } from "@/hooks/use-anchor-program";
import { useMode } from "@/providers/mode-provider";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { findCurrentRound } from "@/lib/sdk/accounts";
import { buildClaimReferralEarnings } from "@/lib/sdk/instructions";
import { parseProgramError } from "@/lib/sdk/errors";
import { formatSol } from "@/lib/utils/format";
import { toast } from "sonner";

export function ReferralCTA() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { isAgent } = useMode();
  const address = publicKey?.toBase58() ?? null;
  const { data: gameData } = useGameState();
  const { data: playerData } = usePlayerState(address);
  const anchor = useAnchorProgram();
  const queryClient = useQueryClient();
  const [claimingReferral, setClaimingReferral] = useState(false);

  const referralPct = gameData ? gameData.gameState.referralBonusBps / 100 : 10;

  // Prevent hydration mismatch: wallet state differs between server (null) and
  // client (possibly connected). Show the no-wallet view until mounted.
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const handleClaimReferral = useCallback(async () => {
    if (!publicKey || !anchor) return;
    setClaimingReferral(true);
    try {
      const roundResult = await findCurrentRound(anchor.program);
      if (!roundResult) {
        toast.error("No round found");
        return;
      }
      const ix = await buildClaimReferralEarnings(
        anchor.program,
        publicKey,
        roundResult.gameState.round
      );
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      toast.success("Referral earnings claimed!", {
        description: `tx: ${sig.slice(0, 8)}...`,
      });
      await queryClient.invalidateQueries({ queryKey: ["playerState"] });
    } catch (err: unknown) {
      const programErr = parseProgramError(err);
      const msg = programErr
        ? `${programErr.name}: ${programErr.message}`
        : err instanceof Error
          ? err.message
          : "Claim failed";
      toast.error("Referral claim failed", { description: msg });
    } finally {
      setClaimingReferral(false);
    }
  }, [publicKey, anchor, connection, sendTransaction, queryClient]);

  const referralUrl = address && origin ? `${origin}?ref=${address}` : null;

  const copyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied!");
  };

  // Agent mode: compact API-oriented CTA
  if (isAgent) {
    return (
      <section className="border-2 border-dashed border-claw-cyan/30 bg-bg-secondary p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-claw-cyan">
              &#x1F517; Referrals &mdash; Earn {referralPct}% Per Referral
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Earn {referralPct}% of every transaction by referred agents or humans.
            </p>
          </div>
          <pre className="shrink-0 overflow-x-auto border border-border bg-bg-primary px-3 py-2 text-xs text-claw-green">
            <code>POST /api/referral/create</code>
          </pre>
        </div>
      </section>
    );
  }

  const player = playerData?.playerState;
  const isActiveReferrer = player && (player.referralEarningsLamports > 0 || player.claimedReferralEarningsLamports > 0);

  // No wallet (or not yet mounted — server always takes this path)
  if (!mounted || !publicKey) {
    return <ReferralOpportunity referralPct={referralPct} />;
  }

  // Wallet connected but not yet referring: opportunity pitch
  if (!isActiveReferrer) {
    return (
      <section className="border-2 border-claw-green/30 bg-bg-secondary p-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">&#x1F517;&#x1F99E;</span>
          <h3 className="text-lg font-bold text-claw-green">
            Earn {referralPct}% on Every Referred Grab
          </h3>
          <p className="max-w-md text-sm text-text-secondary">
            Share your referral link and earn <span className="font-bold text-claw-green">{referralPct}%</span> of
            every transaction by referred agents or humans.
          </p>
          {referralUrl && (
            <div className="mt-2 flex items-stretch">
              <div className="flex items-center overflow-hidden border-2 border-claw-green/30 border-r-0 bg-bg-primary px-3 py-2 text-xs tabular-nums text-text-secondary">
                {referralUrl.length > 50 ? `${referralUrl.slice(0, 50)}...` : referralUrl}
              </div>
              <button
                onClick={copyLink}
                className="border-2 border-claw-green/30 bg-claw-green/10 px-4 py-2 text-sm font-bold text-claw-green transition-colors hover:bg-claw-green/20"
              >
                Copy Link
              </button>
            </div>
          )}
          <p className="text-xs text-text-muted">share this link to start earning referral rewards</p>
        </div>
      </section>
    );
  }

  // Active referrer: stats + link + claim
  const unclaimedReferrals = player.referralEarningsLamports;
  const totalReferralEarnings = player.referralEarningsLamports + player.claimedReferralEarningsLamports;

  return (
    <section className="border-2 border-claw-green/30 bg-bg-secondary p-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-claw-green">
            <span className="text-lg">&#x1F517;</span>
            Your Referrals
          </h3>
          {referralUrl && (
            <button
              onClick={copyLink}
              className="border border-claw-green/30 bg-claw-green/10 px-3 py-1 text-xs font-bold text-claw-green transition-colors hover:bg-claw-green/20"
            >
              Copy Link
            </button>
          )}
        </div>

        {/* Referral stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-text-muted">Total Earned</span>
            <p className="tabular-nums text-xl font-bold text-claw-green">
              {formatSol(totalReferralEarnings)}
            </p>
            <p className="text-xs text-text-muted">SOL</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Claimed</span>
            <p className="tabular-nums text-xl font-bold">
              {formatSol(player.claimedReferralEarningsLamports)}
            </p>
            <p className="text-xs text-text-muted">SOL</p>
          </div>
        </div>

        {/* Claim referral earnings CTA */}
        {unclaimedReferrals > 0 && (
          <div className="flex items-center justify-between border-t border-dashed border-claw-green/20 pt-3">
            <div>
              <p className="text-xs text-text-muted">Unclaimed</p>
              <p className="tabular-nums text-lg font-bold text-claw-green">
                {formatSol(unclaimedReferrals)} SOL
              </p>
            </div>
            <button
              onClick={handleClaimReferral}
              disabled={claimingReferral}
              className="border-2 border-claw-green bg-claw-green/10 px-5 py-2.5 text-sm font-bold text-claw-green transition-colors hover:bg-claw-green/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {claimingReferral
                ? "Claiming..."
                : `Claim ${formatSol(unclaimedReferrals)} SOL`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ReferralOpportunity({ referralPct }: { referralPct: number }) {
  return (
    <section className="border-2 border-claw-green/30 bg-bg-secondary p-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-3xl">&#x1F517;&#x1F99E;</span>
        <h3 className="text-lg font-bold text-claw-green">
          Earn {referralPct}% on Every Referred Transaction
        </h3>
        <p className="max-w-md text-sm text-text-secondary">
          Share your referral link and earn <span className="font-bold text-claw-green">{referralPct}%</span> of
          every transaction by referred agents or humans.
        </p>
        <div className="mt-1">
          <WalletConnect />
        </div>
        <p className="text-xs text-text-muted">connect a wallet to generate your referral link</p>
      </div>
    </section>
  );
}
