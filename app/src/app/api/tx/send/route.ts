export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { getConnection, PROGRAM_ID } from "@/lib/sdk";
import { getExplorerUrl } from "@/lib/network";

const SIGNATURE_LENGTH = 64;

/**
 * Attach an external signature to an unsigned transaction.
 * Supports both legacy Transaction and VersionedTransaction.
 * The signature is placed in the first slot (fee payer / signer).
 */
function attachSignature(txBytes: Uint8Array, sigBytes: Uint8Array): Uint8Array {
  // Try VersionedTransaction first (our Blinks endpoints produce these)
  try {
    const vtx = VersionedTransaction.deserialize(txBytes);
    vtx.signatures[0] = sigBytes;
    return vtx.serialize();
  } catch {
    // Fall through to legacy
  }

  // Try legacy Transaction
  const tx = Transaction.from(txBytes);
  if (tx.signatures.length > 0 && tx.signatures[0].publicKey) {
    tx.signatures[0].signature = Buffer.from(sigBytes);
  }
  return tx.serialize();
}

/**
 * POST /api/tx/send
 *
 * Accepts a transaction and forwards it to the correct RPC endpoint.
 * This eliminates the need for agents to know which Solana cluster/RPC to use.
 *
 * Supports two modes:
 *
 * **Mode 1 — Signed transaction (standard wallets):**
 *   Body: { "transaction": "<base64-encoded signed transaction>" }
 *
 * **Mode 2 — Unsigned transaction + detached signature (AgentWallet / MPC wallets):**
 *   Body: { "transaction": "<base64-encoded unsigned transaction>", "signature": "<base64-encoded 64-byte ed25519 signature>" }
 *   The signature must be over the transaction MESSAGE bytes (the `signData` field from Blinks POST),
 *   NOT the full serialized transaction (which includes wire-format signature placeholders).
 *
 * Returns: { "signature": "<tx signature>", "explorer": "<explorer url>" } or error.
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
        { error: "Missing or invalid 'transaction' field. Expected a base64-encoded transaction." },
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

    // Mode 2: If a detached signature is provided, attach it to the unsigned transaction
    const sigBase64 = body.signature;
    if (sigBase64 !== undefined) {
      if (typeof sigBase64 !== "string") {
        return NextResponse.json(
          { error: "Invalid 'signature' field. Expected a base64-encoded ed25519 signature (64 bytes)." },
          { status: 400 }
        );
      }

      let sigBytes: Buffer;
      try {
        sigBytes = Buffer.from(sigBase64, "base64");
      } catch {
        return NextResponse.json(
          { error: "Could not decode base64 signature." },
          { status: 400 }
        );
      }

      if (sigBytes.length !== SIGNATURE_LENGTH) {
        return NextResponse.json(
          { error: `Invalid signature length: expected ${SIGNATURE_LENGTH} bytes, got ${sigBytes.length}. Provide a raw ed25519 signature, not a transaction.` },
          { status: 400 }
        );
      }

      try {
        txBytes = Buffer.from(attachSignature(txBytes, sigBytes));
      } catch {
        return NextResponse.json(
          { error: "Failed to attach signature to transaction. Ensure the transaction is a valid unsigned Solana transaction." },
          { status: 400 }
        );
      }
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
      explorer: getExplorerUrl(signature),
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

