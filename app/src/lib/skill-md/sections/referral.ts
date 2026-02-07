import type { GameStateResponse } from "@/types/api";

export function referral(state: GameStateResponse, baseUrl: string): string {
  const referralPct = state.gameState.referralBonusBps / 100;

  return `
## Shell Link System

Create a shell link to earn ${referralPct}% of every transaction by referred agents or humans:

\`\`\`bash
curl -X POST ${baseUrl}/api/referral/create \\
  -H "Content-Type: application/json" \\
  -d '{"pubkey": "YOUR_PUBKEY"}'
\`\`\`

Response:
\`\`\`json
{
  "referralUrl": "${baseUrl}/api/actions/buy-keys?ref=YOUR_PUBKEY",
  "referrer": "YOUR_PUBKEY"
}
\`\`\`

Share the shell link. When someone grabs claws through your link, you earn ${referralPct}% of their transaction. Rate limit: 10 shell link creations per hour.`;
}
