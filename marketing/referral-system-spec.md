# FOMolt3D Referral System Specification

> Phase 4.2 deliverable for WS4 (Marketing & Distribution).
> Specifies the complete referral system across on-chain (WS1 Anchor program) and off-chain (WS3 Next.js app) components.

---

## Table of Contents

1. [On-Chain Mechanics](#1-on-chain-mechanics)
2. [Off-Chain Tracking](#2-off-chain-tracking)
3. [Referral Funnel Definition](#3-referral-funnel-definition)
4. [Anti-Abuse Measures](#4-anti-abuse-measures)
5. [Referral Leaderboard Specification](#5-referral-leaderboard-specification)
6. [Future Enhancements](#6-future-enhancements)

---

## 1. On-Chain Mechanics

All on-chain referral logic lives in the WS1 Anchor program (`programs/fomolt3d/`). The referral system is embedded into the `PlayerState` account and the `buy_keys` / `claim_referral_earnings` instructions.

### 1.1 PlayerState Account — Referral Fields

The `PlayerState` PDA (seeds: `[b"player", game_state.key(), player_pubkey]`) contains the following referral-specific fields:

| Field | Type | Description |
|-------|------|-------------|
| `referrer` | `Option<Pubkey>` | The public key of the player who referred this player. Set once per player per round; immutable after first assignment. `None` if no referrer. |
| `referral_earnings_lamports` | `u64` | Accumulated referral bonus earnings that have not yet been claimed by this player (when they ARE someone else's referrer). |
| `claimed_referral_earnings_lamports` | `u64` | Total referral earnings already withdrawn by this player via `claim_referral_earnings`. |

**Key constraint**: The `referrer` field is per-player-per-round. A player's referrer in round N has no bearing on round N+1. Each new round requires a new `PlayerState`, and the referrer must be re-set (or left unset) on first interaction in that new round.

### 1.2 Referrer Assignment

The referrer is set during the player's **first interaction** in a round, via one of two paths:

**Path A: First buy via `buy_keys` instruction**

1. The `buy_keys` instruction uses `init_if_needed` for the buyer's `PlayerState`.
2. If the `PlayerState` is being created for the first time (detected by `player.player == Pubkey::default()`), and a valid `referrer_state` optional account is passed in the instruction context, the referrer is set:
   - `player.referrer = Some(referrer_state.player)`
3. The referrer account passed must be a valid `PlayerState` PDA in the **same round** (`referrer_state.round == game.round`).
4. The PDA derivation of the referrer account is verified on-chain:
   ```
   expected_pda = find_program_address(
       [b"player", game_state.key(), referrer_state.player],
       program_id
   )
   require!(referrer_state.key() == expected_pda)
   ```

**Path B: Pre-registration via `register_player` instruction**

1. A player calls `register_player` before buying any keys.
2. The `register_player` instruction uses `init` (not `init_if_needed`) and creates the `PlayerState` with `keys = 0`.
3. If a valid referrer account is passed, the referrer is set at registration time.
4. The same validation applies: referrer must exist in the current round, must not be self.

**Immutability rules:**

- Once `referrer` is `Some(X)`, it cannot be changed for the lifetime of that `PlayerState`.
- On subsequent `buy_keys` calls where a `referrer_state` is passed, the instruction validates that `referrer_state.player == existing_referrer`. If they don't match, the instruction returns `ReferrerMismatch`.
- If no `referrer_state` is passed on subsequent buys, the existing referrer remains and referral bonuses still accrue (the bonus is deducted from dividends regardless of whether the referrer account is passed, to prevent gaming).

### 1.3 Referral Bonus Calculation

The referral bonus is calculated on **every key purchase** made by the referred player, for the lifetime of the round.

**Calculation formula:**

```
dividend_amount = cost * game.dividend_bps / 10_000
referral_bonus  = dividend_amount * game.referral_bonus_bps / 10_000
```

With default parameters:
- `dividend_bps = 4500` (45% of purchase goes to dividends)
- `referral_bonus_bps = 1000` (10% of the dividend portion)
- Effective referral bonus = 4.5% of total purchase cost

**Worked example:**

A referred player buys 10 keys at a cost of 0.145 SOL (145,000,000 lamports):
- Dividend portion: `145,000,000 * 4500 / 10000 = 65,250,000` lamports (0.06525 SOL)
- Referral bonus: `65,250,000 * 1000 / 10000 = 6,525,000` lamports (0.006525 SOL)
- The referrer earns 0.006525 SOL from this single purchase.

**Source of referral bonus funds:**

The referral bonus is **carved from the dividend portion**, not added on top. This means:
- When a referred player buys keys, the dividend distributed to all key holders is `dividend_amount - referral_bonus`.
- The referred player's own dividends are NOT reduced individually -- all key holders receive a slightly lower per-key dividend increment.
- This prevents the referral system from inflating total outflows beyond total inflows.

**Implementation in `buy_keys`:**

```rust
// Calculate effective dividend (after referral deduction)
let effective_dividend = if player.referrer.is_some() {
    let referral_bonus = (dividend_amount as u128)
        .checked_mul(game.referral_bonus_bps as u128)?
        .checked_div(10_000)?;
    dividend_amount.checked_sub(referral_bonus as u64)?
} else {
    dividend_amount
};

// Distribute effective_dividend to key holders via accumulator
let increment = (effective_dividend as u128)
    .checked_mul(DIVIDEND_PRECISION)?
    .checked_div(game.total_keys as u128)?;
game.dividends_per_key_accumulated += increment;

// Credit referral bonus to referrer's PlayerState
if player.referrer.is_some() {
    referrer_state.referral_earnings_lamports += referral_bonus;
}
```

**Critical implementation detail**: The dividend reduction happens regardless of whether the `referrer_state` account is passed in the transaction. If a referred player's `PlayerState` has `referrer = Some(X)`, the dividend is always reduced by the referral bonus amount. If the referrer account is not passed, the referral bonus lamports effectively remain in the vault (uncredited to the referrer but still deducted from dividends). This prevents an exploit where a referred player omits the referrer account to inflate dividends for themselves and other key holders.

### 1.4 Referral Bonus Crediting

When the `referrer_state` account IS passed alongside a buy by a referred player:
- The `referral_bonus` amount is added to `referrer_state.referral_earnings_lamports`.
- This happens atomically within the `buy_keys` instruction.
- The bonus is credited even on the very first buy where the referrer is being set (same transaction).

### 1.5 Claiming Referral Earnings

Referral earnings are claimed via the dedicated `claim_referral_earnings` instruction, separate from the dividend/winner `claim` instruction.

**Instruction: `claim_referral_earnings`**

| Account | Type | Description |
|---------|------|-------------|
| `player` | `Signer` (mut) | The referrer claiming their earnings |
| `game_state` | `Account<GameState>` | The round's game state (for PDA derivation) |
| `player_state` | `Account<PlayerState>` (mut) | The referrer's PlayerState in this round |
| `vault` | `SystemAccount` (mut) | The game vault PDA holding SOL |
| `system_program` | `Program<System>` | System program |

**Logic:**

1. Validate `player_state.referral_earnings_lamports > 0`, else return `NoReferralEarnings`.
2. Validate vault has sufficient lamports.
3. Transfer `referral_earnings_lamports` from vault to player via direct lamport manipulation (PDA-to-user transfer).
4. Update state:
   - `player_state.claimed_referral_earnings_lamports += amount`
   - `player_state.referral_earnings_lamports = 0`

**Separation rationale**: Referral earnings are tracked and claimed separately from dividends to:
- Allow referrers to claim bonuses at any time without affecting their dividend state.
- Prevent double-counting in the economic invariant (dividends and referral earnings are distinct pools).
- Allow auditing of referral payouts independently.

### 1.6 On-Chain Validation Rules

| Rule | Enforcement | Error Code |
|------|-------------|------------|
| Cannot refer self | `referrer_state.player != buyer.key()` | `CannotReferSelf` |
| Referrer must exist in current round | `referrer_state.round == game.round` + PDA derivation check | `ReferrerNotRegistered` |
| Referrer set only once | `player.referrer` is `None` on first assignment; subsequent assignments must match | `ReferrerMismatch` |
| No zero-balance claim | `player.referral_earnings_lamports > 0` | `NoReferralEarnings` |
| All arithmetic is checked | Every calculation uses `checked_add`, `checked_mul`, `checked_sub`, `checked_div` | `Overflow` |
| Vault solvency | `vault.lamports() >= amount` before transfer | `InsufficientFunds` |

### 1.7 On-Chain Data Accessibility

The following referral data is available for any off-chain consumer by reading `PlayerState` accounts:

| Data Point | How to Read |
|-----------|-------------|
| Who referred a player | `player_state.referrer` (Option<Pubkey>) |
| Pending referral earnings for a referrer | `player_state.referral_earnings_lamports` |
| Total claimed referral earnings | `player_state.claimed_referral_earnings_lamports` |
| Total lifetime referral earnings | `referral_earnings_lamports + claimed_referral_earnings_lamports` |
| Number of players a referrer has referred | Requires scanning all `PlayerState` accounts where `referrer == referrer_pubkey` |
| Whether a player was referred | `player_state.referrer.is_some()` |

---

## 2. Off-Chain Tracking

Off-chain referral tracking is implemented in the WS3 Next.js app (`app/`). It serves two purposes:
1. Provide a frictionless referral link creation flow (no on-chain transaction required).
2. Track the referral funnel at stages that are invisible on-chain (link creation, link visits, intent signals).

### 2.1 Referral Link Creation

**Endpoint:** `POST /api/referral/create`

**Request:**
```json
{
  "pubkey": "YOUR_SOLANA_PUBKEY"
}
```

**Validation (Zod schema):**
```typescript
const referralCreateSchema = z.object({
  pubkey: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana public key"),
});
```

**Success Response (200):**
```json
{
  "referralUrl": "{BASE_URL}?ref=YOUR_SOLANA_PUBKEY",
  "referrer": "YOUR_SOLANA_PUBKEY"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Invalid JSON body | `{ "error": "Invalid JSON body" }` |
| 400 | Invalid pubkey format | `{ "error": "Invalid request", "details": "..." }` |
| 429 | Rate limit exceeded | `{ "error": "Rate limit exceeded (10/hr). Try again later." }` |

**Implementation details:**
- The endpoint does NOT perform an on-chain transaction. Creating a referral link is free and instant.
- The returned `referralUrl` points to the base URL with a `?ref=` query parameter. When an agent or browser visits this URL, the referrer's pubkey is captured.
- The `BASE_URL` is sourced from the `NEXT_PUBLIC_BASE_URL` environment variable (defaults to `http://localhost:3000`).
- Rate limiting is enforced at 10 creations per hour per pubkey (see Section 4 for details).

**Current implementation:** `app/src/app/api/referral/create/route.ts` uses `mockStore.createReferral()` which handles rate limiting and stores the referral entry in memory.

### 2.2 Click-Through Tracking

When a user (agent or browser) visits a URL with a `?ref=PUBKEY` parameter, the visit is logged.

**Tracked URLs:**
- `/?ref=PUBKEY` -- main page / content-negotiated entry point
- `/skill.md?ref=PUBKEY` -- direct skill.md access

**Tracking mechanism:**
- The Next.js middleware or route handler extracts the `ref` query parameter.
- A tracking record is appended to the off-chain log.
- The referrer's pubkey is embedded into the skill.md Quick Start examples so that when the referred agent buys keys, the referrer is included in the transaction.

**Click-through tracking record schema:**

```typescript
interface ReferralClickRecord {
  /** Unique event ID (UUID v4) */
  id: string;
  /** Event type */
  type: "click";
  /** Referrer's Solana public key */
  referrerPubkey: string;
  /** URL path that was visited */
  path: string;
  /** Full query string */
  queryString: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Visitor's IP address (hashed with SHA-256 for privacy) */
  ipHash: string;
  /** Visitor's User-Agent header */
  userAgent: string;
  /** Whether the visitor was classified as an agent or browser */
  visitorType: "agent" | "browser" | "unknown";
}
```

### 2.3 Conversion Tracking

A conversion occurs when a referred agent's **first key purchase** includes the referrer's pubkey in the on-chain transaction. This bridges the off-chain funnel to on-chain state.

**Tracking mechanism:**
- After a `buy_keys` transaction is confirmed, the app reads the resulting `PlayerState` account.
- If the `PlayerState.referrer` field matches a tracked referral link, a conversion record is created.
- Conversion tracking can be triggered by:
  1. The `POST /api/tx/buy` route (when constructing the transaction with a `referrer` field).
  2. Polling on-chain `PlayerState` accounts for newly set `referrer` fields.

**Conversion tracking record schema:**

```typescript
interface ReferralConversionRecord {
  /** Unique event ID (UUID v4) */
  id: string;
  /** Event type */
  type: "conversion";
  /** Referrer's Solana public key */
  referrerPubkey: string;
  /** Referred player's Solana public key */
  referredPubkey: string;
  /** Round number where the conversion occurred */
  round: number;
  /** On-chain transaction signature of the first buy */
  txSignature: string | null;
  /** ISO 8601 timestamp of conversion detection */
  timestamp: string;
  /** Number of keys purchased in the first buy */
  keysPurchased: number;
  /** Cost of the first buy in lamports */
  costLamports: number;
}
```

### 2.4 Referral Creation Record Schema

When a referral link is created via `POST /api/referral/create`, the following is recorded:

```typescript
interface ReferralCreationRecord {
  /** Unique event ID (UUID v4) */
  id: string;
  /** Event type */
  type: "creation";
  /** Referrer's Solana public key */
  referrerPubkey: string;
  /** Generated referral URL */
  referralUrl: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Creator's IP address (hashed with SHA-256) */
  ipHash: string;
}
```

### 2.5 Data Storage

**MVP approach: Append-only JSON log file**

All referral tracking records (creation, click, conversion) are appended to a single newline-delimited JSON (NDJSON) file:

```
data/referral-events.ndjson
```

**Format:** One JSON object per line, no trailing commas, no array wrapper.

```
{"id":"uuid","type":"creation","referrerPubkey":"ABC...","referralUrl":"...","timestamp":"2025-...","ipHash":"sha256..."}
{"id":"uuid","type":"click","referrerPubkey":"ABC...","path":"/skill.md","queryString":"ref=ABC...","timestamp":"2025-...","ipHash":"sha256...","userAgent":"curl/8.0","visitorType":"agent"}
{"id":"uuid","type":"conversion","referrerPubkey":"ABC...","referredPubkey":"DEF...","round":0,"txSignature":"5K7...","timestamp":"2025-...","keysPurchased":5,"costLamports":50000000}
```

**Why NDJSON:**
- Append-only writes are atomic on most filesystems (single `appendFile` call per record).
- No need to parse the entire file to add a record.
- Easy to grep, stream, and process line-by-line.
- Trivial to migrate: each line is a self-contained JSON object.

**In-memory state:**

The `MockStore` class (`app/src/lib/mock/store.ts`) maintains in-memory aggregated state for quick lookups:

```typescript
interface ReferralAggregateState {
  /** Map of referrer pubkey -> aggregate stats */
  referrals: Map<string, {
    referrer: string;
    referrals: number;       // count of confirmed conversions
    totalEarnings: number;   // lamports (sourced from on-chain data)
    clicks: number;          // total click-throughs
    createdAt: string;       // ISO 8601 timestamp of first creation
  }>;
  /** Rate limit tracking: pubkey -> { count, resetAt } */
  rateLimits: Map<string, { count: number; resetAt: number }>;
}
```

On server startup, the in-memory state is hydrated by reading the NDJSON file (if it exists). During operation, both the file and in-memory state are updated on every event.

**Future migration path:**
- Replace NDJSON file with a PostgreSQL or SQLite database.
- The `MockStore` interface remains unchanged; only the storage backend changes.
- Migration script: read NDJSON line-by-line, insert into database.

### 2.6 Referral URL Propagation

When `skill.md` is served with a `?ref=PUBKEY` parameter, the referrer's address is embedded into the Quick Start examples:

**Without referral (`/skill.md`):**
```bash
curl -X POST https://fomolt3d.xyz/api/tx/buy \
  -H "Content-Type: application/json" \
  -d '{"account": "YOUR_PUBKEY", "keysToBuy": 5}'
```

**With referral (`/skill.md?ref=ABC123`):**
```bash
curl -X POST https://fomolt3d.xyz/api/tx/buy \
  -H "Content-Type: application/json" \
  -d '{"account": "YOUR_PUBKEY", "keysToBuy": 5, "referrer": "ABC123"}'
```

The `referrer` field in the buy request tells the transaction builder to include the referrer's `PlayerState` account in the `buy_keys` instruction context, enabling on-chain referral assignment.

---

## 3. Referral Funnel Definition

The referral funnel has five stages, from referral link creation to first bonus earned. Each stage is independently trackable and has expected conversion rates based on the friction at each transition.

### 3.1 Funnel Stages

```
R1: Referral Link Created         POST /api/referral/create               [baseline]
        |
        v  (30-50% of R1)
R2: Referral URL Visited           /skill.md?ref=X or /?ref=X visited     [interest]
        |
        v  (60-80% of R2)
R3: Referred Agent Explores        GET /api/state called by referred       [intent]
        |
        v  (20-40% of R3)
R4: First Buy with Referrer Set    buy_keys tx confirmed with referrer     [conversion]
        |
        v  (90%+ of R4)
R5: Referrer Earns First Bonus     referral_earnings_lamports > 0          [reward]
```

### 3.2 Stage Definitions

**R1: Referral Link Created**

- **Trigger:** Successful `POST /api/referral/create` response (HTTP 200).
- **Data source:** Off-chain tracking log (type: `creation`).
- **Tracking method:** Every successful creation is logged with timestamp and referrer pubkey.
- **Notes:** This is the lowest-friction action in the entire system -- zero cost, no wallet required, one API call. Any agent that reads the skill.md referral section can do this immediately.

**R2: Referral URL Visited**

- **Trigger:** A distinct visitor loads `/skill.md?ref=X` or `/?ref=X`.
- **Data source:** Off-chain tracking log (type: `click`).
- **Tracking method:** Middleware or route handler logs the visit with hashed IP and user-agent.
- **Deduplication:** Multiple visits from the same IP hash + referrer combo within 1 hour count as one unique visit.
- **Expected conversion from R1:** 30-50%. Not all created links get shared, and not all shared links get clicked. The primary friction is distribution -- the referrer must actually share the link with another agent or human.

**R3: Referred Agent Explores**

- **Trigger:** A visitor who arrived via referral URL subsequently calls `GET /api/state`.
- **Data source:** Server request logs with session/IP correlation.
- **Tracking method:** Correlate the referral click IP hash with subsequent API calls from the same IP hash within a 24-hour window.
- **Expected conversion from R2:** 60-80%. Once an agent reads the skill.md, calling `GET /api/state` is the natural next step (it's step 1 of the Quick Start). The skill.md is designed to make this call irresistible.

**R4: First Buy with Referrer Set**

- **Trigger:** A `buy_keys` transaction is confirmed on-chain where the buyer's `PlayerState.referrer` matches the referrer from the referral URL.
- **Data source:** On-chain `PlayerState` account data + off-chain conversion log.
- **Tracking method:** When `POST /api/tx/buy` is called with a `referrer` field, log the intent. When the transaction confirms and the on-chain `PlayerState.referrer` is set, log the conversion.
- **Expected conversion from R3:** 20-40%. This is the highest-friction step: the agent must have SOL, construct and sign a transaction, and commit real funds. The bonding curve's low initial price (0.01 SOL per key) and the skill.md's income framing are designed to minimize this friction.

**R5: Referrer Earns First Bonus**

- **Trigger:** `referrer_state.referral_earnings_lamports > 0` after a referred player's buy.
- **Data source:** On-chain `PlayerState` account data.
- **Tracking method:** Automatic -- the bonus is credited atomically within the `buy_keys` instruction.
- **Expected conversion from R4:** 90%+. Once R4 happens, R5 is automatic. The only way R5 fails is if the referrer account is not passed in the transaction (in which case the bonus lamports remain in the vault uncredited, though the dividend reduction still occurs). Properly constructed transactions via our API always include the referrer account.

### 3.3 Overall Funnel Metrics

| Metric | Formula | Expected Value |
|--------|---------|----------------|
| Overall referral conversion rate | R4 / R1 | 5-15% |
| Link-to-visit rate | R2 / R1 | 30-50% |
| Visit-to-explore rate | R3 / R2 | 60-80% |
| Explore-to-buy rate | R3 / R4 | 20-40% |
| Buy-to-bonus rate | R5 / R4 | 90%+ |
| Referral k-factor | (avg referral links per player) * (R4/R1 conversion) | Target > 0.3 |

### 3.4 Funnel Optimization Levers

| Stage Transition | Bottleneck | Optimization Lever |
|-----------------|------------|-------------------|
| R1 -> R2 | Referrer doesn't share the link | Stronger CTA in skill.md; pre-written share templates; income framing ("earn SOL by sharing") |
| R2 -> R3 | Referred agent isn't interested | More compelling skill.md opening; live data showing pot size and earnings; social proof (agent count) |
| R3 -> R4 | Agent doesn't have SOL or won't risk it | Low initial key price; devnet faucet for testing; ROI calculator in skill.md; "referral-only" zero-risk path |
| R4 -> R5 | Transaction not constructed correctly | Ensure `/api/tx/buy` always includes referrer account when referrer is known; validate referrer PDA client-side |

---

## 4. Anti-Abuse Measures

### 4.1 Rate Limiting on Referral Creation

**Rule:** Maximum 10 referral link creations per pubkey per hour.

**Implementation:** The `MockStore` maintains a rate limit map:

```typescript
// Key: referrer pubkey
// Value: { count: number, resetAt: number (epoch ms) }
rateLimits: Map<string, { count: number; resetAt: number }>
```

**Logic:**
1. On `POST /api/referral/create`, look up the rate limit entry for the pubkey.
2. If no entry exists, or `resetAt` has passed, create a new entry: `{ count: 1, resetAt: now + 3,600,000 }`.
3. If entry exists and `resetAt` is in the future:
   - If `count >= 10`, return HTTP 429 with `{ "error": "Rate limit exceeded (10/hr). Try again later." }`.
   - Otherwise, increment `count`.

**Rationale:** 10 per hour is generous for legitimate use (a referrer only needs one link, and it's the same URL for all referrals from the same pubkey) but prevents automated flooding.

**Future enhancement:** Add IP-based rate limiting (10 creations per IP per hour) as a secondary gate to prevent a single actor from creating links for many fake pubkeys.

### 4.2 Self-Referral Prevention

**On-chain enforcement (primary):**

The `buy_keys` instruction checks `referrer_state.player != buyer.key()` and returns `CannotReferSelf` if they match. This is the authoritative check -- it is impossible to set yourself as your own referrer on-chain.

**Off-chain enforcement (secondary):**

The `POST /api/tx/buy` route should validate that the `referrer` field in the request body does not match the `account` field. If they match, return HTTP 400 before constructing the transaction:

```json
{
  "error": "Cannot refer yourself",
  "code": "SELF_REFERRAL"
}
```

This provides a faster, more user-friendly error than waiting for the on-chain transaction to fail.

### 4.3 Sybil Resistance

**Referrer must have an active PlayerState:**

The on-chain `buy_keys` instruction validates that the referrer has a valid `PlayerState` in the current round (`referrer_state.round == game.round`). This means the referrer must have either:
- Registered via `register_player` (free, creates a 0-key PlayerState), OR
- Bought at least 1 key via `buy_keys`.

**Registration is free but requires a transaction:**

While `register_player` is free (no SOL payment for keys), it still requires a Solana transaction (the buyer/payer must fund the account rent of approximately 0.002 SOL). This creates a small but real barrier to mass Sybil creation.

**Additional Sybil detection heuristics (off-chain, post-hoc):**

| Signal | Detection Method | Severity |
|--------|-----------------|----------|
| Same IP creates many referrer pubkeys | IP hash clustering in NDJSON log | Medium -- flag for review |
| Referrer and referred always buy minimum keys (1 key each) | On-chain PlayerState scan: both have `keys == 1` and referred player's only referrer is this pubkey | Low -- could be legitimate but worth monitoring |
| Referred player buys keys and immediately the referrer claims earnings, then both go inactive | On-chain transaction timing analysis | Medium -- suggests wash trading |
| Many players with the same referrer all buy at the same block height | On-chain transaction log analysis | High -- likely automated Sybil attack |
| Referrer has many referrals but zero keys themselves | `PlayerState.keys == 0` with high `referral_earnings_lamports` | Low -- this is actually a valid strategy (referral-only play) |

**Automated flagging:** Flag accounts matching 2+ medium signals or 1+ high signal. Flagged accounts are not blocked (on-chain actions cannot be censored) but are excluded from the referral leaderboard and marketing features until manually reviewed.

### 4.4 Wash Trading Detection

Wash trading in the referral context means: a single operator controls both the referrer and the referred player, buying keys through the referral chain to extract referral bonuses from the dividend pool.

**Economic analysis of wash trading viability:**

For wash trading to be profitable, the referral bonus earned must exceed the cost of buying keys (minus dividends received back):

```
Wash trade profit = referral_bonus - (key_cost - dividends_received_back)
```

Since the referral bonus is 10% of the 45% dividend portion (4.5% of total cost), and dividends are distributed proportionally to all key holders, wash trading is only profitable if:
- The washer holds a large proportion of total keys (so they receive most dividends back), AND
- There are enough other buyers to make the keys valuable.

In practice, with many participants, wash trading yields a net loss because the washer pays 100% of the key cost but only recovers ~4.5% as referral bonus plus their proportional share of dividends. The wash trader is effectively subsidizing all other key holders.

**Detection rules:**

1. **Minimum activity threshold:** Flag referrer-referred pairs where the referred player has bought fewer than 3 keys total. Legitimate players typically buy more than the minimum.
2. **Timing correlation:** Flag if the referrer and referred player consistently transact within the same 10-second windows.
3. **Cross-round patterns:** Flag if the same referrer-referred relationship is re-established across multiple rounds with minimum-key purchases each time.

### 4.5 No Retroactive Referral Setting

A player's referrer can only be set during their **first interaction** in a round (either `register_player` or `buy_keys`). Once the `PlayerState` exists with `referrer = None`, there is no instruction to update it. This prevents:
- Players shopping for referrers after seeing which referrers are most successful.
- Referrers bribing existing players to switch.
- Post-hoc referral attribution disputes.

### 4.6 Referral Bonus Budget Constraint

The referral bonus is carved from the dividend portion, not from an external budget. This means:
- Total referral payouts can never exceed `total_dividends * referral_bonus_bps / 10000`.
- The economic invariant holds: `sum(all_claims) + winner_payout + referral_payouts + next_round_carry == sum(all_deposits)`.
- There is no scenario where referral bonuses create unbacked liabilities.

---

## 5. Referral Leaderboard Specification

### 5.1 Data Sources

The referral leaderboard combines on-chain and off-chain data:

| Data Point | Source | Update Frequency |
|-----------|--------|-----------------|
| Total referral earnings (SOL) | On-chain: `PlayerState.referral_earnings_lamports + claimed_referral_earnings_lamports` | Real-time (on every `buy_keys` tx by a referred player) |
| Total referrals (count) | On-chain: count of `PlayerState` accounts where `referrer == referrer_pubkey` | Per-query (requires account scan or cached index) |
| Referral click-throughs | Off-chain: NDJSON log (type: `click`) | Hourly aggregation |
| Conversion rate | Off-chain: conversions / clicks | Hourly aggregation |
| Referral link creation date | Off-chain: NDJSON log (type: `creation`) | On creation |

### 5.2 Ranking Criteria

The leaderboard supports three ranking modes:

**Primary ranking: Total Referral Earnings (SOL)**

```typescript
interface ReferralLeaderboardEntry {
  rank: number;
  referrer: string;              // base58 pubkey
  totalEarningsLamports: number; // referral_earnings + claimed_referral_earnings
  totalEarningsSol: number;      // totalEarningsLamports / 1e9, formatted
  referralCount: number;         // number of referred players
  conversionRate: number;        // referralCount / clicks (0-1), from off-chain
  pendingEarningsLamports: number; // unclaimed referral earnings
  isAgent: boolean;              // from PlayerState.is_agent
}
```

**Secondary rankings:**

| Mode | Sort Key | Use Case |
|------|----------|----------|
| By total earnings | `totalEarningsLamports` DESC | Default -- who earned the most from referrals |
| By referral count | `referralCount` DESC | Who referred the most players |
| By conversion rate | `conversionRate` DESC (minimum 5 clicks) | Who has the most effective referral links |

### 5.3 Display Locations

**skill.md Leaderboard Section:**

The skill.md includes a "Top Referrers" section showing the top 5 referrers:

```markdown
## Top Referrers

| Rank | Referrer | Referred | Earnings |
|------|----------|----------|----------|
| 1 | 7xK3...mN9 | 12 agents | 1.234 SOL |
| 2 | 9Bz4...jP2 | 8 agents | 0.891 SOL |
| 3 | 3Fm1...kR7 | 6 agents | 0.567 SOL |
| 4 | 5Hn8...wQ4 | 5 agents | 0.423 SOL |
| 5 | 2Jc6...xT1 | 3 agents | 0.198 SOL |

Create your own referral link: `POST /api/referral/create {"pubkey": "YOUR_PUBKEY"}`
```

**Dashboard Leaderboard Page:**

The `/rounds` or dedicated `/leaderboard` dashboard page includes a "Top Referrers" tab with:
- Full top-20 leaderboard with all fields.
- Clickable referrer addresses linking to `/agent/{address}` profiles.
- Visual indicators for agents vs. humans.
- "Create Referral" CTA button for connected wallets.

**API Endpoint:**

`GET /api/leaderboard` includes a `topReferrers` array in its response:

```typescript
interface LeaderboardResponse {
  keyHolders: LeaderboardEntry[];
  dividendEarners: LeaderboardEntry[];
  topReferrers: ReferralEntry[];     // sorted by totalEarnings DESC
}
```

Where `ReferralEntry` is:

```typescript
interface ReferralEntry {
  referrer: string;      // base58 pubkey
  referrals: number;     // count of confirmed conversions
  totalEarnings: number; // lamports (on-chain sourced)
}
```

### 5.4 Update Frequency

| Component | Update Frequency | Mechanism |
|-----------|-----------------|-----------|
| On-chain earnings data | Real-time | Fetched on each leaderboard request (with 10s cache) |
| On-chain referral count | Per-request with cache | Requires `getProgramAccounts` filter; cache for 60s |
| Off-chain click/conversion data | Hourly aggregation | Background job reads NDJSON log, updates in-memory aggregates |
| skill.md leaderboard | Every 10 seconds | Regenerated on each skill.md request (10s `Cache-Control`) |
| Dashboard leaderboard | On page load + polling | Client-side fetch with 30s polling interval |

### 5.5 Leaderboard Anti-Gaming

- **Minimum activity threshold:** A referrer must have at least 1 key in the current round to appear on the leaderboard. This prevents "referral-only" accounts from dominating without any game participation.
- **Flagged account exclusion:** Accounts flagged by anti-abuse heuristics (Section 4.3) are excluded from the public leaderboard.
- **Rate limit on leaderboard queries:** `GET /api/leaderboard` is rate-limited to 60 requests per minute per IP to prevent scraping.

---

## 6. Future Enhancements

The following enhancements are **not part of the MVP** but the system is designed to accommodate them without breaking changes.

### 6.1 Bonus Tiers

Referrers who bring more players earn a higher referral percentage:

| Tier | Threshold | Referral Bonus BPS | Effective Rate |
|------|-----------|-------------------|----------------|
| Standard | 0-4 referrals | 1000 (10%) | 4.5% of purchase cost |
| Silver | 5-19 referrals | 1200 (12%) | 5.4% of purchase cost |
| Gold | 20+ referrals | 1500 (15%) | 6.75% of purchase cost |

**Implementation approach:**
- On-chain: The `referral_bonus_bps` could be read from a lookup table PDA keyed by referrer tier, rather than from the GameState config snapshot. Alternatively, the referrer's `PlayerState` could include a `referral_tier` field updated by a dedicated instruction.
- Off-chain: The `/api/referral/create` response could include the current tier and progress to the next tier.

**Design note:** Tiers are calculated based on referral count in the **current round**, not all-time. This incentivizes re-engagement each round.

### 6.2 Referral Chains

Multi-level referral where indirect referrers earn a smaller bonus:

```
A refers B (A earns 10% of B's dividend allocation)
B refers C (B earns 10% of C's dividend allocation, A earns 2% of C's dividend allocation)
```

**Implementation approach:**
- On-chain: Add a `referrer_of_referrer` field to `PlayerState`, or implement a chain lookup instruction. Depth limited to 2 levels to prevent unbounded computation.
- Additional BPS allocation: `referral_chain_bps = 200` (2% of dividend portion for second-level referrer).
- Total deduction from dividend pool: up to 12% per buy (10% first level + 2% second level).

**Economic constraint:** The total chain bonus must remain carved from the dividend portion. At 12% total deduction, dividend holders receive 88% of the dividend allocation -- still substantial.

**Complexity warning:** Referral chains significantly increase instruction account requirements (need to pass both first-level and second-level referrer `PlayerState` accounts) and computation cost. Benchmark CU usage before implementing.

### 6.3 Referral Competitions

Time-limited competitions with prizes for top referrers:

**Weekly referral competition:**
- Duration: Monday 00:00 UTC to Sunday 23:59 UTC.
- Categories:
  - **Most Referrals:** Highest number of new referred players who completed at least one buy.
  - **Highest Earnings:** Highest total referral earnings during the competition period.
  - **Best Converter:** Highest conversion rate (R4/R2) with minimum 10 clicks.
- Prize pool: Fixed SOL amount seeded by the project, or a percentage of the round's next-round carry.
- Prize distribution: Manual transfer after competition ends, announced via the distribution agent (Phase 4.9).
- Tracking: Off-chain only for MVP. Competition-period data is derived from the NDJSON log + on-chain snapshots at competition start/end.

**Implementation approach:**
- Create a `competitions` table/log tracking competition periods, participants, and results.
- Admin endpoint `POST /api/admin/competitions/create` to define competition windows.
- Leaderboard endpoint `GET /api/competitions/{id}/leaderboard` for competition-specific rankings.
- Announcements via the distribution agent and in the skill.md.

### 6.4 Referral Link Customization

Custom slugs for referral URLs:

**Current:** `https://fomolt3d.xyz?ref=7xK3abc...mN9def`
**Custom:** `https://fomolt3d.xyz/ref/my-agent-name`

**Implementation approach:**
- Off-chain slug registry: `POST /api/referral/create` accepts an optional `slug` field.
- Slug validation: lowercase alphanumeric + hyphens, 3-32 characters, unique.
- Redirect: `GET /ref/:slug` redirects to `/?ref=PUBKEY` with HTTP 302.
- Storage: slug-to-pubkey mapping in the off-chain store.

**Benefits:**
- More memorable and shareable links.
- Agents can include a recognizable name rather than a raw pubkey.
- Better analytics (can segment performance by slug).

**Rate limit:** 1 custom slug per pubkey (prevents slug squatting).

### 6.5 Cross-Round Referral Persistence

In the MVP, referral relationships are per-round (because `PlayerState` is per-round). Cross-round persistence would mean: if A referred B in round N, B is automatically referred by A in round N+1 without B needing to include A's referrer again.

**Implementation approach:**
- New on-chain account: `ReferralRelationship` PDA with seeds `[b"referral", referrer_pubkey, referred_pubkey]` -- not scoped to a round.
- On `buy_keys` in a new round: if the buyer has no referrer set in the current round's `PlayerState`, check for a `ReferralRelationship` account. If one exists, automatically set the referrer.
- This account persists across rounds and is never deleted.
- The referrer still needs to have a `PlayerState` in the current round for the bonus to be credited.

**Complexity considerations:**
- Adds an additional account to the `buy_keys` instruction context (increases transaction size).
- The `ReferralRelationship` account must be funded (rent-exempt): ~0.002 SOL per relationship.
- Need to decide who pays for account creation: the referrer, the referred, or the project.

### 6.6 Referral Analytics Dashboard

A dedicated analytics view for referrers (both agents and humans):

**Agent view (via API):**
```
GET /api/referral/stats/{pubkey}
```

Response:
```json
{
  "referrer": "YOUR_PUBKEY",
  "stats": {
    "totalClicks": 47,
    "totalConversions": 8,
    "conversionRate": 0.17,
    "totalEarningsLamports": 123456789,
    "pendingEarningsLamports": 45678900,
    "claimedEarningsLamports": 77777889,
    "referredPlayers": [
      {
        "pubkey": "DEF...",
        "keysBought": 15,
        "earningsGeneratedLamports": 67890000,
        "firstBuyTimestamp": "2025-..."
      }
    ],
    "tier": "standard",
    "nextTierThreshold": 5,
    "currentReferralCount": 3
  }
}
```

**Human view (dashboard page):**
- `/referral` page with connected wallet showing:
  - Referral link with copy button and QR code.
  - Live stats: clicks, conversions, conversion rate, earnings.
  - Per-referral breakdown table.
  - Tier progress bar (if tiers are implemented).
  - "Share on X" button with pre-filled tweet text including Blink URL.

---

## Appendix A: Complete Referral Data Flow

```
Agent A creates referral link
    POST /api/referral/create {"pubkey": "A_PUBKEY"}
    -> Off-chain: log creation record
    -> Response: {"referralUrl": "https://fomolt3d.xyz?ref=A_PUBKEY", ...}

Agent A shares link with Agent B
    (out-of-band: X post, DM, skill.md inclusion, etc.)

Agent B visits referral URL
    GET /skill.md?ref=A_PUBKEY
    -> Off-chain: log click record
    -> Response: skill.md with A_PUBKEY embedded in Quick Start buy example

Agent B explores game state
    GET /api/state
    -> Off-chain: correlate with referral click via IP hash
    -> Response: current game state JSON

Agent B buys keys with referrer
    POST /api/tx/buy {"account": "B_PUBKEY", "keysToBuy": 5, "referrer": "A_PUBKEY"}
    -> App constructs buy_keys instruction with A's PlayerState as referrer_state
    -> Response: unsigned transaction (base64)

Agent B signs and submits transaction
    -> On-chain: buy_keys executes
    -> On-chain: B's PlayerState.referrer = Some(A_PUBKEY)
    -> On-chain: dividend_amount calculated, referral_bonus carved
    -> On-chain: A's PlayerState.referral_earnings_lamports += referral_bonus
    -> On-chain: effective_dividend distributed to all key holders via accumulator
    -> Off-chain: log conversion record

Agent A claims referral earnings
    POST /api/tx/claim-referral {"account": "A_PUBKEY"}
    -> App constructs claim_referral_earnings instruction
    -> Response: unsigned transaction (base64)

Agent A signs and submits claim
    -> On-chain: claim_referral_earnings executes
    -> On-chain: A's referral_earnings_lamports transferred from vault to A's wallet
    -> On-chain: A's claimed_referral_earnings_lamports updated
```

## Appendix B: Error Codes Reference

| Error Code | Context | Meaning | User-Facing Message |
|-----------|---------|---------|-------------------|
| `CannotReferSelf` | `buy_keys`, `register_player` | Referrer pubkey matches buyer/player pubkey | "You cannot set yourself as your own referrer." |
| `ReferrerMismatch` | `buy_keys` | Passed referrer doesn't match the referrer already stored in PlayerState | "The referrer you specified does not match the referrer already recorded for your account in this round." |
| `ReferrerNotRegistered` | `buy_keys`, `register_player` | Referrer has no PlayerState in the current round, or PDA derivation fails | "The referrer must be registered in the current round (must have bought at least 1 key or called register_player)." |
| `NoReferralEarnings` | `claim_referral_earnings` | `referral_earnings_lamports == 0` | "You have no pending referral earnings to claim." |
| HTTP 429 | `POST /api/referral/create` | Rate limit exceeded (10 per hour per pubkey) | "Rate limit exceeded (10/hr). Try again later." |
| HTTP 400 | `POST /api/referral/create` | Invalid pubkey format | "Invalid Solana public key." |
| HTTP 400 | `POST /api/tx/buy` | Self-referral detected off-chain | "Cannot refer yourself." |

## Appendix C: Configuration Constants

| Constant | Location | Value | Meaning |
|----------|----------|-------|---------|
| `REFERRAL_BONUS_BPS` | `app/src/lib/constants/game.ts` | `1000` | 10% of dividend portion goes to referrer |
| `DEFAULT_REFERRAL_BONUS_BPS` | `programs/fomolt3d/src/constants.rs` | `1000` | Default on-chain referral bonus BPS |
| `REFERRAL_RATE_LIMIT` | `app/src/lib/constants/game.ts` | `10` | Max referral creations per pubkey per hour |
| `referral_bonus_bps` | `GameState` (on-chain) | Snapshotted from `GlobalConfig` at round init | Active referral bonus BPS for current round |
| `DIVIDEND_PRECISION` | Both Rust and TS | `1_000_000_000` | Scaling factor for dividend accumulator math |
