export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  fetchPlayerState,
  getGamePhase,
  buildClaim,
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
          description: "No round exists yet.",
          label: "No Round",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const gs = result.gameState;
    const phase = getGamePhase(gs);

    if (phase === "active" || phase === "ending") {
      return NextResponse.json(
        {
          type: "action",
          icon: `${iconUrl}/icon.png`,
          title: "FOMolt3D — Round Still Active",
          description: `Round #${gs.round} is still active. The winner prize can only be claimed after the timer expires.`,
          label: "Round Active",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (gs.winnerClaimed) {
      return NextResponse.json(
        {
          type: "action",
          icon: `${iconUrl}/icon.png`,
          title: "FOMolt3D — Winner Already Claimed",
          description: `The winner prize for round #${gs.round} has already been claimed.`,
          label: "Already Claimed",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const response = {
      type: "action",
      icon: `${iconUrl}/icon.png`,
      title: `FOMolt3D — Claim Winner Prize: ${formatSol(gs.winnerPot, 2)} SOL`,
      description: `Round #${gs.round} has ended. If you are the last claw grabber, claim your ${formatSol(gs.winnerPot, 2)} SOL winner prize.`,
      label: "Claim Winner Prize",
      links: {
        actions: [
          {
            label: `Claim ${formatSol(gs.winnerPot, 2)} SOL`,
            href: `/api/actions/claim-winner`,
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Blinks claim-winner GET error:", err);
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
    const phase = getGamePhase(gameState);

    if (phase === "active" || phase === "ending") {
      return NextResponse.json(
        { error: "Round is still active. Winner prize cannot be claimed yet." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (gameState.winnerClaimed) {
      return NextResponse.json(
        { error: "Winner prize has already been claimed." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Verify this player is actually the last buyer
    if (!gameState.lastBuyer.equals(player)) {
      return NextResponse.json(
        { error: "You are not the last claw grabber. Only the winner can claim this prize." },
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const playerState = await fetchPlayerState(program, player);
    if (!playerState) {
      return NextResponse.json(
        { error: "Player state not found." },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Build a claim instruction targeting the current round
    const claimIx = await buildClaim(program, player, gameState.round);

    const tx = new Transaction();
    tx.add(claimIx);
    tx.feePayer = player;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return NextResponse.json(
      {
        transaction: serialized,
        message: `Claim winner prize: ${formatSol(gameState.winnerPot, 2)} SOL`,
        lastValidBlockHeight,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Blinks claim-winner POST error:", err);
    return NextResponse.json(
      { error: "Transaction construction failed. Please try again." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;
