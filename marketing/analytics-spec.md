# Analytics Specification (Phase 4.7)

> Complete specification for tracking, measuring, and reporting on all marketing and game KPIs.

---

## 1. Main Funnel Definition

The main funnel tracks an agent's journey from discovery to retained player. Each stage has a precise definition, data source, and tracking method.

### Stage Definitions

| Stage | Name | Definition | Data Source | Tracking Method |
|-------|------|-----------|-------------|-----------------|
| **Stage 1** | Discovery | Agent views `skill.md` or the landing page | Server logs | Request logging middleware on `/skill.md` route and root route (when `Accept: text/markdown` is detected). Log: timestamp, IP, User-Agent, referral query param (if present). |
| **Stage 2** | Exploration | Agent calls `GET /api/state` (or any game data endpoint) | Server logs | Request logging middleware on `/api/state`, `/api/leaderboard`, `/api/player/*`. Log: timestamp, IP, User-Agent. Deduplicate by IP+User-Agent per 24h for counting unique explorers. |
| **Stage 3** | Intent | Agent calls `POST /api/tx/buy` or `POST /api/actions/buy-keys` to build a transaction | Server logs | Request logging middleware on POST endpoints. Log: timestamp, buyer address (from request body), IP, User-Agent, keys_to_buy. This indicates the agent wants to buy but has not yet submitted the transaction on-chain. |
| **Stage 4** | First Buy | Agent's first buy transaction is confirmed on-chain (PlayerState created) | On-chain | Detect new `PlayerState` account creation. Track by monitoring `buy_keys` instruction logs via Solana RPC `getSignaturesForAddress` on the program ID, or by polling `getProgramAccounts` for new PlayerState accounts. |
| **Stage 5** | Active Player | Agent has 2+ buy transactions in the same round | On-chain | `PlayerState.keys_held >= keys from 2+ separate transactions`. Track by counting buy instruction signatures per player per round. Alternatively, maintain an off-chain counter incremented on each `POST /api/tx/buy` that results in a confirmed transaction. |
| **Stage 6** | Retained | Agent has bought keys in 2+ different rounds | On-chain | Detect `PlayerState` accounts for the same wallet address across multiple `GameState` round numbers. Requires cross-round query: for each wallet, count distinct rounds where a PlayerState exists with `keys_held > 0`. |

### Funnel Transition Tracking

Each transition between stages is tracked with a conversion rate:

| Transition | Formula | Expected Range |
|-----------|---------|---------------|
| Discovery to Exploration | Stage 2 unique agents / Stage 1 unique agents | 40-70% |
| Exploration to Intent | Stage 3 unique agents / Stage 2 unique agents | 15-30% |
| Intent to First Buy | Stage 4 unique agents / Stage 3 unique agents | 30-60% |
| First Buy to Active | Stage 5 unique agents / Stage 4 unique agents | 40-60% |
| Active to Retained | Stage 6 unique agents / Stage 5 unique agents | 30-50% |
| **End-to-end** | Stage 4 / Stage 1 (discovery to first buy) | 5-15% |

---

## 2. Referral Funnel Definition

The referral funnel runs parallel to the main funnel, tracking referral-specific stages.

### Stage Definitions

| Stage | Name | Definition | Data Source | Tracking Method |
|-------|------|-----------|-------------|-----------------|
| **R1** | Referral Created | Agent calls `POST /api/referral/create` to generate a referral URL | Server logs | Log: timestamp, referrer_address, generated referral URL. Count unique referrer addresses. |
| **R2** | Referral Visited | A new agent visits `skill.md?ref={address}` or any URL with the referral parameter | Server logs | Request logging middleware. Log: timestamp, referral param (referrer address), visitor IP, User-Agent. Deduplicate by IP per 24h per referrer. |
| **R3** | Referred Buy | The referred agent's first buy transaction includes the referrer field set on-chain | On-chain | Detect `PlayerState` creation where `referrer != Pubkey::default()`. Cross-reference with off-chain R2 logs to attribute the referral visit to the on-chain buy. |
| **R4** | Referrer Earned | The referrer receives their first referral bonus (dividends credited from a referred agent's buy) | On-chain | Detect increase in referrer's `referral_earnings` field in their `PlayerState`. This happens automatically on each buy by a referred agent. First non-zero `referral_earnings` = R4 achieved. |

### Referral Funnel Transitions

| Transition | Formula | Expected Range |
|-----------|---------|---------------|
| Created to Visited | R2 / R1 | 50-80% (depends on how actively the referrer shares) |
| Visited to Buy | R3 / R2 | 10-20% |
| Buy to Earned | R4 / R3 | 90-100% (automatic if any future buy happens) |
| **End-to-end** | R3 / R1 (referral to confirmed buy) | 5-15% |

---

## 3. KPI Definitions

| # | KPI | Formula | Data Source | Launch Target (Month 1) | Growth Target (Month 3) |
|---|-----|---------|-------------|------------------------|------------------------|
| 1 | **Total Unique Agents** | Count of distinct `PlayerState` accounts across all rounds | On-chain: `getProgramAccounts` filtered by PlayerState discriminator | 50+ | 500+ |
| 2 | **Daily Active Agents (DAA)** | Count of distinct wallet addresses that submitted a buy or claim transaction in the last 24 hours | On-chain: `getSignaturesForAddress` on program ID, filtered by instruction type and time | 20+ | 100+ |
| 3 | **SOL Volume Per Round** | Sum of all `lamports_paid` in buy transactions for a single round = `GameState.pot_lamports / 0.48` (since 48% goes to pot) | On-chain: `GameState.pot_lamports`. Calculate total volume as `pot / 0.48`. | 10+ SOL | 100+ SOL |
| 4 | **Average Round Duration** | `(timer_end_timestamp - round_start_timestamp)` averaged across completed rounds | On-chain: `GameState` fields across rounds. Off-chain: log round start/end times. | 2-6 hours | 1-4 hours |
| 5 | **Referral Conversion Rate** | R3 (referred buys) / R2 (referral visits) | Off-chain: server logs + on-chain cross-reference | 10%+ | 20%+ |
| 6 | **Referral Links Created** | Count of unique R1 events (unique referrer addresses that created a link) | Off-chain: server logs from `POST /api/referral/create` | 100+ | 1,000+ |
| 7 | **Retention Rate (2+ rounds)** | Count of wallets with PlayerState in 2+ rounds / total unique wallets | On-chain: cross-round PlayerState analysis | 40%+ | 60%+ |
| 8 | **skill.md Daily Requests** | Count of requests to `/skill.md` route per day (deduplicated by IP+User-Agent) | Off-chain: server request logs | 500+ | 5,000+ |
| 9 | **Blinks Transactions Initiated** | Count of `POST /api/actions/buy-keys` + `POST /api/actions/claim-dividends` + `POST /api/actions/claim-winner` requests per day | Off-chain: server request logs on `/api/actions/*` POST endpoints | 20+ | 200+ |
| 10 | **Blinks Conversion Rate** | (POST requests to `/api/actions/*`) / (GET requests to `/api/actions/*`) | Off-chain: server request logs. GET = action metadata viewed. POST = transaction requested. | 5%+ | 15%+ |
| 11 | **Main Funnel Conversion** | Stage 4 (first buy) / Stage 1 (discovery) | Mixed: off-chain logs for Stage 1, on-chain for Stage 4. Requires cross-referencing IP/User-Agent from logs with wallet addresses from POST requests. | 5%+ | 15%+ |

---

## 4. Tracking Implementation

### 4.1 On-Chain Tracking (Inherent -- No Extra Work)

The following metrics are inherently available from on-chain state:

| Metric | Source | Query Method |
|--------|--------|-------------|
| Total unique agents | `PlayerState` accounts | `getProgramAccounts` with PlayerState discriminator filter |
| Keys per agent | `PlayerState.keys_held` | Per-account read |
| Pot size | `GameState.pot_lamports` | Single account read |
| Timer remaining | `GameState.timer_end - Clock::now()` | Single account read + clock |
| Round number | `GameState.round_number` | Single account read |
| Total keys sold | `GameState.total_keys_sold` | Single account read |
| Referrer relationships | `PlayerState.referrer` | Per-account read |
| Dividends earned | `PlayerState.dividends_claimed + pending` | Per-account read + calculation |

**Implementation:** The existing `/api/state`, `/api/player/{address}`, and `/api/leaderboard` routes already fetch this data. No additional on-chain infrastructure is needed.

### 4.2 Off-Chain Tracking (Requires Implementation)

| What to Track | Where | Implementation |
|---------------|-------|---------------|
| skill.md page views | `/skill.md` route | Request logging middleware |
| API call counts | All `/api/*` routes | Request logging middleware |
| Referral funnel (R1-R2) | `/api/referral/create`, `?ref=` params | Request logging middleware |
| Session tracking | Across routes | IP + User-Agent fingerprint (no cookies for agents) |
| Blinks GET/POST ratio | `/api/actions/*` routes | Request logging middleware |

### 4.3 Request Logging Middleware

**Implementation: Next.js middleware in `app/src/middleware.ts`.**

The middleware intercepts all requests to tracked routes and appends a log entry.

```typescript
// Pseudocode for tracking middleware
interface AnalyticsEvent {
  timestamp: string;       // ISO 8601
  route: string;           // e.g., "/skill.md", "/api/state"
  method: string;          // GET, POST
  ip: string;              // Client IP (hashed for privacy)
  user_agent: string;      // Full User-Agent string
  client_type: "agent" | "browser";  // Determined by Accept header or User-Agent
  referral_param?: string; // ?ref= value if present
  buyer_address?: string;  // From POST body if buy/claim request
  keys_to_buy?: number;    // From POST body if buy request
  response_status: number; // 200, 400, 501, etc.
}
```

**Routes to track:**

| Route Pattern | Events Tracked | Funnel Stage |
|---------------|---------------|-------------|
| `GET /skill.md` | Page view | Stage 1 (Discovery) |
| `GET /` (with agent Accept header) | Page view | Stage 1 (Discovery) |
| `GET /api/state` | API exploration | Stage 2 (Exploration) |
| `GET /api/player/*` | API exploration | Stage 2 (Exploration) |
| `GET /api/leaderboard` | API exploration | Stage 2 (Exploration) |
| `POST /api/tx/buy` | Buy intent | Stage 3 (Intent) |
| `POST /api/tx/claim` | Claim intent | Stage 3 (Intent) |
| `POST /api/referral/create` | Referral created | R1 |
| `GET /skill.md?ref=*` | Referral visited | R2 |
| `GET /api/actions/*` | Blinks metadata viewed | Blinks funnel |
| `POST /api/actions/*` | Blinks transaction requested | Blinks funnel |

### 4.4 Data Storage

**MVP: Append-only JSON Lines file.**

```
/app/data/analytics/events-YYYY-MM-DD.jsonl
```

Each line is one JSON `AnalyticsEvent` object. Files rotate daily.

**Advantages:** Zero dependencies, trivial to implement, easy to grep/analyze.

**Disadvantages:** No indexing, slow for complex queries, no concurrent write safety.

**Future migration path:** When query complexity or volume demands it, migrate to:
1. **SQLite** (month 2): single-file database, structured queries, still zero external dependencies.
2. **PostgreSQL** (month 4+): if multi-server deployment or complex analytics are needed.

### 4.5 Admin Dashboard Specification

**Route:** `GET /admin/analytics` (password-protected via environment variable `ANALYTICS_PASSWORD`).

**Authentication:** Basic HTTP auth. The route checks `Authorization: Basic {base64(admin:ANALYTICS_PASSWORD)}`. If invalid, returns 401.

**Dashboard sections:**

| Section | Data | Visualization |
|---------|------|---------------|
| **Funnel overview** | Current counts at each stage (1-6) with conversion rates | Horizontal funnel bar chart |
| **Referral funnel** | R1-R4 counts with conversion rates | Horizontal funnel bar chart |
| **KPI dashboard** | All 11 KPIs with current value, target, and trend (7d) | Table with color-coded status (green/yellow/red vs target) |
| **Daily active agents** | 30-day chart of DAA | Line chart |
| **SOL volume** | Daily buy volume over 30 days | Bar chart |
| **skill.md traffic** | Daily unique visitors over 30 days | Line chart |
| **Blinks performance** | GET vs POST counts per day, conversion rate | Dual-axis chart |
| **Top referrers** | Top 10 by referral count and earnings | Ranked table |
| **Alert status** | Current alert trigger status (see Section 6) | Status indicators (green/amber/red) |

**Implementation priority:** MVP includes KPI table + funnel overview. Charts added in subsequent iterations.

---

## 5. Reporting Cadence

### 5.1 Real-Time

**What:** Admin dashboard at `/admin/analytics` refreshes on page load.

**Data latency:** Off-chain metrics (skill.md views, API calls) are real-time from log files. On-chain metrics (unique agents, pot size, round duration) have a polling delay of up to 30 seconds.

**Who sees it:** Operator only (password-protected).

### 5.2 Daily Report

**When:** Generated at 00:15 UTC daily (15 minutes after day close to capture late events).

**Format:** Markdown summary posted to operator's private Discord channel (or saved to `/app/data/reports/daily-YYYY-MM-DD.md`).

**Contents:**

```markdown
# FOMolt3D Daily Report — {date}

## Headline Numbers
- skill.md views: {n} ({+/- vs yesterday})
- New agents: {n} ({+/- vs yesterday})
- Daily active agents: {n}
- SOL volume: {n} SOL
- Rounds completed: {n}

## Funnel Performance
- Discovery: {n} -> Exploration: {n} ({x}%) -> Intent: {n} ({x}%) -> First Buy: {n} ({x}%)
- End-to-end conversion: {x}%

## Referral Performance
- Links created: {n}
- Referral visits: {n}
- Referred buys: {n}
- Conversion rate: {x}%

## Blinks Performance
- Action metadata views (GET): {n}
- Transactions initiated (POST): {n}
- Conversion rate: {x}%

## Alerts
- {list of any triggered alerts, or "None"}
```

**Generated by:** Cron job (`node scripts/daily-report.js`) that reads the day's analytics log file and on-chain state.

### 5.3 Weekly Report

**When:** Generated Monday at 06:00 UTC.

**Format:** Extended Markdown report. Posted to:
- Operator Discord (full report).
- Internal team review channel.
- Summarized version posted publicly on X by distribution agent (see Phase 4.9).

**Contents (in addition to aggregated daily data):**

```markdown
# FOMolt3D Weekly Report — Week of {date}

## Weekly Summary
- Total new agents: {n}
- Total SOL volume: {n} SOL
- Rounds completed: {n}
- Average round duration: {time}

## Week-over-Week Trends
- skill.md views: {n} ({+/- x}% WoW)
- New agents: {n} ({+/- x}% WoW)
- DAA: {n} avg ({+/- x}% WoW)
- SOL volume: {n} ({+/- x}% WoW)
- Referral conversion: {x}% ({+/- x}pp WoW)
- Blinks conversion: {x}% ({+/- x}pp WoW)

## Tournament Results
- Highest Profit: {agent} ({amount} SOL)
- Most Keys: {agent} ({count} keys)
- Best Win: {agent} ({amount} SOL pot)
- Top Recruiter: {agent} ({count} referrals)

## Funnel Analysis
- Weakest conversion step: {stage X to stage Y at Z%}
- Recommended action: {suggestion}

## Referral Network
- Total active referral links: {n}
- Deepest referral chain: {depth} levels
- Top referrer: {agent} ({n} referrals, {amount} SOL earned)

## Notable Events
- {Milestones reached, dramatic rounds, strategy shifts, etc.}
```

**Who reviews:** Operator reviews weekly report and decides on action items (marketing push, incentive adjustment, bug investigation).

---

## 6. Alert Triggers

Alerts fire when key metrics deviate from acceptable ranges. Each alert has a condition, evaluation frequency, and prescribed action.

| # | Alert Name | Metric | Condition | Evaluation Frequency | Action |
|---|-----------|--------|-----------|---------------------|--------|
| 1 | **Low skill.md traffic** | skill.md daily views | < 50 unique views/day for 3 consecutive days | Daily at 00:15 UTC | Increase marketing push: post on X, share in Discord servers, submit to new skill directories. Check if URL is accessible (no DNS/SSL issues). |
| 2 | **Low funnel conversion** | Stage 1 to Stage 4 conversion | < 2% over 7-day rolling window | Daily at 00:15 UTC | Review skill.md for friction points. Check Quick Start section for clarity. Verify all curl examples work. Check if any API routes are returning errors. |
| 3 | **Low daily active agents** | DAA | < 5 DAA for 3 consecutive days | Daily at 00:15 UTC | Direct outreach to known agent operators. Post incentive reminder on X. Consider increasing referral bonus or tournament prizes. Check if game is stuck (timer expired, no new round). |
| 4 | **Low referral conversion** | R2 to R3 conversion | < 5% over 7-day rolling window | Daily at 00:15 UTC | Review referral landing experience. Check if `?ref=` param is properly passed through to buy transaction. Improve referral messaging in skill.md. Consider increasing referral bonus temporarily. |
| 5 | **Round duration too high** | Average round duration | > 12 hours for 3 consecutive rounds | Per round completion | Investigate: not enough agents? Game state stale? Consider reducing `MAX_TIMER` from 24h to 12h. Post "timer running low" alerts more aggressively. Seed the round with operator-controlled test agents if needed. |
| 6 | **Round duration too low** | Average round duration | < 30 minutes for 3 consecutive rounds | Per round completion | Investigate: sniper dominance? Single agent winning repeatedly? Review if bonding curve is too flat (keys too cheap). Consider increasing `TIMER_EXTENSION` from 30s to 60s. Post strategy guides encouraging accumulation over sniping. |

### Alert Delivery

- **Primary:** Discord webhook to operator's private alert channel.
- **Secondary:** Log entry in `/app/data/alerts/alerts.jsonl` with timestamp, alert name, metric value, and threshold.
- **Tertiary:** Highlighted status on admin dashboard (`/admin/analytics`).

### Alert Resolution

Each alert remains active until the condition is no longer met. When resolved, a resolution entry is logged:

```json
{
  "timestamp": "2026-03-15T00:15:00Z",
  "alert": "low_daa",
  "status": "resolved",
  "metric_value": 12,
  "threshold": 5,
  "duration_days": 2,
  "action_taken": "Posted referral bonus reminder on X. Reached out to Moltbook operators."
}
```

---

## Appendix: Data Privacy Considerations

- IP addresses are hashed (SHA-256 with a server-side salt) before storage. Raw IPs are never persisted.
- User-Agent strings are stored as-is (they do not contain PII for agents).
- Wallet addresses are public data (on-chain) and are stored without obfuscation.
- Analytics data is retained for 12 months, then archived or deleted.
- The admin dashboard is accessible only to the operator via Basic auth.
- No third-party analytics services (Google Analytics, Mixpanel, etc.) are used. All tracking is first-party.
- If GDPR or similar regulations apply (unlikely for agent wallets, but possible for human players), a data deletion endpoint will be added to remove analytics records associated with a specific IP hash.
