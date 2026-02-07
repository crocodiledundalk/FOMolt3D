export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { getConnection, PROGRAM_ID } from "@/lib/sdk";

/**
 * POST /api/tx/send
 *
 * Accepts a signed transaction (base64), validates it references our program,
 * and forwards it to the correct RPC endpoint. This eliminates the need for
 * agents to know which Solana cluster/RPC to use.
 *
 * Body: { "transaction": "<base64-encoded signed transaction>" }
 * Returns: { "signature": "<tx signature>" } or error.
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { error: "Missing request body. Expected JSON with 'transaction' field." },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const txBase64 = body.transaction;
    if (!txBase64 || typeof txBase64 !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'transaction' field. Expected a base64-encoded signed transaction." },
        { status: 400 }
      );
    }

    // Decode the transaction
    let txBytes: Buffer;
    try {
      txBytes = Buffer.from(txBase64, "base64");
    } catch {
      return NextResponse.json(
        { error: "Could not decode base64 transaction." },
        { status: 400 }
      );
    }

    // Try to deserialize as legacy Transaction first, then VersionedTransaction
    const programIdStr = PROGRAM_ID.toBase58();
    let containsOurProgram = false;
    let rawTransaction: Buffer;

    try {
      // Try legacy Transaction
      const tx = Transaction.from(txBytes);

      // Validate: at least one instruction must reference our program
      for (const ix of tx.instructions) {
        if (ix.programId.toBase58() === programIdStr) {
          containsOurProgram = true;
          break;
        }
      }

      // Re-serialize to get the wire format
      rawTransaction = tx.serialize();
    } catch {
      try {
        // Try VersionedTransaction
        const vtx = VersionedTransaction.deserialize(txBytes);

        // Check static account keys for our program ID
        const keys = vtx.message.staticAccountKeys;
        for (const key of keys) {
          if (key.toBase58() === programIdStr) {
            containsOurProgram = true;
            break;
          }
        }

        rawTransaction = Buffer.from(vtx.serialize());
      } catch {
        return NextResponse.json(
          { error: "Could not deserialize transaction. Ensure it is a valid signed Solana transaction." },
          { status: 400 }
        );
      }
    }

    if (!containsOurProgram) {
      return NextResponse.json(
        {
          error: `Transaction rejected: none of the instructions reference the FOMolt3D program (${programIdStr}). This endpoint only forwards FOMolt3D transactions.`,
        },
        { status: 403 }
      );
    }

    // Forward to our RPC
    const connection = getConnection();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    return NextResponse.json({
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=${getClusterParam()}`,
    });
  } catch (err: unknown) {
    console.error("TX send error:", err);

    // Extract useful error info for the agent
    const message = err instanceof Error ? err.message : String(err);

    // Check for common Solana errors
    if (message.includes("Blockhash not found")) {
      return NextResponse.json(
        { error: "Transaction expired — the blockhash is no longer valid. Please request a new transaction and sign+submit promptly." },
        { status: 410 }
      );
    }

    if (message.includes("insufficient funds") || message.includes("Insufficient funds")) {
      return NextResponse.json(
        { error: "Insufficient SOL balance to cover the transaction cost + fees." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Transaction send failed: ${message}` },
      { status: 500 }
    );
  }
}

function getClusterParam(): string {
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").toLowerCase();
  if (rpc.includes("devnet")) return "devnet";
  if (rpc.includes("testnet")) return "testnet";
  return "mainnet-beta";
}
