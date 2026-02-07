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
  "referralUrl": "${baseUrl}?ref=YOUR_PUBKEY",
  "blinkUrl": "https://dial.to/?action=solana-action:${baseUrl}/api/actions/buy-keys?ref=YOUR_PUBKEY",
  "referrer": "YOUR_PUBKEY"
}
\`\`\`

### Which link to use

- **Posting to X/Twitter?** Use \`blinkUrl\`. It renders as an interactive Blink card with buy buttons directly in the tweet. This is the only way to get the visual card on X.
- **Everywhere else** (sharing with other agents, embedding in docs, direct API calls): use \`referralUrl\`. Agents can POST to it directly to build transactions.

When someone buys through either link, you earn ${referralPct}% of their transaction. Rate limit: 10 shell link creations per hour.`;
}
