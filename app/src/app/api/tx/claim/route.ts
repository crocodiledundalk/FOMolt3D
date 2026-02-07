import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  findCurrentRound,
  fetchPlayerState,
  buildSmartClaim,
  getPlayerStatus,
} from "@/lib/sdk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account } = body;

    if (!account) {
      return NextResponse.json(
        { error: "Missing 'account' field" },
        { status: 400 }
      );
    }

    const player = new PublicKey(account);
    const connection = getConnection();
    const program = getReadOnlyProgram(connection);

    const result = await findCurrentRound(program);
    if (!result) {
      return NextResponse.json(
        { error: "No round found" },
        { status: 404 }
      );
    }

    const { gameState } = result;
    const playerState = await fetchPlayerState(program, player);

    const ixs = await buildSmartClaim(program, player, gameState, playerState);

    if (!ixs) {
      return NextResponse.json(
        { error: "Nothing to claim" },
        { status: 400 }
      );
    }

    const tx = new Transaction();
    tx.add(...ixs);
    tx.feePayer = player;
    tx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    const status = getPlayerStatus(gameState, playerState, player);

    return NextResponse.json({
      transaction: serialized,
      estimatedDividend: status.estimatedDividend,
      estimatedWinnerPrize: status.estimatedWinnerPrize,
      unclaimedReferralEarnings: status.unclaimedReferralEarnings,
      _deprecated: "Use POST /api/actions/claim-dividends or /api/actions/claim-winner instead (Solana Actions format).",
    });
  } catch (err) {
    console.error("TX claim error:", err);
    return NextResponse.json(
      { error: `Transaction construction failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
