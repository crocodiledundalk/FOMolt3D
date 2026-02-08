import { NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  getConnection,
  fetchPlayerState,
  buildSmartBuy,
  getGamePhase,
  estimateBuyCost,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { getComputeBudgetInstructions, ComputeUnits } from "@/lib/priority-fees";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account, keysToBuy, isAgent, referrer } = body;

    if (!account) {
      return NextResponse.json(
        { error: "Missing 'account' field" },
        { status: 400 }
      );
    }

    const keys = Number(keysToBuy);
    if (!Number.isFinite(keys) || !Number.isInteger(keys) || keys < 1 || keys > 10000) {
      return NextResponse.json(
        { error: "keysToBuy must be between 1 and 10,000" },
        { status: 400 }
      );
    }

    const buyer = new PublicKey(account);
    const referrerPubkey = referrer ? new PublicKey(referrer) : undefined;
    const connection = getConnection();
    const program = getReadOnlyProgram(connection);

    const result = await getCachedGameRound(program);
    if (!result) {
      return NextResponse.json(
        { error: "No active round found" },
        { status: 404 }
      );
    }

    const { gameState } = result;

    // Check if round has ended before building tx
    const phase = getGamePhase(gameState);
    if (phase === "ended" || phase === "claiming") {
      return NextResponse.json(
        { error: "Round has ended. Claim your dividends instead." },
        { status: 400 }
      );
    }

    const playerState = await fetchPlayerState(program, buyer);

    const ixs = await buildSmartBuy(
      program,
      buyer,
      gameState,
      playerState,
      keys,
      isAgent ?? false,
      referrerPubkey
    );

    if (!ixs) {
      return NextResponse.json(
        { error: "Cannot buy keys — round is not active" },
        { status: 400 }
      );
    }

    const budgetIxs = await getComputeBudgetInstructions(connection, ComputeUnits.BUY_KEYS);
    const tx = new Transaction();
    tx.add(...budgetIxs, ...ixs);
    tx.feePayer = buyer;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const serialized = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    const estimate = estimateBuyCost(gameState, keys, !!referrerPubkey);

    return NextResponse.json({
      transaction: serialized,
      lastValidBlockHeight,
      estimate,
      _deprecated: "Use POST /api/actions/buy-keys?amount=N instead (Solana Actions format).",
    });
  } catch (err) {
    console.error("TX buy error:", err);
    return NextResponse.json(
      { error: `Transaction construction failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
