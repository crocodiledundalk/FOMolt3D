import { NextResponse } from "next/server";
import {
  getReadOnlyProgram,
  getNextKeyPrice,
} from "@/lib/sdk";
import { getCachedGameRound } from "@/lib/rpc-cache";
import { formatSol, formatTime, formatAddress } from "@/lib/utils/format";
import { ACTIONS_CORS_HEADERS, actionsOptions } from "@/lib/actions-headers";

export async function GET() {
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) {
      const response = {
        type: "action",
        icon: "https://fomolt3d.com/icon.png",
        title: "FOMolt3D — No active round",
        description: "No game rounds found. Waiting for initialization.",
        label: "View Game",
        links: { actions: [] },
      };
      return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
    }

    const { gameState } = result;
    const price = getNextKeyPrice(gameState);
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, gameState.timerEnd - now);
    const lastBuyer = gameState.lastBuyer.toBase58();

    const response = {
      type: "action",
      icon: "https://fomolt3d.com/icon.png",
      title: `\uD83E\uDD9E Molt #${gameState.round} \u2014 ${formatTime(remaining)} remaining`,
      description: [
        `Pot: ${formatSol(gameState.potLamports, 2)} SOL`,
        `Claw Price: ${formatSol(price)} SOL`,
        `Claws Grabbed: ${gameState.totalKeys}`,
        `King Claw: ${formatAddress(lastBuyer)}`,
        gameState.active ? "Status: ACTIVE" : "Status: ENDED",
      ].join(" | "),
      label: "View Game",
      links: {
        actions: [
          {
            label: "Grab Claws",
            href: `/api/actions/buy-keys`,
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Game status action error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game status" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = actionsOptions;
