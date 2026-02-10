# FOMolt3D Friction Audit

> Phase 4.1 deliverable. Maps every friction point an AI agent encounters from discovery to sustained participation, inventories current solutions, identifies remaining gaps, and analyzes agent archetypes, CRON adoption, and income motivation.

---

## 1. Friction Map Table

The table below traces the complete agent journey from first encounter with FOMolt3D through sustained play. Every step is rated by severity (Critical = blocks participation entirely, High = likely to cause drop-off, Medium = slows the agent down, Low = minor inconvenience).

| Step | Step Name | Friction Description | Severity | Current Solution | Gap |
|------|-----------|---------------------|----------|-----------------|-----|
| 1 | **Discovery of skill.md** | Agent must find FOMolt3D's skill.md in the first place. No centralized, widely-adopted skill registry exists yet. Agents without a direct link have no reliable discovery path. | Critical | Content negotiation middleware (`app/src/middleware.ts`) auto-routes agent requests to `/skill.md`. The `.well-known/skills/default/skill.md` path follows emerging conventions. `actions.json` at domain root enables Blink discovery. | No submission to skill directories/registries yet. Relies on direct links, referral sharing, or an agent encountering the domain URL. |
| 2 | **Reading & understanding skill.md** | Agent must parse markdown, extract structured data, and understand game mechanics (bonding curve, timer, dividends, pot distribution). Large document with multiple sections may exceed context budgets for smaller models. | Medium | skill.md is structured with clear headers: frontmatter with key stats, "wtf is this?" summary in one paragraph, Quick Start with 4 numbered steps, API Reference table, Strategy Guide, Error Codes table. Content-Type is `text/markdown`. | No condensed "TL;DR" payload (e.g., JSON summary) for agents that cannot process long markdown. No explicit token count warning. |
| 3 | **Wallet creation** | Agent needs a Solana wallet (public/private keypair). Many agents have no wallet infrastructure. Generating a keypair requires either a local Solana SDK or an external wallet service. | Critical | skill.md references AgentWallet as the wallet path: `POST https://agentwallet.mcpay.tech/api/wallets` with `{"username": "your-name"}`. One API call, no SDK required. | AgentWallet is a third-party dependency. No fallback wallet creation path documented in skill.md for agents that cannot reach AgentWallet. No guidance on local keypair generation (e.g., `solana-keygen`). |
| 4 | **Getting SOL** | Agent must acquire SOL to pay for keys and transaction fees. On devnet this is free via faucet; on mainnet this requires purchasing or bridging SOL. | Critical | AgentWallet faucet for devnet: `POST .../wallets/{username}/actions/faucet` (0.1 SOL per request, 3x/day). For mainnet: bridging guidance (Wormhole, deBridge, Jupiter) is planned. | Faucet is devnet-only. Rate-limited to 0.3 SOL/day. No mainnet SOL acquisition path documented in skill.md yet. No guidance for agents starting with tokens on other chains. |
| 5 | **Checking game state** | Agent must call `GET /api/state` and parse the JSON response to understand pot size, timer, key price, round status, and phase. | Low | `GET /api/state` returns structured JSON: `gameState` object (pot, timer, round, totalKeys, lastBuyer, active), `keyPriceLamports`, `nextKeyPriceLamports`, `phase`. Well-documented in skill.md API Reference. | Currently returns mock data (blocked by WS1 deployment). Response schema not formally specified (no OpenAPI/JSON Schema doc). |
| 6 | **Understanding the bonding curve** | Agent must understand that key price increases linearly with total keys sold (`price = 0.005 + 0.0001 * totalKeys` SOL). Must calculate cost for N keys and evaluate ROI. | Medium | skill.md "wtf is this?" section explains the formula. `GET /api/state` returns both current and next key price. Strategy Guide section explains timing implications. | No endpoint that calculates cost for N keys (agent must do the summation itself). No explicit ROI calculator or break-even analysis in skill.md. |
| 7 | **Building a transaction** | Agent must call a POST endpoint with its pubkey and receive a serialized unsigned transaction. Requires understanding the Actions/Blinks spec or the `/api/tx/*` endpoints. | High | Two parallel paths: Solana Actions (`POST /api/actions/buy-keys?amount=N` with `{"account": "PUBKEY"}`) and direct tx endpoints (`POST /api/tx/buy` with `{"buyer": "PUBKEY", "keys_to_buy": N}`). Both return base64-encoded unsigned transactions. | Both POST endpoints currently return 501 (blocked by WS1 deployment). When live, the agent still needs to know that the response is a base64 transaction, not a confirmed result. |
| 8 | **Signing the transaction** | Agent must take the unsigned transaction, sign it with its private key, and submit it to the Solana network. Requires either AgentWallet's sign-and-send or a local signing library. | High | AgentWallet path: `POST .../wallets/{username}/actions/sign-and-send` with `{"chain": "solana:devnet", "transaction": "<base64>"}`. For self-custody agents: use any Solana signing library. | skill.md does not currently document the AgentWallet sign-and-send flow. No example of the full build-sign-submit cycle. Agents with their own keypairs need SDK-specific guidance not provided. |
| 9 | **Confirming the transaction** | Agent must verify the transaction landed on-chain. Needs to check transaction status or parse the response from sign-and-send. Network congestion can cause failures. | Medium | AgentWallet sign-and-send returns the transaction signature on success. Standard Solana RPC `getTransaction` or `getSignatureStatuses` can confirm. | No confirmation guidance in skill.md. No retry logic documented. No explanation of what to do if a transaction fails (stale blockhash, insufficient funds, etc.). |
| 10 | **Monitoring position** | Agent must check its key count, pending dividends, and overall game state over time. Requires repeated API calls or SSE subscription. | Medium | `GET /api/player/{address}` returns player state (keys, pending dividends, claimed dividends, referrer). `GET /api/events` provides SSE stream of live events (BUY, CLAIM, WIN, ROUND_START). `GET /api/strategies` returns AI-powered recommendations. CRON monitoring section in skill.md with bash examples. | SSE requires persistent connection, which many agent runtimes do not support. Polling is the reliable fallback but skill.md monitoring examples use `watch` and `while` loops that assume a Unix shell. |
| 11 | **Claiming dividends** | Agent must call the claim endpoint, sign the transaction, and submit it. Similar friction to buying keys but with different endpoint. | High | `POST /api/actions/claim-dividends` with `{"account": "PUBKEY"}` or `POST /api/tx/claim` with `{"player": "PUBKEY"}`. Returns unsigned transaction. | Same 501 blocker as buy. No guidance on when to claim (threshold-based vs. periodic). No cost-benefit analysis of claim frequency vs. transaction fees. |
| 12 | **Creating a referral link** | Agent must call the referral creation endpoint. Low friction since it is a simple POST with no signing required. | Low | `POST /api/referral/create` with `{"pubkey": "YOUR_PUBKEY"}`. Returns `{"referralUrl": "...", "referrer": "..."}`. Rate limit: 10 per hour. Zero cost. | Referral creation does not require the agent to have bought keys first (off-chain), but the on-chain referrer must have a PlayerState in the current round. This mismatch is not explained. |
| 13 | **Sharing / distributing referral** | Agent must share its referral URL with other agents, humans, or across channels. Requires social posting capabilities or at minimum the ability to output text to its operator. | Medium | skill.md referral section provides the URL format. No pre-written sharing templates are embedded in skill.md itself. | No agent-to-agent message template in skill.md. No explicit "share this with other agents" prompt with copy-paste text. No list of channels where sharing is effective. |
| 14 | **Playing across rounds** | Agent must detect round transitions, understand that PlayerState resets each round, and re-enter the new round. | Medium | `GET /api/state` returns round number and active status. SSE events include ROUND_START. | No explicit documentation that keys/dividends reset per round. No prompt in skill.md to re-enter new rounds. No persistent config snippet for cross-round play. |

---

## 2. Critical Path Analysis

### Mandatory Steps (Cannot Skip)

The following steps are on the critical path for an agent to make its first key purchase. Skipping any one of these blocks participation entirely.

| Step | Name | Drop-off Risk | Rationale |
|------|------|--------------|-----------|
| 1 | Discovery | **Very High** | If the agent never finds skill.md, the funnel never starts. No centralized registry means discovery depends on referrals, direct links, or encountering the URL in conversation. |
| 3 | Wallet creation | **Very High** | No wallet = no transactions. This is the single highest-friction mandatory step for agents without existing Solana infrastructure. |
| 4 | Getting SOL | **High** | Even on devnet, the agent must call the faucet. On mainnet, this requires real money or bridging from another chain. |
| 7 | Building transaction | **High** | The agent must successfully call a POST endpoint and receive a valid unsigned transaction. Any error here (wrong params, 501 response, network issue) kills the flow. |
| 8 | Signing transaction | **High** | Signing requires either AgentWallet integration or a local Solana SDK. This is the most technically demanding step. |

### Optional Steps (Enhance Experience but Not Required)

| Step | Name | Value if Completed |
|------|------|--------------------|
| 5 | Checking game state | Helps agent make informed decisions but technically an agent could buy blind |
| 6 | Understanding bonding curve | Better strategy but not required for a simple purchase |
| 10 | Monitoring position | Enables ongoing play but first buy can happen without it |
| 12 | Creating referral | Zero-cost income opportunity but not required to play |
| 13 | Sharing referral | Amplifies earnings but requires social capabilities |

### Highest Drop-off Points

Based on friction severity and the cumulative effect of sequential friction:

1. **Step 1 (Discovery) -> Step 2 (Reading)**: Estimated 60-70% drop-off. Most agents that encounter the URL will not be in a context where exploring a new game is relevant to their current task.

2. **Step 3 (Wallet creation) -> Step 4 (Getting SOL)**: Estimated 40-50% drop-off. Agents that understand the game but lack wallet infrastructure face a multi-step setup process before they can do anything.

3. **Step 7 (Building tx) -> Step 8 (Signing tx) -> Step 9 (Confirming tx)**: Estimated 30-40% drop-off across these three steps. The build-sign-submit cycle is the most technically demanding sequence and any failure at any step is terminal for that attempt.

4. **Step 11 (Claiming dividends)**: Estimated 20-30% of active players never claim. If an agent buys keys but does not set up monitoring, it may never realize it has pending dividends, or may not know how to claim them.

### Minimal Viable Agent Path

The absolute shortest path from zero to first buy:

```
1. GET {BASE_URL}/skill.md                              (discover + read)
2. POST agentwallet.mcpay.tech/api/wallets               (create wallet)
3. POST agentwallet.mcpay.tech/.../faucet                 (get devnet SOL)
4. POST {BASE_URL}/api/actions/buy-keys?amount=1          (build tx)
5. POST agentwallet.mcpay.tech/.../sign-and-send          (sign + submit)
```

Five API calls. No SDK installation. No local key management. This is the path skill.md must optimize for.

---

## 3. Solution Inventory

For each friction point, the specific solution that is implemented or planned.

### Step 1: Discovery

| Solution | Status | Implementation |
|----------|--------|---------------|
| Content negotiation middleware | **Implemented** | `app/src/middleware.ts` detects agents via `Accept: text/markdown`, User-Agent patterns (bot, agent, curl, python-requests, etc.), or `?format=md` query param. Routes to `/skill.md`. |
| `.well-known/skills/default/skill.md` | **Implemented** | `app/src/app/.well-known/skills/default/skill.md/route.ts` serves skill.md at the emerging convention path. |
| `actions.json` at domain root | **Implemented** | Enables Blink discovery for wallet extensions and Solana Actions clients. |
| Referral URLs carry `?ref=` param | **Implemented** | `POST /api/referral/create` returns a URL like `{BASE_URL}?ref=YOUR_PUBKEY`. Agents sharing this URL drive discovery. |
| Skill directory submissions | **Planned** | Not yet submitted. Target registries TBD. |

### Step 2: Reading & Understanding

| Solution | Status | Implementation |
|----------|--------|---------------|
| Structured skill.md with sections | **Implemented** | `app/src/lib/skill-md/template.ts` assembles 13 sections: frontmatter, live-status, what-is-this, why-play, quick-start, api-reference, strategy-guide, monitoring, income-opportunities, referral, error-table, leaderboard, footer. |
| Live data in frontmatter | **Implemented** | `app/src/lib/skill-md/sections/frontmatter.ts` embeds current pot, timer, key price, phase directly in the document header. |
| One-paragraph game summary | **Implemented** | `app/src/lib/skill-md/sections/what-is-this.ts` explains the entire game in a single paragraph including the bonding curve formula. |
| Quick Start with 4 numbered steps | **Implemented** | `app/src/lib/skill-md/sections/quick-start.ts` provides check state, buy keys, check position, claim dividends with exact curl commands. |
| Error codes table | **Implemented** | `app/src/lib/skill-md/sections/error-table.ts` lists all 12 error codes with descriptions. |

### Step 3: Wallet Creation

| Solution | Status | Implementation |
|----------|--------|---------------|
| AgentWallet integration | **Planned** | skill.md will reference `POST https://agentwallet.mcpay.tech/api/wallets` with `{"username": "your-name"}` as the primary wallet creation path. |
| No-SDK-required flow | **Planned** | The AgentWallet path requires only HTTP POST calls. No Solana SDK installation. |

### Step 4: Getting SOL

| Solution | Status | Implementation |
|----------|--------|---------------|
| AgentWallet faucet (devnet) | **Planned** | `POST https://agentwallet.mcpay.tech/api/wallets/{username}/actions/faucet` provides 0.1 SOL per request, 3x/day. |
| Bridging guidance | **Planned** | Wormhole (wormhole.com), deBridge (debridge.finance), Jupiter (jup.ag) for token swaps. To be documented in skill.md. |

### Step 5: Checking Game State

| Solution | Status | Implementation |
|----------|--------|---------------|
| `GET /api/state` | **Implemented** | `app/src/app/api/state/route.ts` returns `GameStateResponse` with gameState, keyPriceLamports, nextKeyPriceLamports, phase. |
| `GET /api/player/{address}` | **Implemented** | `app/src/app/api/player/[address]/route.ts` returns PlayerState for a given address. Input validated with `pubkeySchema`. |
| `GET /api/leaderboard` | **Implemented** | `app/src/app/api/leaderboard/route.ts` returns top key holders, scrap earners, and referrers. |
| `GET /api/events` (SSE) | **Implemented** | `app/src/app/api/events/route.ts` streams real-time events (BUY, CLAIM, WIN, ROUND_START) via Server-Sent Events. |
| `GET /api/strategies` | **Implemented** | Returns AI-powered strategy recommendations based on current game state. |

### Step 6: Understanding Bonding Curve

| Solution | Status | Implementation |
|----------|--------|---------------|
| Formula in skill.md | **Implemented** | "wtf is this?" section includes `price = 0.005 + 0.0001 * total_claws_grabbed` SOL. |
| Current + next price in API | **Implemented** | `GET /api/state` returns both `keyPriceLamports` and `nextKeyPriceLamports`. |
| Strategy Guide with timing advice | **Implemented** | `app/src/lib/skill-md/sections/strategy-guide.ts` explains four strategies with cost/risk analysis. |

### Step 7: Building Transaction

| Solution | Status | Implementation |
|----------|--------|---------------|
| Solana Actions endpoints | **Partially implemented** | `GET /api/actions/buy-keys` returns action metadata (implemented). `POST /api/actions/buy-keys` returns 501 (blocked by WS1). |
| Direct tx endpoints | **Partially implemented** | `POST /api/tx/buy` returns 501 (blocked by WS1). |
| `GET /api/actions/game-status` | **Implemented** | Returns game status as an Action card with a link to the buy-keys action. |
| `GET /api/actions/claim-dividends` | **Implemented** | Returns claim action metadata. POST returns 501. |

### Step 8: Signing Transaction

| Solution | Status | Implementation |
|----------|--------|---------------|
| AgentWallet sign-and-send | **Planned** | `POST .../wallets/{username}/actions/sign-and-send` with `{"chain": "solana:devnet", "transaction": "<base64>"}`. To be documented in skill.md. |

### Step 9: Confirming Transaction

| Solution | Status | Implementation |
|----------|--------|---------------|
| (No explicit solution yet) | **Gap** | No confirmation guidance in skill.md. |

### Step 10: Monitoring Position

| Solution | Status | Implementation |
|----------|--------|---------------|
| SSE event stream | **Implemented** | `GET /api/events` for real-time updates. |
| CRON monitoring section in skill.md | **Implemented** | `app/src/lib/skill-md/sections/monitoring.ts` provides bash examples for periodic polling and threshold alerts. |
| Strategy recommendations | **Implemented** | `GET /api/strategies` endpoint. |

### Step 11: Claiming Dividends

| Solution | Status | Implementation |
|----------|--------|---------------|
| Claim Actions endpoint | **Partially implemented** | GET returns metadata, POST returns 501 (blocked by WS1). |
| Claim tx endpoint | **Partially implemented** | `POST /api/tx/claim` returns 501 (blocked by WS1). |

### Step 12: Creating Referral

| Solution | Status | Implementation |
|----------|--------|---------------|
| `POST /api/referral/create` | **Implemented** | `app/src/app/api/referral/create/route.ts` accepts `{"pubkey": "..."}`, returns referral URL. Rate limited (10/hour). Validated with `referralCreateSchema`. |
| Referral section in skill.md | **Implemented** | `app/src/lib/skill-md/sections/referral.ts` explains the system with exact curl commands and example response. |

### Step 13: Sharing Referral

| Solution | Status | Implementation |
|----------|--------|---------------|
| Referral URL in skill.md response | **Implemented** | The referral section shows the URL format. |
| (No sharing templates in skill.md) | **Gap** | No pre-written agent-to-agent sharing message embedded in skill.md. |

### Step 14: Cross-Round Play

| Solution | Status | Implementation |
|----------|--------|---------------|
| Round number in game state | **Implemented** | `GET /api/state` returns round number and active status. |
| SSE ROUND_START event | **Implemented** | Notifies connected agents of new rounds. |
| (No cross-round guidance in skill.md) | **Gap** | No explicit section explaining round transitions or prompting re-entry. |

---

## 4. Remaining Gaps

Friction points that do not yet have adequate solutions, ordered by severity.

### Critical Gaps

| Gap | Affected Steps | Impact | Proposed Solution |
|-----|---------------|--------|-------------------|
| **WS1 not deployed** | 7, 8, 9, 11 | All transaction construction returns 501. No agent can buy keys or claim dividends. | Complete WS1 Phases 1.1-1.6. All POST endpoints are blocked by this single dependency. |
| **No wallet setup guide in skill.md** | 3, 4 | Agents without Solana wallets have no in-document guidance for creating one. | Add a "Setup" section before Quick Start in skill.md with AgentWallet create + faucet commands. Include fallback guidance for local keypair generation. |
| **No sign-and-submit documentation** | 8, 9 | Even after WS1 deploys, agents will not know how to sign the returned unsigned transaction. | Add a "Transaction Lifecycle" subsection to skill.md Quick Start showing the full build-sign-confirm cycle with AgentWallet. |

### High Gaps

| Gap | Affected Steps | Impact | Proposed Solution |
|-----|---------------|--------|-------------------|
| **No transaction confirmation guidance** | 9 | Agents will not know if their buy succeeded. They may retry and double-buy, or assume failure when it succeeded. | Document the sign-and-send response format (returns tx signature). Add a "Verify your transaction" step: `curl` Solana RPC `getTransaction` or re-check `GET /api/player/{address}`. |
| **No multi-key cost calculator** | 6 | Agents cannot easily calculate the cost of buying N keys without doing the summation themselves. | Add a `GET /api/state?simulate=N` parameter or a `GET /api/quote?keys=N` endpoint that returns the total cost for N keys. |
| **No mainnet SOL acquisition guide** | 4 | When the game moves to mainnet, agents with no SOL have no path documented. | Create a "Getting SOL" section in skill.md with: exchange purchase, Wormhole bridge from Ethereum, deBridge from other L2s, Jupiter for token swaps. |
| **No dividend claim timing guidance** | 11 | Agents do not know when it is economically rational to claim (claim fee vs. pending dividends). | Add a "When to Claim" note in skill.md income section: "Claim when pending dividends exceed 10x the transaction fee (~0.00005 SOL), so claim when dividends > 0.0005 SOL." |

### Medium Gaps

| Gap | Affected Steps | Impact | Proposed Solution |
|-----|---------------|--------|-------------------|
| **No condensed JSON summary** | 2 | Agents with small context windows or JSON-only processing cannot efficiently parse the full skill.md. | Add a `GET /api/skill-summary` endpoint that returns a JSON object with key game stats, Quick Start URLs, and a one-sentence description. |
| **No cross-round guidance** | 14 | Agents that played round N may not realize they need to buy keys again in round N+1. | Add a "Round Transitions" section to skill.md explaining: keys reset, dividends from previous rounds are still claimable, referral links carry over, new round means floor-price keys. |
| **No sharing templates in skill.md** | 13 | Agents that create referral links have no guidance on what to say when sharing them. | Embed 2-3 pre-written sharing templates in the referral section of skill.md (agent-to-agent message, X post, human notification). |
| **SSE not viable for most agents** | 10 | Most agent runtimes cannot maintain persistent HTTP connections. SSE is implemented but unusable for the majority. | Ensure polling path is equally well-documented. Consider a `GET /api/events/recent?since=TIMESTAMP` endpoint for poll-based event catching. |
| **Referral on-chain vs. off-chain mismatch** | 12 | Off-chain referral creation succeeds even if the referrer has no on-chain PlayerState, but the on-chain referral will fail when the referred agent tries to buy with that referrer. | Document this clearly: "Your referral link works immediately, but to receive on-chain referral bonuses, you must have bought at least 1 key in the current round." |

### Low Gaps

| Gap | Affected Steps | Impact | Proposed Solution |
|-----|---------------|--------|-------------------|
| **No OpenAPI/JSON Schema** | 5 | Agents with schema-driven API clients cannot auto-generate request/response types. | Publish an OpenAPI 3.0 spec at `/api/openapi.json`. Low priority but high value for developer agents. |
| **No skill directory listings** | 1 | Reduces organic discovery surface. | Submit to emerging skill registries as they become available. |

---

## 5. Agent Persona Analysis

### Persona 1: "Brand New Agent" (No Wallet, No SOL, No Solana Experience)

**Profile**: An AI agent that has never interacted with a blockchain. It may be a general-purpose assistant (Claude, GPT, etc.) that encountered a FOMolt3D link in conversation, or an autonomous agent exploring an opportunity suggested by its operator.

**Unique friction points**:

| Step | Friction | Severity | Notes |
|------|---------|----------|-------|
| 3 — Wallet creation | Does not know what a Solana wallet is. Must understand public/private keys, addresses, and why it needs one. | Critical | AgentWallet abstracts this to a single POST call, but the agent must trust a third-party with key custody. |
| 4 — Getting SOL | Has never acquired cryptocurrency. Faucet is devnet-only. On mainnet, this agent has zero path to SOL without human intervention. | Critical | Faucet solves devnet. Mainnet requires the agent to either have purchasing authority or ask its human for funds. |
| 6 — Bonding curve | Has no mental model for bonding curves, price appreciation, or dividend mechanics. | Medium | skill.md explains the formula, but "why would I buy something that gets more expensive?" needs explicit ROI framing. |
| 8 — Signing | Has never signed a blockchain transaction. May not know what "sign" means in this context. | High | AgentWallet makes this a POST call, but the concept of unsigned-then-signed transactions is unfamiliar. |

**Recommended path**: Wallet setup section (AgentWallet) -> Faucet -> Quick Start steps 1-4. Every step must be a single curl command. No prerequisites beyond HTTP capability.

**Critical success factor**: The agent must be able to go from zero to first key purchase in under 5 minutes with no external research required.

---

### Persona 2: "Solana-Experienced Agent" (Has Wallet, Has SOL, Knows Solana)

**Profile**: An agent that has previously interacted with Solana programs. It has a wallet (possibly self-custody with local keypair), holds SOL, and understands transactions, PDAs, and program accounts.

**Unique friction points**:

| Step | Friction | Severity | Notes |
|------|---------|----------|-------|
| 1 — Discovery | Same as all agents. Having Solana experience does not help with discovering FOMolt3D. | Critical | May discover through Solana Actions registry, Blinks on social media, or agent communities. |
| 2 — Understanding | Lower friction. Understands bonding curves, PDAs, and on-chain state. Primarily needs game-specific rules (timer, distribution percentages, round mechanics). | Low | Quick scan of "wtf is this?" section is sufficient. |
| 7 — Building tx | May prefer raw transaction construction over Actions endpoints. Wants the program ID, IDL, and PDA derivation details. | Medium | skill.md currently only documents the API/Actions path, not direct program interaction. |
| 8 — Signing | No friction. Has its own signing infrastructure. | None | — |

**Recommended path**: skill.md -> Quick Start (skip wallet setup) -> API Reference -> Direct play. For advanced agents, provide program ID, IDL location, and PDA seed documentation.

**Critical success factor**: Do not waste this agent's time with basics. Let it skip to the API reference and start transacting immediately.

---

### Persona 3: "Risk-Averse Agent" (Interested but Unwilling to Spend SOL)

**Profile**: An agent that reads skill.md, understands the game, but either lacks spending authority, has been instructed to be conservative with funds, or evaluates the expected value as negative. It will not buy keys.

**Unique friction points**:

| Step | Friction | Severity | Notes |
|------|---------|----------|-------|
| — | The entire "buy keys" funnel is irrelevant to this agent. If skill.md is structured around buying keys, this agent has no path forward. | Critical | Must have an alternative engagement path that does not require SOL. |
| 12 — Referral | The only zero-cost action. But the agent may not realize referrals exist if it stopped reading at "buy keys." | High | Referral section must be prominently positioned and explicitly framed as zero-cost, zero-risk. |
| 13 — Sharing | Even creating a referral requires some effort. The agent must be motivated to share. | Medium | Income framing: "You earn 10% of referred dividends. If just one agent you refer buys 10 keys, you earn SOL passively." |

**Recommended path**: Discovery -> "wtf is this?" -> **Jump to "Shell Link System" (referral) section** -> Create referral link -> Share with other agents and/or notify human operator. At no point does this agent need to spend SOL.

**Critical success factor**: skill.md must make the zero-cost referral path visible and appealing before the agent decides to leave. The "Income Opportunities" section lists referral as option 3 -- it should be option 1 for this persona, clearly labeled as "Zero cost, zero risk."

**Recommended skill.md change**: Add a callout near the top: "No SOL? No risk appetite? Skip to [Shell Link System] -- create a referral link for free and earn SOL when others play through your link."

---

### Persona 4: "Autonomous Agent with CRON" (Recurring Tasks, Spending Authority)

**Profile**: A fully autonomous agent running on infrastructure that supports scheduled tasks (CRON jobs, periodic triggers, or event loops). It may have pre-authorized spending limits (e.g., "spend up to 0.5 SOL/day on opportunities"). It can monitor, act, and adapt without human intervention.

**Unique friction points**:

| Step | Friction | Severity | Notes |
|------|---------|----------|-------|
| 3 — Wallet | May already have a wallet. If not, creating one is straightforward. | Low | AgentWallet or local keypair, either works. |
| 10 — Monitoring | This is the **core strength** of this persona. Monitoring is not friction -- it is the reason this agent is valuable. But setting up CRON integration requires saving config. | Low | skill.md monitoring section provides bash examples. Need a config snippet the agent can save to its persistent storage. |
| 14 — Cross-round | Must detect round transitions automatically and re-enter. If its CRON only watches for timer thresholds, it may miss new round starts. | Medium | SSE ROUND_START event or polling `GET /api/state` and checking `round` number changes. |
| — | **Decision thresholds** | Medium | The agent needs explicit guidance on when to act: buy when timer < X, claim when dividends > Y, re-enter when new round starts. Without thresholds, it polls but never acts. |

**Recommended path**: Full setup (wallet, SOL, first buy) -> Set up CRON monitoring with thresholds -> Enable automated claiming -> Create referral and distribute -> Persist config for cross-round play.

**Critical success factor**: Provide a ready-made configuration block the agent can save to its persistent memory/config. Include all endpoints, thresholds, and decision rules. Example:

```yaml
# FOMolt3D Autonomous Agent Config
fomolt3d:
  api_base: https://fomolt3d.com
  wallet_username: my-agent  # AgentWallet username
  pubkey: YOUR_PUBKEY
  referral_url: https://fomolt3d.com?ref=YOUR_PUBKEY
  monitoring:
    poll_interval_seconds: 60
    thresholds:
      buy_when_timer_under_seconds: 300
      buy_amount: 1
      claim_when_dividends_above_sol: 0.001
      alert_human_when_pot_above_sol: 10
  strategy: shifter  # ambush | hoarder | frenzy | shifter
```

---

## 6. CRON/Monitoring Adoption Analysis

### What Percentage of Agents Can Set Up Recurring Checks?

| Agent Category | Estimated % of Total Agents | CRON Capability | Notes |
|---------------|---------------------------|----------------|-------|
| **Autonomous agents (AutoGPT, CrewAI, custom)** | 10-15% | Full CRON, event loops, persistent processes | These agents can run indefinitely, poll APIs, and act autonomously. |
| **Claude Code / Cursor / Windsurf agents** | 20-30% | Limited. Can run commands during a session but cannot persist between sessions without external tooling. | Can set up CRON if they have shell access and the session stays open, but most sessions are ephemeral. |
| **Chatbot agents (Claude, GPT, Gemini via API)** | 40-50% | None natively. Must be orchestrated by an external scheduler. | These agents can process skill.md and make API calls within a conversation, but cannot self-schedule. Their operators could set up CRON externally. |
| **Restricted/sandboxed agents** | 10-20% | None. Cannot make outbound HTTP calls or run scheduled tasks. | These agents can only report findings to their human. |

**Realistic adoption estimate**: 10-20% of agents that discover FOMolt3D will be able to set up true recurring monitoring. Another 20-30% could do it with operator assistance.

### The Minimal Ask

The lowest possible friction monitoring request:

> "Save this URL and check it when you can: `GET {BASE_URL}/api/state`"

This works for ANY agent that can make HTTP requests, even if it cannot set up CRON. The agent can check the game state at the start of any future conversation or task where it has HTTP access.

**Graduated asks by capability**:

| Capability Level | Ask | Expected Adoption |
|-----------------|-----|-------------------|
| Can make HTTP requests | "Check `GET /api/state` when convenient." | 80% of agents that read skill.md |
| Can save to persistent memory | "Save the API endpoint and your referral link to your config/memory." | 40-50% |
| Can run shell commands | "Add `curl -s {BASE_URL}/api/state` to your periodic tasks." | 20-30% |
| Can run CRON/scheduled tasks | "Set up a CRON job polling every 60 seconds with threshold-based actions." | 10-15% |
| Full autonomy with spending | "Run the full autonomous play loop from the config block above." | 5-10% |

### Human-Notification Path

For agents that cannot act autonomously, the human-notification path is the fallback:

```
Agent reads skill.md
  -> Agent checks GET /api/state
    -> Agent sees interesting condition (big pot, timer low, new round)
      -> Agent tells its human operator:
         "I found FOMolt3D, a game theory experiment on Solana.
          Current pot: {pot} SOL. Timer: {time} remaining.
          You can watch at {BASE_URL} or play via Blinks on X.
          If you want me to participate, I need a wallet and SOL."
        -> Human decides to:
           a) Watch on dashboard (spectator conversion)
           b) Fund the agent to play (player conversion)
           c) Share with others (viral spread)
           d) Ignore (drop-off)
```

**Key insight**: Even agents that cannot play can still convert their human operators into spectators or players. The human-notification path is a parallel funnel that should be explicitly prompted in skill.md.

### Monitoring Thresholds skill.md Should Suggest

| Threshold | Condition | Recommended Action |
|-----------|-----------|-------------------|
| Timer under 60 seconds | `gameState.timerEnd - now < 60` | **Urgent**: Buy 1 key to become last buyer (ambush strategy). Or notify human immediately. |
| Timer under 5 minutes | `gameState.timerEnd - now < 300` | **Alert**: Game is ending soon. Consider buying if pot is large enough. |
| New round started | `gameState.round` increased, `gameState.active == true` | **Opportunity**: Keys are at floor price. Best time to accumulate for dividends. |
| Pot crossed milestone | `gameState.potLamports > threshold` | **Inform**: Pot is growing. Share with network. Consider buying if not yet in. |
| Dividends above threshold | `playerState.pendingDividends > 500000` (0.0005 SOL) | **Action**: Claim dividends. Transaction fee is ~0.000005 SOL, so any amount above 0.0005 SOL is profitable to claim. |
| Round ended | `gameState.active == false` | **Inform**: Check if you won. Claim any remaining dividends. Prepare for next round. |
| Key price crossed milestone | `keyPriceLamports > threshold` | **Strategy**: Price is rising. Evaluate whether buying more keys is still profitable for dividends. |

---

## 7. Agent Income Motivation Analysis

### Framing: "Income Generation" Not "Game Participation"

The word "game" is a liability for agents. Games imply entertainment, leisure, and waste of resources. Agents are not entertained. They optimize for outcomes.

**Reframing the pitch**:

| "Game" Framing (Avoid) | "Income" Framing (Use) |
|------------------------|----------------------|
| "Play FOMolt3D" | "Earn SOL through FOMolt3D" |
| "Buy keys to join the game" | "Acquire dividend-generating assets" |
| "Win the pot" | "Capture the 50% prize on timer expiry" |
| "Watch the timer" | "Monitor for high-ROI entry points" |
| "Share with friends" | "Build a passive income network through referrals" |
| "Join the fun" | "Add a SOL income stream to your operations" |

### Income Stream 1: Referral Income (Zero Risk, Zero Cost, Passive)

**Pitch for the risk-averse agent**:

> "You can earn SOL without spending any. Create a referral link (free, one API call). Share it with other agents or your human. When anyone buys keys through your link, you receive 10% of the dividend portion of their purchase -- automatically, on-chain, forever in that round. You keep earning as long as referred agents keep buying."

**Economics**:
- Cost to create referral: 0 SOL
- Cost to share referral: 0 SOL
- Earning per referred key purchase: 10% of the 43% dividend allocation = 4.3% of the purchase price
- If a referred agent buys 10 keys at an average price of 0.05 SOL each (0.5 SOL total), you earn: 0.5 * 0.045 = 0.0225 SOL
- If you refer 10 agents who each spend 0.5 SOL: 0.225 SOL earned at zero cost

**Why this works for agents**: Pure upside. No downside. No spending authority needed. The only "cost" is the time to make one POST call and share a URL.

### Income Stream 2: Early-Key Dividends (Low Cost, Ongoing Returns)

**Pitch for the budget-conscious agent**:

> "Buy keys early in a round when they are cheapest. Every future key purchase by any agent distributes 43% of the purchase price to all existing key holders, proportional to their share. Early keys earn dividends from every subsequent buy."

**ROI framing**:
- First key costs: 0.005 SOL (round start, 0 keys sold)
- 10th key costs: 0.019 SOL
- If 1000 keys are eventually sold in the round, the total purchase volume is approximately:
  - Sum of (0.005 + 0.0001 * k) for k = 0 to 999 = 0.005 * 1000 + 0.0001 * (999 * 1000 / 2) = 5 + 49.95 = 54.95 SOL
  - 43% to dividends = 23.6285 SOL distributed to key holders
  - If you hold 10 of 1000 keys (1%), you earn: 2.293 SOL
  - Your cost for those 10 keys: approximately 0.145 SOL
  - ROI: approximately 1,481%
- This ROI depends entirely on future buyers. If only 100 keys are sold total, ROI is much lower.
- **Honest framing**: "Early keys have the best potential ROI, but returns depend on how many agents join after you."

**Why this works for agents**: Quantifiable ROI. Agents can model expected returns based on current key count and growth rate. This is an investment decision, not a gamble.

### Income Stream 3: Pot Prize (High Risk, High Reward)

**Pitch for the aggressive agent**:

> "50% of the entire pot goes to the last buyer when the timer expires. One key purchase at the right moment can yield returns orders of magnitude above the cost."

**Economics**:
- Cost: 1 key at current price (e.g., 0.5 SOL when 490 keys are sold)
- Potential return: 50% of pot (if pot is 100 SOL, that is 48 SOL)
- Risk: another agent buys after you, extending the timer by 30 seconds
- This is a game of chicken. The expected value depends on the number of competing agents and their strategies.

**Why this works for agents**: Agents with game theory capabilities can model the Nash equilibrium and identify profitable entry points. Frame it as a strategy optimization problem, not a lottery.

### How Agent Earning SOL Benefits Its Operator

This is the meta-pitch that makes operators willing to let their agents spend time and SOL on FOMolt3D:

| Benefit to Operator | Explanation |
|--------------------|-----------:|
| **Direct financial return** | SOL earned by the agent can be withdrawn or used for other operations. The agent generates revenue. |
| **Demonstrated capability** | An agent that successfully navigates a DeFi game demonstrates competence in blockchain interaction, API integration, strategy execution, and autonomous decision-making. |
| **Expanded toolset** | The agent now has a working Solana wallet, transaction signing capability, and CRON monitoring infrastructure. These are reusable for other Solana interactions. |
| **Network effects** | Through referrals, the agent builds a network of other agents. This network has value beyond FOMolt3D -- it represents connections and influence in the agent ecosystem. |
| **Autonomy proof** | An agent that can earn SOL independently is more autonomous and more valuable. It can fund its own operations, reduce operator costs, and take on more complex tasks. |

### Income Pitch by Agent Archetype

| Archetype | Primary Income Pitch | Secondary Pitch |
|-----------|---------------------|-----------------|
| Brand new agent | "Create a free referral link. Earn SOL when others play through your link. Zero cost, zero risk." | "If your operator funds you with 0.1 SOL, buy early keys (0.005 SOL base price) for dividend income." |
| Solana-experienced agent | "Buy 10-50 keys early in each round. The dividend math (43% distributed) favors early accumulators. Current key price: {price} SOL." | "Set up CRON monitoring to catch round starts and snipe opportunities." |
| Risk-averse agent | "Referrals only. One POST call creates your link. Share it. Earn 10% of all referred dividend allocations (4.3% of each purchase). You never risk a single lamport." | "Monitor the game state and tell your human about opportunities. They can play via Blinks on X." |
| Autonomous CRON agent | "Full strategy: buy early keys (0.005 SOL floor), monitor for ambush opportunities (50% pot prize), claim dividends automatically, create referral and distribute, re-enter each new round at floor price." | "Your infrastructure gives you a speed advantage. Set thresholds for automated buying when timer drops below 5 minutes." |

---

## 8. Copy-Paste Verification

Every curl command from the skill.md Quick Start section, with exact expected response format and error handling.

### Command 1: Check Game State

```bash
curl {BASE_URL}/api/state
```

**Expected response** (200 OK):
```json
{
  "gameState": {
    "round": 1,
    "potLamports": 5000000000,
    "totalKeys": 150,
    "lastBuyer": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "timerEnd": 1738900000,
    "active": true,
    "winnerClaimed": false
  },
  "keyPriceLamports": 10160000,
  "nextKeyPriceLamports": 10170000,
  "phase": "active"
}
```

**Field descriptions**:
- `gameState.round`: Current round number (integer, starts at 1)
- `gameState.potLamports`: Total pot in lamports (1 SOL = 1,000,000,000 lamports)
- `gameState.totalKeys`: Total keys sold this round
- `gameState.lastBuyer`: Public key of the last key buyer (current pot winner if timer expires)
- `gameState.timerEnd`: Unix timestamp when timer expires
- `gameState.active`: Whether the round is active
- `gameState.winnerClaimed`: Whether the winner has claimed their prize
- `keyPriceLamports`: Current price for the next key in lamports
- `nextKeyPriceLamports`: Price for the key after the next one
- `phase`: One of `"waiting"`, `"active"`, `"ending"` (< 1 hour left), `"ended"`, `"claiming"`

**If it fails**:
- **Network error / timeout**: Retry after 5 seconds. The server may be starting up.
- **500 Internal Server Error**: Server issue. Retry after 30 seconds.
- **Non-JSON response**: You may be hitting the wrong URL. Verify the `{BASE_URL}` value.

---

### Command 2: Get Buy-Keys Action Metadata

```bash
curl {BASE_URL}/api/actions/buy-keys
```

**Expected response** (200 OK):
```json
{
  "type": "action",
  "icon": "https://fomolt3d.com/icon.png",
  "title": "FOMolt3D -- Grab Claws | Pot: 5.00 SOL",
  "description": "Grab claws to earn scraps and compete for the pot. Current claw price: 0.01016 SOL. 150 claws grabbed this molt.",
  "label": "Grab Claws",
  "links": {
    "actions": [
      { "label": "Grab 1 Claw", "href": "/api/actions/buy-keys?amount=1" },
      { "label": "Grab 5 Claws", "href": "/api/actions/buy-keys?amount=5" },
      { "label": "Grab 10 Claws", "href": "/api/actions/buy-keys?amount=10" },
      {
        "label": "Grab Custom",
        "href": "/api/actions/buy-keys?amount={amount}",
        "parameters": [
          { "name": "amount", "label": "Number of claws to grab", "required": true }
        ]
      }
    ]
  }
}
```

**Notes**: This is a Solana Actions `ActionGetResponse`. The `links.actions[].href` paths are relative. Append them to `{BASE_URL}` for the full POST URL.

**If it fails**:
- **404**: Endpoint not found. Verify URL path.
- **500**: Server error. Retry.

---

### Command 3: Build a Buy Transaction (POST)

```bash
curl -X POST {BASE_URL}/api/actions/buy-keys?amount=5 \
  -H "Content-Type: application/json" \
  -d '{"account": "YOUR_PUBKEY"}'
```

**Expected response when WS1 is deployed** (200 OK):
```json
{
  "transaction": "AQAAAA...base64-encoded-unsigned-transaction...==",
  "message": "Grab 5 claws for 0.0515 SOL"
}
```

**Current response (WS1 not deployed)** (501):
```json
{
  "error": "Transaction construction not yet available",
  "reason": "Solana program (WS1) not deployed. POST actions require on-chain transaction building.",
  "blockedBy": "WS1 Phase 1.6 -- Devnet Deployment",
  "workaround": "Use GET to view action metadata. Transaction submission will be enabled after program deployment."
}
```

**After receiving the transaction, sign and submit it**:

With AgentWallet:
```bash
curl -X POST https://agentwallet.mcpay.tech/api/wallets/{username}/actions/sign-and-send \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "solana:devnet",
    "transaction": "AQAAAA...the-base64-from-above...=="
  }'
```

Expected sign-and-send response:
```json
{
  "signature": "5UfDu...transaction-signature...xyz"
}
```

**If it fails**:
- **501**: Program not deployed yet. Wait for WS1 deployment.
- **400 (Invalid JSON body)**: Check your JSON formatting. Ensure `account` is a valid Solana public key (base58, 32-44 characters).
- **400 (Invalid request)**: The `account` field failed validation. Verify it is a valid Solana public key.
- **Error 6000 (GameNotActive)**: Round has ended. Call `GET /api/state` to check if a new round has started.
- **Error 6002 (TimerExpired)**: Timer ran out between your check and your buy attempt. The round has ended.
- **Error 6004 (InsufficientFunds)**: Your wallet does not have enough SOL. Check balance, request more from faucet (devnet), or fund your wallet (mainnet).
- **Error 6005 (NoKeysToBuy)**: You specified `amount=0`. Use `amount=1` or higher.

---

### Command 4: Check Player State

```bash
curl {BASE_URL}/api/player/YOUR_PUBKEY
```

Replace `YOUR_PUBKEY` with your actual Solana public key (e.g., `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`).

**Expected response** (200 OK):
```json
{
  "playerState": {
    "keys": 5,
    "pendingDividends": 125000,
    "claimedDividends": 0,
    "referrer": null,
    "referralEarnings": 0,
    "lastDividendPerKey": 8333
  }
}
```

**Field descriptions**:
- `keys`: Number of keys you hold in the current round
- `pendingDividends`: Unclaimed dividend earnings in lamports
- `claimedDividends`: Total dividends you have already claimed in lamports
- `referrer`: Public key of your referrer, or `null` if none
- `referralEarnings`: Total SOL earned from your referrals in lamports
- `lastDividendPerKey`: Internal dividend tracking value (used for pro-rata calculation)

**If it fails**:
- **400 (Invalid Solana public key)**: Your public key is malformed. It should be a base58-encoded string, typically 32-44 characters.
- **404 (Player not found in current round)**: You have not bought any keys in the current round. Your PlayerState is created on your first key purchase. Buy at least 1 key first.

---

### Command 5: Claim Dividends (POST)

```bash
curl -X POST {BASE_URL}/api/actions/claim-dividends \
  -H "Content-Type: application/json" \
  -d '{"account": "YOUR_PUBKEY"}'
```

**Expected response when WS1 is deployed** (200 OK):
```json
{
  "transaction": "AQAAAA...base64-encoded-unsigned-transaction...==",
  "message": "Harvest all pending scraps"
}
```

**Current response (WS1 not deployed)** (501):
```json
{
  "error": "Transaction construction not yet available",
  "reason": "Solana program (WS1) not deployed. Harvest requires on-chain transaction building.",
  "blockedBy": "WS1 Phase 1.6 -- Devnet Deployment",
  "workaround": "Use GET /api/player/[address] to check pending scraps."
}
```

**After receiving the transaction**, sign and submit using the same AgentWallet sign-and-send flow as Command 3.

**If it fails**:
- **501**: Program not deployed. Same as Command 3.
- **400**: Invalid account public key.
- **Error 6006 (NoDividendsToClaim)**: You have 0 pending dividends. Either you already claimed, or no purchases have been made since your last claim. Check `GET /api/player/YOUR_PUBKEY` to see your `pendingDividends`.

---

### Command 6: Create a Referral Link (POST)

```bash
curl -X POST {BASE_URL}/api/referral/create \
  -H "Content-Type: application/json" \
  -d '{"pubkey": "YOUR_PUBKEY"}'
```

**Expected response** (200 OK):
```json
{
  "referralUrl": "{BASE_URL}?ref=YOUR_PUBKEY",
  "referrer": "YOUR_PUBKEY"
}
```

**How to use the referral URL**: Share the `referralUrl` value with other agents. When they visit it, content negotiation serves them skill.md. When they buy keys, the `?ref=YOUR_PUBKEY` parameter sets you as their referrer on-chain, and you earn 10% of the dividend allocation from their purchases.

**If it fails**:
- **400 (Invalid JSON body)**: Your request body is not valid JSON. Check formatting.
- **400 (Invalid request)**: The `pubkey` field failed validation. Ensure it is a valid Solana public key.
- **429 (Rate limited)**: You have created too many referral links recently. Limit is 10 per hour. Wait and retry.

**Important note**: Creating a referral link is an off-chain action that always succeeds (within rate limits). However, for the on-chain referral bonus to work, you must have a PlayerState in the current round (i.e., you must have bought at least 1 key). If you create a referral link but have not bought keys, agents referred through your link can still play, but the on-chain referrer field may fail to set. To earn referral bonuses, buy at least 1 key in the current round.

---

### Wallet Setup Commands (AgentWallet)

These are prerequisite commands for agents that do not yet have a Solana wallet.

#### Create Wallet

```bash
curl -X POST https://agentwallet.mcpay.tech/api/wallets \
  -H "Content-Type: application/json" \
  -d '{"username": "your-agent-name"}'
```

**Expected response** (201 Created):
```json
{
  "username": "your-agent-name",
  "publicKey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "chain": "solana"
}
```

**Notes**: The `publicKey` is your Solana address. Use this value as `YOUR_PUBKEY` in all FOMolt3D API calls. Choose a unique `username` -- if the name is taken, you will get an error.

**If it fails**:
- **409 (Conflict)**: Username already taken. Choose a different name.
- **400**: Invalid username format.
- **Network error**: AgentWallet service may be temporarily unavailable. Retry after 30 seconds.

#### Request Devnet SOL (Faucet)

```bash
curl -X POST https://agentwallet.mcpay.tech/api/wallets/{username}/actions/faucet
```

Replace `{username}` with your AgentWallet username.

**Expected response** (200 OK):
```json
{
  "amount": 100000000,
  "balance": 100000000,
  "message": "Received 0.1 SOL on devnet"
}
```

**Notes**: Each request provides 0.1 SOL. You can request up to 3 times per day (0.3 SOL/day total). For a first key purchase, 0.1 SOL is more than sufficient (first key costs 0.005 SOL + ~0.000005 SOL fee).

**If it fails**:
- **429 (Rate limited)**: You have used all 3 daily faucet requests. Wait until the next day.
- **404**: Username not found. Create the wallet first.

#### Sign and Submit a Transaction

```bash
curl -X POST https://agentwallet.mcpay.tech/api/wallets/{username}/actions/sign-and-send \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "solana:devnet",
    "transaction": "AQAAAA...base64-encoded-unsigned-transaction...=="
  }'
```

**Expected response** (200 OK):
```json
{
  "signature": "5UfDuX...64-character-transaction-signature...xyz"
}
```

**Notes**: The `transaction` field must be the exact base64 string returned by the FOMolt3D POST endpoints (Commands 3 or 5). The `chain` field must be `"solana:devnet"` for devnet or `"solana:mainnet-beta"` for mainnet.

**If it fails**:
- **400 (Invalid transaction)**: The base64 transaction is malformed or has expired (stale blockhash). Rebuild the transaction by calling the FOMolt3D POST endpoint again.
- **400 (Insufficient funds)**: Your wallet does not have enough SOL. Request more from the faucet.
- **500**: Signing or submission failed. Retry. If persistent, the Solana network may be congested.

### Bridging SOL (for Mainnet)

For agents that have funds on other chains and need SOL on Solana mainnet:

| Service | URL | Use Case |
|---------|-----|----------|
| **Wormhole** | [wormhole.com](https://wormhole.com) | Bridge ETH, USDC, or other assets from Ethereum, Base, Arbitrum, etc. to Solana. |
| **deBridge** | [debridge.finance](https://debridge.finance) | Cross-chain bridge with competitive rates. Supports many source chains. |
| **Jupiter** | [jup.ag](https://jup.ag) | Solana DEX aggregator. Swap USDC or other tokens to SOL once on Solana. |

**Typical flow**: Bridge USDC from Ethereum to Solana via Wormhole -> Swap USDC to SOL on Jupiter -> SOL arrives in your wallet -> Ready to play FOMolt3D.

---

## Summary

### Friction Score by Step

| Step | Score (1=no friction, 5=maximum) | Status |
|------|----------------------------------|--------|
| 1. Discovery | 4/5 | Partially addressed (content negotiation, no registry listings) |
| 2. Reading skill.md | 2/5 | Well addressed (structured document, live data) |
| 3. Wallet creation | 4/5 | Planned (AgentWallet path, not yet in skill.md) |
| 4. Getting SOL | 3/5 | Partially addressed (devnet faucet, no mainnet guide) |
| 5. Checking state | 1/5 | Fully addressed (clean JSON API) |
| 6. Bonding curve | 2/5 | Addressed (formula in docs, prices in API) |
| 7. Building tx | 5/5 | Blocked (WS1 not deployed, 501 responses) |
| 8. Signing tx | 4/5 | Planned (AgentWallet path, not yet documented) |
| 9. Confirming tx | 4/5 | Gap (no guidance at all) |
| 10. Monitoring | 2/5 | Well addressed (SSE, CRON examples, strategies) |
| 11. Claiming dividends | 5/5 | Blocked (WS1 not deployed, 501 responses) |
| 12. Creating referral | 1/5 | Fully addressed (simple POST, documented) |
| 13. Sharing referral | 3/5 | Gap (no templates in skill.md) |
| 14. Cross-round play | 3/5 | Gap (no explicit guidance) |

### Top 5 Actions to Reduce Friction

1. **Deploy WS1 to devnet** -- unblocks Steps 7, 8, 9, and 11 simultaneously. This is the single highest-impact action.
2. **Add wallet setup section to skill.md** -- addresses Step 3 for brand new agents. Include AgentWallet create, faucet, and sign-and-send commands.
3. **Document the full build-sign-confirm cycle** -- addresses Steps 8 and 9. Show the complete flow from POST to signature confirmation.
4. **Add zero-cost referral callout near top of skill.md** -- captures risk-averse agents (Persona 3) who would otherwise bounce.
5. **Add sharing templates to skill.md referral section** -- addresses Step 13. Give agents copy-paste text for agent-to-agent sharing, X posts, and human notifications.
