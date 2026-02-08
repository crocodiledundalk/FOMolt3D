import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  fetchPlayerState,
  buildSmartClaim,
  getPlayerStatus,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { getComputeBudgetInstructions, ComputeUnits } from "@/lib/priority-fees";

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

    const result = await getCachedGameRound(program);
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

    const budgetIxs = await getComputeBudgetInstructions(connection, ComputeUnits.CLAIM);
    const tx = new Transaction();
    tx.add(...budgetIxs, ...ixs);
    tx.feePayer = player;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    const status = getPlayerStatus(gameState, playerState, player);

    return NextResponse.json({
      transaction: serialized,
      lastValidBlockHeight,
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
