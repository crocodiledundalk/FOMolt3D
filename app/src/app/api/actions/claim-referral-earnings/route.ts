export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  fetchPlayerState,
  buildClaimReferralEarnings,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { formatSol } from "@/lib/utils/format";
import { ACTIONS_CORS_HEADERS, actionsOptions } from "@/lib/actions-headers";
import { REFERRALS_ENABLED } from "@/lib/feature-flags";

export async function GET() {
  if (!REFERRALS_ENABLED) {
    return NextResponse.json(
      { error: "Referrals are temporarily disabled" },
      { status: 503, headers: ACTIONS_CORS_HEADERS }
    );
  }
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) {
      return NextResponse.json(
        {
          type: "action",
          icon: "https://fomolt3d.com/icon.png",
          title: "FOMolt3D — No Active Round",
          description: "No round exists yet.",
          label: "No Round",
          disabled: true,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const response = {
      type: "action",
      icon: "https://fomolt3d.com/icon.png",
      title: "FOMolt3D — Claim Referral Earnings",
      description: "Claim your accumulated referral earnings. You earn a percentage of every transaction by players you referred.",
      label: "Claim Referral Earnings",
      links: {
        actions: [
          {
            label: "Claim Referral Earnings",
            href: `/api/actions/claim-referral-earnings`,
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Blinks claim-referral GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game state" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  if (!REFERRALS_ENABLED) {
    return NextResponse.json(
      { error: "Referrals are temporarily disabled" },
      { status: 503, headers: ACTIONS_CORS_HEADERS }
    );
  }

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
    if (!account || typeof account !== "string") {
      return NextResponse.json(
        { error: "Missing 'account' field in request body." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

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

    const playerState = await fetchPlayerState(program, player);
    if (!playerState) {
      return NextResponse.json(
        { error: "Player state not found. You need to have played at least once." },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const unclaimed =
      playerState.referralEarningsLamports -
      playerState.claimedReferralEarningsLamports;

    if (unclaimed <= 0) {
      return NextResponse.json(
        { error: "No unclaimed referral earnings." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const ix = await buildClaimReferralEarnings(
      program,
      player,
      result.gameState.round
    );

    const tx = new Transaction();
    tx.add(ix);
    tx.feePayer = player;
    tx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return NextResponse.json(
      {
        transaction: serialized,
        message: `Claim ${formatSol(unclaimed)} SOL in referral earnings`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Blinks claim-referral POST error:", err);
    return NextResponse.json(
      { error: "Transaction construction failed. Please try again." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;
