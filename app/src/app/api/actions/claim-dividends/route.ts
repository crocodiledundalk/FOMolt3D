export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  fetchPlayerState,
  buildSmartClaim,
  getPlayerStatus,
  getGamePhase,
  toApiGameState,
  isValidSolanaAddress,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { formatSol } from "@/lib/utils/format";
import { ACTIONS_CORS_HEADERS, actionsOptions } from "@/lib/actions-headers";
import { getBaseUrl } from "@/lib/base-url";

export async function GET(request: Request) {
  try {
    const iconUrl = getBaseUrl(request);
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) {
      return NextResponse.json(
        {
          type: "action",
          icon: `${iconUrl}/icon.png`,
          title: "FOMolt3D — No Active Round",
          description: "No round is currently active.",
          label: "No Round",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const gs = result.gameState;
    const state = toApiGameState(gs);
    const phase = getGamePhase(gs);

    // Show disabled state if round is still active
    if (phase === "active" || phase === "ending") {
      return NextResponse.json(
        {
          type: "action",
          icon: `${iconUrl}/icon.png`,
          title: "FOMolt3D — Round Still Active",
          description: `Round #${state.round} is still active. You can claim scraps once the timer expires.`,
          label: "Round Active",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const response = {
      type: "action",
      icon: `${iconUrl}/icon.png`,
      title: "FOMolt3D — Harvest Your Scraps",
      description: `Round #${state.round} has ended. Harvest your accumulated scraps. Pot: ${formatSol(state.potLamports, 2)} SOL.`,
      label: "Harvest Scraps",
      links: {
        actions: [
          {
            label: "Harvest All Scraps",
            href: `/api/actions/claim-dividends`,
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Blinks claim GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game state" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    const player = new PublicKey(account);
    const connection = getConnection();
    const program = getReadOnlyProgram(connection);

    const result = await getCachedGameRound(program);
    if (!result) {
      return NextResponse.json(
        { error: "No round found" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const { gameState } = result;
    const playerState = await fetchPlayerState(program, player);

    const ixs = await buildSmartClaim(program, player, gameState, playerState);

    if (!ixs) {
      return NextResponse.json(
        { error: "Nothing to claim. Either the round is still active or you have no pending scraps." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const tx = new Transaction();
    tx.add(...ixs);
    tx.feePayer = player;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    // Calculate what they'll receive
    const status = getPlayerStatus(gameState, playerState, player);
    const totalPayout = status.estimatedDividend + status.estimatedWinnerPrize + status.unclaimedReferralEarnings;

    return NextResponse.json(
      {
        transaction: serialized,
        message: `Harvest ~${formatSol(totalPayout)} SOL in scraps${status.isWinner ? " + winner prize" : ""}`,
        lastValidBlockHeight,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Blinks claim POST error:", err);
    return NextResponse.json(
      { error: "Transaction construction failed. Please try again." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;
