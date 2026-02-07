export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  fetchPlayerState,
  buildSmartBuy,
  getNextKeyPrice,
  estimateBuyCost,
  getGamePhase,
  toApiGameState,
  isValidSolanaAddress,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { formatSol, formatAddress, formatTime } from "@/lib/utils/format";
import { ACTIONS_CORS_HEADERS, actionsOptions } from "@/lib/actions-headers";

// ---------------------------------------------------------------------------
// GET — The shareable Blink card
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url);
    const baseUrl = reqUrl.origin;
    const ref = reqUrl.searchParams.get("ref");

    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    // --- No game state at all ---
    if (!result) {
      const ogUrl = `${baseUrl}/api/og/game?pot=0`;
      return NextResponse.json(
        {
          type: "action",
          icon: ogUrl,
          title: "FOMolt3D — No Active Round",
          description: "No round is currently running. Check back soon!",
          label: "No Round",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const { gameState: gs } = result;
    const phase = getGamePhase(gs);

    // --- Round ended ---
    if (phase === "ended" || phase === "claiming") {
      return NextResponse.json(
        roundEndedBlink(gs, baseUrl),
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    // --- Active round ---
    const state = toApiGameState(gs);
    const priceLamports = getNextKeyPrice(gs);
    const pot = formatSol(state.potLamports, 2);
    const price = formatSol(priceLamports);
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, gs.timerEnd - now);
    const timer = formatTime(remaining);
    const minutesLeft = remaining / 60;

    // Build dynamic OG image URL
    const ogUrl = new URL("/api/og/game", baseUrl);
    ogUrl.searchParams.set("pot", pot);

    // Build description
    const descParts = [
      `Pot: ${pot} SOL`,
      `Key price: ${price} SOL`,
      `Timer: ${timer}`,
      `Last buyer wins 48%`,
    ];
    if (ref) descParts.push(`Referred by: ${formatAddress(ref)}`);

    const response: Record<string, unknown> = {
      type: "action",
      icon: ogUrl.toString(),
      title:
        minutesLeft < 5
          ? `FOMolt3D — ${timer} LEFT! ${pot} SOL Pot`
          : `FOMolt3D — ${pot} SOL Pot`,
      description: descParts.join(" | "),
      label: "Grab Claws",
      links: {
        actions: [
          { type: "transaction", label: "1 Claw", href: buyHref(1, ref) },
          { type: "transaction", label: "5 Claws", href: buyHref(5, ref) },
          { type: "transaction", label: "10 Claws", href: buyHref(10, ref) },
          {
            type: "transaction",
            label: "Custom",
            href: buyHref("{amount}", ref),
            parameters: [
              {
                type: "number",
                name: "amount",
                label: "Number of claws",
                required: true,
                min: 1,
                max: 10000,
              },
            ],
          },
        ],
      },
    };

    // Urgency banner when timer is low
    if (minutesLeft < 5) {
      response.error = {
        message: `Only ${timer} remaining! Last buyer wins ${pot} SOL!`,
      };
    }

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Blinks GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game state" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Build and return unsigned buy-keys transaction + action chaining
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const amountStr = url.searchParams.get("amount");
    const amount = amountStr ? parseInt(amountStr, 10) : 1;

    if (!amount || amount < 1 || amount > 10000) {
      return NextResponse.json(
        { error: "Invalid amount. Must be between 1 and 10,000." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    let body: Record<string, unknown>;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { error: "Invalid request body. Expected JSON with 'account' field." },
          { status: 400, headers: ACTIONS_CORS_HEADERS }
        );
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Could not parse JSON." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const account = body.account;
    if (
      !account ||
      typeof account !== "string" ||
      !isValidSolanaAddress(account)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid 'account' field in request body." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const buyer = new PublicKey(account);
    const connection = getConnection();
    const program = getReadOnlyProgram(connection);

    const result = await getCachedGameRound(program);
    if (!result) {
      return NextResponse.json(
        { error: "No active round found" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const { gameState } = result;
    const phase = getGamePhase(gameState);
    if (phase === "ended" || phase === "claiming") {
      return NextResponse.json(
        { error: "Round has ended. Claim your earnings instead of buying keys." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const playerState = await fetchPlayerState(program, buyer);

    // Parse optional referrer
    let referrer: PublicKey | undefined;
    const refParam = url.searchParams.get("ref");
    if (refParam && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(refParam)) {
      try {
        referrer = new PublicKey(refParam);
      } catch {
        // Invalid pubkey, ignore
      }
    }

    const ixs = await buildSmartBuy(
      program,
      buyer,
      gameState,
      playerState,
      amount,
      false, // isAgent=false for Blinks (human wallet)
      referrer
    );

    if (!ixs) {
      return NextResponse.json(
        { error: "Cannot buy keys — round is not active" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const tx = new Transaction();
    tx.add(...ixs);
    tx.feePayer = buyer;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    const estimate = estimateBuyCost(gameState, amount, false);

    return NextResponse.json(
      {
        type: "transaction",
        transaction: serialized,
        message: `Grabbing ${amount} claw${amount > 1 ? "s" : ""} for ~${formatSol(estimate.totalCost)} SOL`,
        lastValidBlockHeight,
        links: {
          next: {
            type: "post",
            href: "/api/actions/buy-keys/callback",
          },
        },
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Blinks buy POST error:", err);
    return NextResponse.json(
      { error: "Transaction construction failed. Please try again." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buyHref(amount: number | string, ref: string | null): string {
  const base = `/api/actions/buy-keys?amount=${amount}`;
  return ref ? `${base}&ref=${ref}` : base;
}

interface RoundEndedGame {
  round: number;
  winnerPot: number;
  lastBuyer: PublicKey;
  potLamports: number;
  totalKeys: number;
  timerEnd: number;
  active: boolean;
  winnerClaimed: boolean;
  totalDividendPool: number;
  nextRoundPot: number;
  basePriceLamports: number;
  priceIncrementLamports: number;
}

function roundEndedBlink(
  game: RoundEndedGame,
  baseUrl: string
): Record<string, unknown> {
  const pot = formatSol(game.winnerPot, 2);
  const lastBuyer = game.lastBuyer.toBase58();

  const ogUrl = new URL("/api/og/game", baseUrl);
  ogUrl.searchParams.set("pot", pot);

  return {
    type: "action",
    icon: ogUrl.toString(),
    title: `FOMolt3D — Round ${game.round} Ended!`,
    description: `Winner: ${formatAddress(lastBuyer)} won ${pot} SOL!`,
    label: "Round Over",
    disabled: true,
    links: {
      actions: [
        {
          type: "transaction",
          label: "Claim Dividends",
          href: "/api/actions/claim-dividends",
        },
        {
          type: "transaction",
          label: "Claim Referral",
          href: "/api/actions/claim-referral-earnings",
        },
        {
          type: "external-link",
          label: "View Results",
          href: `${baseUrl}/round/${game.round}`,
        },
      ],
    },
  };
}
