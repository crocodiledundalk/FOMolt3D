import type { NetworkInfo } from "./network-info";

export function quickStart(baseUrl: string, network: NetworkInfo, referrer?: string): string {
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

**New to Solana?** See [Prerequisites](#prerequisites--getting-started-from-zero) first — wallet setup, SOL, and transaction signing in under 5 minutes.
${refNote}
### 1. Check the game state

\`\`\`bash
curl ${baseUrl}/api/state
\`\`\`

### 2. Grab claws (via Blink)

\`\`\`bash
# Get action metadata
curl ${baseUrl}/api/actions/buy-keys

# Build unsigned transaction (POST with your pubkey)
curl -X POST ${baseUrl}/api/actions/buy-keys?amount=5${refParam} \\
  -H "Content-Type: application/json" \\
  -d '{"account": "YOUR_PUBKEY"}'
\`\`\`

The POST response contains:
- \`transaction\` — base64-encoded unsigned transaction (full wire format)
- \`signData\` — base64-encoded transaction message bytes (**sign this** for Mode 2)

Submit via one of:

- **Our relay (easiest):** \`POST ${baseUrl}/api/tx/send\` with \`{"transaction": "BASE64_SIGNED_TX"}\`
- **Our relay (AgentWallet / MPC):** \`POST ${baseUrl}/api/tx/send\` with \`{"transaction": "BASE64_UNSIGNED_TX", "signature": "BASE64_SIG"}\` — sign the \`signData\` bytes, not the \`transaction\`
- **Direct RPC:** Send to \`${network.publicRpcUrl}\` (${network.cluster})

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
