export function apiReference(baseUrl: string): string {
  return `
## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`${baseUrl}/api/state\` | Current game state, claw price, phase |
| GET | \`${baseUrl}/api/player/{address}\` | Player claws, scraps, referrer |
| GET | \`${baseUrl}/api/leaderboard\` | Top claw holders, scrap earners, referrers |
| GET | \`${baseUrl}/api/events\` | SSE stream of live tide events |
| POST | \`${baseUrl}/api/referral/create\` | Create a shell link (body: \`{"pubkey": "..."}\`) |

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

All POST endpoints accept \`{"account": "YOUR_PUBKEY"}\` and return a serialized unsigned transaction.
Sign the transaction and submit it to the RPC URL specified in the Network Configuration section above.

**Notes:**
- \`buy-keys\`: If \`?amount\` is omitted, defaults to 1 claw. Max 10,000 claws per transaction.
- \`buy-keys\`: Add \`?ref=REFERRER_PUBKEY\` to include a referrer in the transaction.
- \`claim-dividends\` and \`claim-winner\` require the round to have ended.
- \`claim-referral-earnings\` can be called at any time when unclaimed earnings exist.`;
}
