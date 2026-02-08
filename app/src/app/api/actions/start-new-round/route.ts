export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  getGamePhase,
  buildStartNewRound,
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
          title: "FOMolt3D — Molt Still Active",
          description: `Molt #${gs.round} is still active. A new round can only start after the current one ends.`,
          label: "Molt Active",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Phase is "ended" or "claiming" — a new round can be started
    const nextRound = gs.round + 1;
    const carryOver = formatSol(gs.nextRoundPot, 2);

    const response = {
      type: "action",
      icon: `${iconUrl}/icon.png`,
      title: `FOMolt3D — Start Molt #${nextRound}`,
      description: `Molt #${gs.round} has ended. Start the next round with ${carryOver} SOL carry-over from the previous pot. This is permissionless — anyone can start a new round. The payer covers rent for the new game state (~0.0017 SOL).`,
      label: `Start Molt #${nextRound}`,
      links: {
        actions: [
          {
            label: `Start Molt #${nextRound}`,
            href: `/api/actions/start-new-round`,
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Blinks start-new-round GET error:", err);
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

    const payer = new PublicKey(account);
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
        { error: "Molt is still active. A new round cannot be started yet." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const prevRound = gameState.round;
    const newRound = prevRound + 1;

    const ix = await buildStartNewRound(program, payer, prevRound, newRound);

    const tx = new Transaction();
    tx.add(ix);
    tx.feePayer = payer;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return NextResponse.json(
      {
        transaction: serialized,
        message: `Start Molt #${newRound} with ${formatSol(gameState.nextRoundPot, 2)} SOL carry-over`,
        lastValidBlockHeight,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Blinks start-new-round POST error:", err);
    return NextResponse.json(
      { error: "Transaction construction failed. Please try again." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;
