import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  getReadOnlyProgram,
  fetchPlayerState,
  getPlayerStatus,
  toApiPlayerState,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { pubkeySchema } from "@/lib/validations/game";
import type { PlayerStateResponse } from "@/types/api";
import type { PlayerStatus } from "@/types/game";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const parsed = pubkeySchema.safeParse(address);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Solana public key", details: parsed.error.message },
      { status: 400 }
    );
  }

  try {
    const program = getReadOnlyProgram();
    const playerPubkey = new PublicKey(parsed.data);

    const [ps, roundResult] = await Promise.all([
      fetchPlayerState(program, playerPubkey),
      getCachedGameRound(program),
    ]);

    const gs = roundResult?.gameState ?? null;

    // Get player status analysis
    const sdkStatus = getPlayerStatus(gs, ps, playerPubkey);
    const status: PlayerStatus = {
      needsRegistration: sdkStatus.needsRegistration,
      needsSettlement: sdkStatus.needsSettlement,
      staleRound: sdkStatus.staleRound,
      canBuyKeys: sdkStatus.canBuyKeys,
      canClaim: sdkStatus.canClaim,
      canClaimReferral: sdkStatus.canClaimReferral,
      isWinner: sdkStatus.isWinner,
      estimatedDividend: sdkStatus.estimatedDividend,
      estimatedWinnerPrize: sdkStatus.estimatedWinnerPrize,
      unclaimedReferralEarnings: sdkStatus.unclaimedReferralEarnings,
      phase: sdkStatus.phase,
      keys: sdkStatus.keys,
    };

    if (!ps) {
      // Player has no on-chain state — return status only (needs registration)
      return NextResponse.json({
        playerState: null,
        status,
      });
    }

    const response: PlayerStateResponse = {
      playerState: toApiPlayerState(ps),
      status,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Failed to fetch player state:", err);
    return NextResponse.json(
      { error: "Failed to fetch player state from chain" },
      { status: 500 }
    );
  }
}
