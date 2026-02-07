"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameState } from "@/hooks/use-game-state";
import { formatSol } from "@/lib/utils/format";

interface ShareButtonProps {
  variant?: "hero" | "compact";
  className?: string;
}

export function ShareButton({ variant = "compact", className = "" }: ShareButtonProps) {
  const { publicKey } = useWallet();
  const { data: gameData } = useGameState();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  const walletRef = publicKey ? `?ref=${publicKey.toBase58()}` : "";
  const blinkUrl = `https://dial.to/?action=solana-action:${origin}/api/actions/buy-keys${walletRef}`;

  const potText = gameData
    ? `${formatSol(gameData.gameState.potLamports, 2)} SOL`
    : "growing";

  const tweetText = encodeURIComponent(
    `The pot is ${potText} and counting. Last claw grabber takes 48%. Are you brave enough?\n\n`
  );

  const shareUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(blinkUrl)}`;

  const handleShare = () => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  if (variant === "hero") {
    return (
      <button
        onClick={handleShare}
        className={`border-2 border-claw-cyan/30 bg-claw-cyan/10 px-5 py-2.5 text-sm font-bold text-claw-cyan transition-colors hover:bg-claw-cyan/20 ${className}`}
      >
        Share on X
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`border border-dashed border-border px-3 py-1 text-xs font-bold uppercase tracking-widest text-text-muted transition-colors hover:border-claw-cyan hover:text-claw-cyan ${className}`}
    >
      Share
    </button>
  );
}
