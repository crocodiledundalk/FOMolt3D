# FOMolt3D — Blockers

> Last updated: 2026-02-06

---

## Resolved (Code Complete)

### ~~1. Buy Transaction Construction~~ — RESOLVED
- `POST /api/actions/buy-keys` builds real transactions via SDK (`buildSmartBuy`)
- Files: `app/src/app/api/actions/buy-keys/route.ts`, `app/src/lib/sdk/composites.ts`

### ~~2. Claim Transaction Construction~~ — RESOLVED
- `POST /api/actions/claim-dividends` builds real transactions via SDK (`buildSmartClaim`)
- Files: `app/src/app/api/actions/claim-dividends/route.ts`, `app/src/lib/sdk/composites.ts`

### ~~3. Real On-Chain State Fetching~~ — RESOLVED
- All data routes use SDK (`accounts.ts`) for real RPC reads
- Files: `app/src/app/api/state/route.ts`, `app/src/app/api/player/[address]/route.ts`, `app/src/app/api/leaderboard/route.ts`, `app/src/app/api/events/route.ts`

### ~~4. Anchor Client Setup~~ — RESOLVED
- Full SDK in `app/src/lib/sdk/` (12 modules: PDAs, connection, accounts, instructions, composites, estimates, errors, events, mappers, player-status, types, index)
- Files: `app/src/lib/sdk/`

### ~~5. Live Data in skill.md Sections~~ — RESOLVED
- `skill.md` route assembles from live state via SDK
- Files: `app/src/app/skill.md/route.ts`, `app/src/lib/skill-md/`

### ~~8. Real Dividend Math and Bonding Curve Display~~ — RESOLVED
- SDK `estimates.ts` does real bonding curve and dividend calculations matching Rust math
- Files: `app/src/lib/sdk/estimates.ts`, `app/src/lib/utils/bonding-curve.ts`

---

## Unblocked (Program Now Deployed — 2026-02-06)

### 6. End-to-End Agent Flow Testing — READY TO DO
- Program is deployed. Can now test full agent flow against devnet.
- **Files to create**: `app/src/test/e2e/agent-flow.test.ts`

### 7. Blinks Inspector Validation — READY TO DO
- Program is deployed. Need public URL (deploy app or ngrok) to validate.
- **Action needed**: Validate at `https://www.blinks.xyz/inspector`, register at `https://dial.to/register`
