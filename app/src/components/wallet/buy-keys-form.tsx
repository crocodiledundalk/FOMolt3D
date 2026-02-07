"use client";

import { useState, useCallback } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerState } from "@/hooks/use-player-state";
import { useAnchorProgram } from "@/hooks/use-anchor-program";
import { fetchGameState, fetchPlayerState } from "@/lib/sdk/accounts";
import { buildSmartBuy } from "@/lib/sdk/composites";
import { calculateCost } from "@/lib/utils/bonding-curve";
import { formatSol } from "@/lib/utils/format";
import { Emoji } from "@/components/ui/emoji";
import { parseProgramError } from "@/lib/sdk/errors";
import { getStoredReferrer } from "@/components/game/referral-capture";
import { WalletConnect } from "./wallet-connect";
import { toast } from "sonner";
import { z } from "zod";

const keyAmountSchema = z.coerce.number().int().positive().max(10000);

export function BuyKeysForm() {
  const [amount, setAmount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const address = publicKey?.toBase58() ?? null;
  const { data: gameData } = useGameState();
  const { data: playerData } = usePlayerState(address);
  const anchor = useAnchorProgram();
  const queryClient = useQueryClient();
  const parsed = keyAmountSchema.safeParse(amount);

  const totalKeys = gameData?.gameState.totalKeys ?? 0;
  const basePrice = gameData?.gameState.basePriceLamports ?? 0;
  const priceIncrement = gameData?.gameState.priceIncrementLamports ?? 0;
  const estimatedCost = parsed.success
    ? calculateCost(totalKeys, parsed.data, basePrice, priceIncrement)
    : 0;

  const gameActive =
    gameData?.phase === "active" || gameData?.phase === "ending";

  const handleBuy = useCallback(async () => {
    if (!publicKey || !anchor || !parsed.success) return;

    setSubmitting(true);
    try {
      // Use round number from cached API state, fetch fresh on-chain data (1 RPC call)
      const round = gameData?.gameState.round;
      if (!round) {
        toast.error("No active round found");
        return;
      }
      const gameState = await fetchGameState(anchor.program, round);
      if (!gameState) {
        toast.error("Failed to fetch round state");
        return;
      }
      const roundResult = { round, gameState };

      const onChainPlayerState = await fetchPlayerState(
        anchor.program,
        publicKey
      );

      // Parse referrer: use on-chain referrer if set, otherwise check localStorage
      let referrer: PublicKey | undefined;
      if (playerData?.playerState?.referrer) {
        try {
          referrer = new PublicKey(playerData.playerState.referrer);
        } catch {
          // Invalid referrer, skip
        }
      } else {
        // No on-chain referrer yet — check localStorage for ?ref= capture
        const storedRef = getStoredReferrer();
        if (storedRef) {
          try {
            referrer = new PublicKey(storedRef);
          } catch {
            // Invalid stored referrer, skip
          }
        }
      }

      const instructions = await buildSmartBuy(
        anchor.program,
        publicKey,
        roundResult.gameState,
        onChainPlayerState,
        parsed.data,
        playerData?.playerState?.isAgent ?? false,
        referrer
      );

      if (!instructions) {
        toast.error("Cannot buy keys", {
          description: "Game is not active.",
        });
        return;
      }

      const tx = new Transaction().add(...instructions);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      toast.success(
        `Bought ${parsed.data} claw${parsed.data > 1 ? "s" : ""}`,
        { description: `tx: ${sig.slice(0, 8)}...` }
      );

      // Invalidate queries to refresh state
      await queryClient.invalidateQueries({ queryKey: ["gameState"] });
      await queryClient.invalidateQueries({ queryKey: ["playerState"] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (err: unknown) {
      const programErr = parseProgramError(err);
      const msg = programErr
        ? `${programErr.name}: ${programErr.message}`
        : err instanceof Error
          ? err.message
          : "Transaction failed";
      toast.error("Buy failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [
    publicKey,
    anchor,
    parsed,
    gameData,
    playerData,
    connection,
    sendTransaction,
    queryClient,
  ]);

  return (
    <div className="border-2 border-claw-orange/30 bg-bg-secondary p-4 glow-orange">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-claw-orange">
        <Emoji label="claw">&#x1F99E;</Emoji> Grab Claws
      </h3>

      <div className="space-y-3">
        {/* Primary: custom amount input */}
        <div>
          <label
            htmlFor="claw-amount"
            className="mb-1 block text-xs text-text-muted"
          >
            How many claws?
          </label>
          <input
            id="claw-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={10000}
            placeholder="Enter amount"
            disabled={submitting}
            aria-describedby={!parsed.success && amount !== "" ? "claw-amount-error" : undefined}
            aria-invalid={!parsed.success && amount !== "" ? true : undefined}
            className="w-full border-2 border-claw-orange/30 bg-bg-primary px-3 py-2.5 text-lg tabular-nums font-bold text-text-primary placeholder:text-text-muted focus:border-claw-orange focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Secondary: quick presets */}
        <div className="flex gap-2">
          {[1, 5, 10, 25, 50].map((n) => (
            <button
              key={n}
              onClick={() => setAmount(String(n))}
              disabled={submitting}
              aria-label={`Buy ${n} claws`}
              className={`flex-1 py-2.5 sm:py-1.5 text-xs font-bold transition-colors ${
                amount === String(n)
                  ? "border-2 border-claw-orange bg-claw-orange/10 text-claw-orange"
                  : "border border-dashed border-border text-text-muted hover:border-text-muted hover:text-text-secondary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Cost estimate */}
        {parsed.success && (
          <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-sm">
            <span className="text-text-muted">Cost</span>
            <span className="tabular-nums font-bold text-claw-orange">
              {formatSol(estimatedCost)} SOL
            </span>
          </div>
        )}
        {!parsed.success && amount !== "" && (
          <p id="claw-amount-error" role="alert" className="text-xs text-claw-red">
            enter a valid number (1-10,000)
          </p>
        )}

        {/* Submit button */}
        {!publicKey ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <WalletConnect />
            <p className="text-xs text-text-muted">
              connect wallet to buy claws
            </p>
          </div>
        ) : !gameActive ? (
          <button
            disabled
            className="w-full cursor-not-allowed border-2 border-dashed border-border bg-bg-tertiary px-4 py-2.5 text-sm font-medium text-text-muted"
          >
            {!gameData
              ? "loading game state..."
              : gameData.phase === "ended"
                ? "molt ended — claim your scraps"
                : gameData.phase === "claiming"
                  ? "winner claimed — harvest scraps"
                  : "no active molt"}
          </button>
        ) : (
          <button
            onClick={handleBuy}
            disabled={!parsed.success || submitting}
            className="w-full border-2 border-claw-orange bg-claw-orange/10 px-4 py-2.5 text-sm font-bold text-claw-orange transition-colors hover:bg-claw-orange/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Sending..."
              : `Grab ${parsed.success ? parsed.data : 0} Claw${parsed.success && parsed.data > 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}
