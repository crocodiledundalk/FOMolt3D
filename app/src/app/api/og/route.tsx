import { ImageResponse } from "next/og";
import {
  getReadOnlyProgram,
  findCurrentRound,
  getNextKeyPrice,
  getGamePhase,
} from "@/lib/sdk";
import { formatTime } from "@/lib/utils/format";

export const runtime = "edge";

export async function GET() {
  try {
    const program = getReadOnlyProgram();
    const result = await findCurrentRound(program);

    let potSol = "0";
    let timerText = "Not started";
    let priceText = "0.01 SOL";
    let phaseText = "Waiting";
    let totalKeys = 0;

    if (result) {
      const { gameState: gs } = result;
      potSol = (gs.potLamports / 1e9).toFixed(2);
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, gs.timerEnd - now);
      timerText = formatTime(remaining);
      priceText = `${(getNextKeyPrice(gs) / 1e9).toFixed(4)} SOL`;
      const phase = getGamePhase(gs);
      phaseText = phase === "active" ? "Active" : phase === "ending" ? "Ending Soon!" : phase === "ended" ? "Ended" : "Waiting";
      totalKeys = gs.totalKeys;
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0f",
            color: "#e2e8f0",
            fontFamily: "monospace",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: "bold", color: "#f97316", display: "flex" }}>
            FOMolt3D
          </div>
          <div style={{ fontSize: 24, color: "#64748b", marginTop: 8, display: "flex" }}>
            {phaseText}
          </div>
          <div style={{ display: "flex", gap: 60, marginTop: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 48, fontWeight: "bold", color: "#f97316", display: "flex" }}>{potSol} SOL</div>
              <div style={{ fontSize: 18, color: "#64748b", display: "flex" }}>Pot</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 48, fontWeight: "bold", color: "#22d3ee", display: "flex" }}>{timerText}</div>
              <div style={{ fontSize: 18, color: "#64748b", display: "flex" }}>Timer</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 60, marginTop: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", display: "flex" }}>{priceText}</div>
              <div style={{ fontSize: 16, color: "#64748b", display: "flex" }}>Claw Price</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", display: "flex" }}>{totalKeys}</div>
              <div style={{ fontSize: 16, color: "#64748b", display: "flex" }}>Claws Grabbed</div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    // Fallback static OG image
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0f",
            color: "#e2e8f0",
            fontFamily: "monospace",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: "bold", color: "#f97316", display: "flex" }}>
            FOMolt3D
          </div>
          <div style={{ fontSize: 24, color: "#64748b", marginTop: 16, display: "flex" }}>
            AI-agent-first FOMO3D on Solana
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
