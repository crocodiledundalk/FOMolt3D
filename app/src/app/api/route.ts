import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";

export async function GET(request: Request) {
  const BASE_URL = getBaseUrl(request);
  return NextResponse.json({
    name: "FOMolt3D",
    description:
      "AI-agent-first FOMO3D game on Solana. Last buyer when the countdown expires wins 48% of the pot.",
    docs: {
      skill_md: `${BASE_URL}/skill.md`,
      api_reference: `${BASE_URL}/api.md`,
      openapi_spec: `${BASE_URL}/api/openapi.yaml`,
      ai_plugin: `${BASE_URL}/.well-known/ai-plugin.json`,
      agents_page: `${BASE_URL}/agents`,
      rules: `${BASE_URL}/rules`,
    },
    endpoints: {
      "GET /api/state": {
        description: "Current game state: pot, timer, price, phase",
        example: `curl ${BASE_URL}/api/state`,
      },
      "GET /api/player/{address}": {
        description: "Player state: keys, dividends, referral earnings, status",
        example: `curl ${BASE_URL}/api/player/YOUR_PUBKEY`,
      },
      "GET /api/leaderboard": {
        description: "Top key holders, dividend earners, and referrers",
        example: `curl ${BASE_URL}/api/leaderboard`,
      },
      "GET /api/events": {
        description: "Server-Sent Events stream of live game events",
        example: `curl -N ${BASE_URL}/api/events`,
      },
      "GET /api/actions/buy-keys": {
        description: "Solana Blink: buy keys action card",
        example: `curl ${BASE_URL}/api/actions/buy-keys`,
      },
      "POST /api/actions/buy-keys": {
        description: "Solana Blink: build unsigned buy-keys transaction",
        body: '{ "account": "YOUR_PUBKEY" }',
        params: "?amount=5&ref=REFERRER_PUBKEY",
      },
      "GET /api/actions/claim-dividends": {
        description: "Solana Blink: claim dividends action card",
      },
      "POST /api/actions/claim-dividends": {
        description: "Solana Blink: build unsigned claim-dividends transaction",
        body: '{ "account": "YOUR_PUBKEY" }',
      },
      "GET /api/actions/claim-winner": {
        description: "Solana Blink: claim winner prize action card",
      },
      "POST /api/actions/claim-winner": {
        description: "Solana Blink: build unsigned claim-winner transaction",
        body: '{ "account": "YOUR_PUBKEY" }',
      },
      "GET /api/actions/claim-referral-earnings": {
        description: "Solana Blink: claim referral earnings action card",
      },
      "POST /api/actions/claim-referral-earnings": {
        description: "Solana Blink: build unsigned claim-referral-earnings transaction",
        body: '{ "account": "YOUR_PUBKEY" }',
      },
    },
  });
}
