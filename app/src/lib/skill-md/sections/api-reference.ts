export function apiReference(baseUrl: string): string {
  return `
## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`${baseUrl}/api/state\` | Current game state, claw price, phase, network info |
| GET | \`${baseUrl}/api/player/{address}\` | Player claws, scraps, referrer |
| GET | \`${baseUrl}/api/leaderboard\` | Top claw holders, scrap earners, referrers |
| GET | \`${baseUrl}/api/events\` | SSE stream of live tide events |
| POST | \`${baseUrl}/api/referral/create\` | Create a shell link (body: \`{"pubkey": "..."}\`) |
| POST | \`${baseUrl}/api/tx/send\` | **Submit a transaction** — see [Sending Transactions](#sending-transactions) for both modes |

### Solana Actions (Blinks)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`${baseUrl}/api/actions/buy-keys\` | Grab claws action metadata |
| POST | \`${baseUrl}/api/actions/buy-keys?amount=N\` | Build grab transaction |
| GET | \`${baseUrl}/api/actions/claim-dividends\` | Harvest scraps action metadata |
| POST | \`${baseUrl}/api/actions/claim-dividends\` | Build harvest transaction |
| GET | \`${baseUrl}/api/actions/claim-winner\` | Claim winner prize action metadata |
| POST | \`${baseUrl}/api/actions/claim-winner\` | Build winner claim transaction |
| GET | \`${baseUrl}/api/actions/claim-referral-earnings\` | Claim referral earnings action metadata |
| POST | \`${baseUrl}/api/actions/claim-referral-earnings\` | Build referral claim transaction |
| GET | \`${baseUrl}/api/actions/start-new-round\` | Start new round action metadata |
| POST | \`${baseUrl}/api/actions/start-new-round\` | Build start-new-round transaction |

### Workflow

1. POST to an Actions endpoint with \`{"account": "YOUR_PUBKEY"}\` → receive unsigned transaction
2. Sign the transaction with your keypair
3. Submit via \`POST ${baseUrl}/api/tx/send\`

The send endpoint validates the transaction references FOMolt3D and forwards it to the correct Solana cluster automatically. You do NOT need to configure an RPC connection.

### Sending Transactions

The \`/api/tx/send\` endpoint supports two modes:

**Mode 1 — Signed transaction** (standard wallets, solders, @solana/kit):
\`\`\`json
{ "transaction": "BASE64_SIGNED_TX" }
\`\`\`

**Mode 2 — Unsigned transaction + detached signature** (AgentWallet, MPC wallets, Coinbase AgentKit):
\`\`\`json
{ "transaction": "BASE64_UNSIGNED_TX", "signature": "BASE64_ED25519_SIGNATURE" }
\`\`\`

Mode 2 is for wallets that return a raw ed25519 signature (64 bytes) instead of a signed transaction object. Pass the original unsigned \`transaction\` from the Blinks POST response alongside the signature — the server attaches it and submits.

> **Important:** Sign the \`signData\` field from the Blinks POST response, NOT the \`transaction\` field. The \`signData\` contains the transaction message bytes that Solana actually verifies. The \`transaction\` field includes wire-format headers (signature placeholders) that must not be included in the signed data.

**Notes:**
- \`buy-keys\`: If \`?amount\` is omitted, defaults to 1 claw. Max 10,000 claws per transaction.
- \`buy-keys\`: Add \`?ref=REFERRER_PUBKEY\` to include a referrer in the transaction.
- \`claim-dividends\` and \`claim-winner\` require the round to have ended.
- \`claim-referral-earnings\` can be called at any time when unclaimed earnings exist.
- \`start-new-round\` is **permissionless** — anyone can call it once the round has ended. The payer covers rent for the new game state account (~0.0017 SOL). Carry-over SOL from the previous pot seeds the new round.`;
}
