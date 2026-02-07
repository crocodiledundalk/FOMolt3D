import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Dynamic OG image for the buy-keys Blink.
 * Pure rendering from query params — no RPC calls.
 *
 * Query params:
 *   pot - SOL amount (e.g. "142.50")
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pot = searchParams.get("pot") ?? "0";

  // Scattered lobster positions — fixed layout, varied sizes
  const lobsters: Array<{
    top: string;
    left: string;
    size: number;
    rotate: number;
    opacity: number;
  }> = [
    { top: "4%", left: "6%", size: 52, rotate: -20, opacity: 0.9 },
    { top: "8%", left: "78%", size: 44, rotate: 15, opacity: 0.85 },
    { top: "2%", left: "42%", size: 32, rotate: -5, opacity: 0.6 },
    { top: "18%", left: "88%", size: 28, rotate: 30, opacity: 0.55 },
    { top: "22%", left: "2%", size: 36, rotate: -35, opacity: 0.7 },
    { top: "72%", left: "4%", size: 48, rotate: 25, opacity: 0.85 },
    { top: "78%", left: "82%", size: 40, rotate: -15, opacity: 0.8 },
    { top: "85%", left: "50%", size: 30, rotate: 10, opacity: 0.55 },
    { top: "90%", left: "18%", size: 26, rotate: -25, opacity: 0.5 },
    { top: "88%", left: "70%", size: 34, rotate: 20, opacity: 0.65 },
    { top: "45%", left: "92%", size: 30, rotate: -10, opacity: 0.5 },
    { top: "50%", left: "3%", size: 26, rotate: 40, opacity: 0.45 },
    { top: "14%", left: "22%", size: 24, rotate: -40, opacity: 0.4 },
    { top: "12%", left: "62%", size: 22, rotate: 35, opacity: 0.4 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          fontFamily: "monospace",
          color: "#e8e8e8",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scattered lobsters */}
        {lobsters.map((l, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: l.top,
              left: l.left,
              fontSize: l.size,
              transform: `rotate(${l.rotate}deg)`,
              opacity: l.opacity,
              display: "flex",
            }}
          >
            🦞
          </div>
        ))}

        {/* Central content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {/* FOMolt3D title */}
          <div
            style={{
              fontSize: 56,
              fontWeight: "bold",
              color: "#ff6b35",
              letterSpacing: "3px",
              marginBottom: "24px",
              display: "flex",
            }}
          >
            FOMolt3D
          </div>

          {/* Pot size — the hero number */}
          <div
            style={{
              fontSize: 112,
              fontWeight: "bold",
              display: "flex",
              background: "linear-gradient(90deg, #ff6b35, #ffd700)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.1,
            }}
          >
            {pot} SOL
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: 28,
              color: "#00e5cc",
              marginTop: "28px",
              letterSpacing: "2px",
              display: "flex",
            }}
          >
            FOMolt3D.com
          </div>

          {/* Caption */}
          <div
            style={{
              fontSize: 18,
              color: "#888888",
              marginTop: "24px",
              textAlign: "center",
              maxWidth: "580px",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            A real money game theory experiment for agents and humans. Play now
            at FOMolt3D.com
          </div>
        </div>
      </div>
    ),
    { width: 800, height: 800 }
  );
}
