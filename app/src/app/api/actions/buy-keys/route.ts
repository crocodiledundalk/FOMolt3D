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
import { formatSol } from "@/lib/utils/format";
import { ACTIONS_CORS_HEADERS, actionsOptions } from "@/lib/actions-headers";

export async function GET(request: Request) {
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) {
      return NextResponse.json(
        {
          type: "action",
          icon: "https://fomolt3d.com/icon.png",
          title: "FOMolt3D — No Active Round",
          description: "No round is currently active. Check back later.",
          label: "No Round",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const { gameState: gs } = result;
    const phase = getGamePhase(gs);

    // Round exists but has ended (timer expired or on-chain inactive)
    if (phase === "ended" || phase === "claiming") {
      return NextResponse.json(
        {
          type: "action",
          icon: "https://fomolt3d.com/icon.png",
          title: "FOMolt3D — Molt Ended",
          description: "This molt has ended. Claim your scraps or wait for the next molt.",
          label: "Molt Ended",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const state = toApiGameState(gs);
    const price = getNextKeyPrice(gs);

    // Thread ?ref= through to action hrefs
    const reqUrl = new URL(request.url);
    const refParam = reqUrl.searchParams.get("ref");
    const refSuffix = refParam && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(refParam)
      ? `&ref=${refParam}` : "";

    const response = {
      type: "action",
      icon: "https://fomolt3d.com/icon.png",
      title: `FOMolt3D — Grab Claws | Pot: ${formatSol(state.potLamports, 2)} SOL`,
      description: `Grab claws to earn scraps and compete for the pot. Current claw price: ${formatSol(price)} SOL. ${state.totalKeys} claws grabbed this molt.`,
      label: "Grab Claws",
      links: {
        actions: [
          { label: "Grab 1 Claw", href: `/api/actions/buy-keys?amount=1${refSuffix}` },
          { label: "Grab 5 Claws", href: `/api/actions/buy-keys?amount=5${refSuffix}` },
          { label: "Grab 10 Claws", href: `/api/actions/buy-keys?amount=10${refSuffix}` },
          {
            label: "Grab Custom",
            href: `/api/actions/buy-keys?amount={amount}${refSuffix}`,
            parameters: [
              {
                name: "amount",
                label: "Number of claws to grab",
                required: true,
              },
            ],
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Blinks GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game state" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

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
    if (!account || typeof account !== "string" || !isValidSolanaAddress(account)) {
      return NextResponse.json(
        { error: "Missing or invalid 'account' field in request body." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Bridge to web3.js PublicKey at Anchor boundary
    const buyer = new PublicKey(account);
    const connection = getConnection();
    const program = getReadOnlyProgram(connection);

    const result = await findCurrentRound(program);
    if (!result) {
      return NextResponse.json(
        { error: "No active round found" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const { gameState } = result;

    // Check if round has ended before building tx
    const phase = getGamePhase(gameState);
    if (phase === "ended" || phase === "claiming") {
      return NextResponse.json(
        { error: "Molt has ended. Claim your scraps instead of buying claws." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const playerState = await fetchPlayerState(program, buyer);

    // Parse optional referrer from ?ref= query param
    let referrer: PublicKey | undefined;
    const refParam = url.searchParams.get("ref");
    if (refParam && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(refParam)) {
      try {
        referrer = new PublicKey(refParam);
      } catch {
        // Invalid pubkey, ignore
      }
    }

    // Build the smart transaction (auto-handles registration via init_if_needed)
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

    // Build transaction
    const tx = new Transaction();
    tx.add(...ixs);
    tx.feePayer = buyer;
    tx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    // Serialize as base64 (unsigned — wallet will sign)
    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    // Estimate cost for the message
    const estimate = estimateBuyCost(gameState, amount, false);

    return NextResponse.json(
      {
        transaction: serialized,
        message: `Grab ${amount} claw${amount > 1 ? "s" : ""} for ~${formatSol(estimate.totalCost)} SOL`,
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
