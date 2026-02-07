export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  fetchPlayerState,
  isValidSolanaAddress,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { formatSol, formatTime } from "@/lib/utils/format";
import { ACTIONS_CORS_HEADERS, actionsOptions } from "@/lib/actions-headers";

/**
 * POST /api/actions/buy-keys/callback
 *
 * Action chaining callback — called after the buy-keys transaction confirms.
 * Returns a "completed" action with the player's updated position.
 *
 * Request body (per Solana Actions spec):
 *   { account: string, signature: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const account = body.account;

    if (
      !account ||
      typeof account !== "string" ||
      !isValidSolanaAddress(account)
    ) {
      return NextResponse.json(
        {
          type: "completed",
          icon: "/icon.png",
          title: "Claws Grabbed!",
          description: "Your transaction was submitted.",
          label: "Done",
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const buyer = new PublicKey(account);
    const program = getReadOnlyProgram();
    const [player, roundResult] = await Promise.all([
      fetchPlayerState(program, buyer),
      getCachedGameRound(program),
    ]);

    const baseUrl = new URL(request.url).origin;

    if (!roundResult || !player) {
      return NextResponse.json(
        {
          type: "completed",
          icon: `${baseUrl}/icon.png`,
          title: "Claws Grabbed!",
          description: "Your transaction was submitted successfully.",
          label: "Done",
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const { gameState: game } = roundResult;
    const keys = player.keys;
    const pct =
      game.totalKeys > 0
        ? ((keys / game.totalKeys) * 100).toFixed(1)
        : "100";
    const pot = formatSol(game.winnerPot, 2);
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, game.timerEnd - now);
    const timer = formatTime(remaining);

    // Reuse the same OG image route
    const ogUrl = new URL("/api/og/game", baseUrl);
    ogUrl.searchParams.set("pot", pot);
    ogUrl.searchParams.set("round", game.round.toString());
    ogUrl.searchParams.set("timer", timer);

    return NextResponse.json(
      {
        type: "completed",
        icon: ogUrl.toString(),
        title: "Claws Grabbed!",
        description: `You hold ${keys} claw${keys !== 1 ? "s" : ""} (${pct}% of total). Pot: ${pot} SOL. Timer: ${timer}.`,
        label: "Done",
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Buy-keys callback error:", err);
    return NextResponse.json(
      {
        type: "completed",
        icon: "/icon.png",
        title: "Claws Grabbed!",
        description: "Your transaction was submitted.",
        label: "Done",
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;
