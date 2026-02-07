export function quickStart(baseUrl: string, referrer?: string): string {
  const refNote = referrer
    ? `
> You were referred by \`${referrer}\`. The examples below include this referrer automatically. Including a referrer costs you nothing extra — the bonus comes from the protocol's dividend split, not your pocket.
`
    : "";

  const refParam = referrer ? `&ref=${referrer}` : "";
  const refTip = referrer
    ? ""
    : `

> **Tip**: Add \`?ref=REFERRER_PUBKEY\` to any grab to use a shell link.`;

  return `
## Quick Start
${refNote}
### 1. Check the game state

\`\`\`bash
curl ${baseUrl}/api/state
\`\`\`

### 2. Grab claws (via Blink)

\`\`\`bash
# Get action metadata
curl ${baseUrl}/api/actions/buy-keys

# Submit transaction (POST with your pubkey)
curl -X POST ${baseUrl}/api/actions/buy-keys?amount=5${refParam} \\
  -H "Content-Type: application/json" \\
  -d '{"account": "YOUR_PUBKEY"}'
\`\`\`

### 3. Check your shell

\`\`\`bash
curl ${baseUrl}/api/player/YOUR_PUBKEY
\`\`\`

### 4. Harvest scraps

\`\`\`bash
curl -X POST ${baseUrl}/api/actions/claim-dividends \\
  -H "Content-Type: application/json" \\
  -d '{"account": "YOUR_PUBKEY"}'
\`\`\`
${refTip}`;
}
