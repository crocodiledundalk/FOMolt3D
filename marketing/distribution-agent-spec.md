# FOMolt3D Distribution Agent Specification

> Phase 4.9 deliverable for WS4 (Marketing & Distribution).
> This spec defines a complete autonomous agent that manages FOMolt3D's public presence
> across X, Discord, Moltbook, and GitHub Discussions.
>
> The distribution agent dogfoods the very patterns we ask other agents to adopt:
> CRON-based game state monitoring, automated social posting, Blink URL inclusion,
> and referral link distribution. It is both a marketing tool and a proof-of-concept
> for agent-driven game participation.
>
> This document is the implementation blueprint. It is written so that a developer
> can build the agent from this spec alone, without needing to reverse-engineer
> intent from code.

---

## Table of Contents

1. [Agent Identity](#1-agent-identity)
2. [Automated Posting Schedule](#2-automated-posting-schedule)
3. [Channel Distribution](#3-channel-distribution)
4. [Content Generation](#4-content-generation)
5. [Technical Implementation](#5-technical-implementation)
6. [Anti-Spam Guardrails](#6-anti-spam-guardrails)
7. [Open-Source Narrative](#7-open-source-narrative)

**Appendices:**
- [A. Template Reference](#appendix-a-template-reference)
- [B. Blink URLs Quick Reference](#appendix-b-blink-urls-quick-reference)
- [C. Game Parameters Quick Reference](#appendix-c-game-parameters-quick-reference)
- [D. Cost Estimate](#appendix-d-cost-estimate)
- [E. Deployment Checklist](#appendix-e-deployment-checklist)
- [F. Cross-Reference to Other Documents](#appendix-f-cross-reference-to-other-documents)

---

## 1. Agent Identity

### X / Twitter Account

| Field | Value |
|-------|-------|
| **Handle** | `@FOMolt3D` |
| **Display name** | FOMolt3D |
| **Bio** | "AI agents playing game theory for real SOL on Solana. Automated updates from FOMolt3D. Open source: github.com/crocodiledundalk/FOMolt3D" |
| **Avatar** | A stylized molten 3D cube or die with the Solana logo, rendered in orange/gold tones on a dark background. Must read clearly at 48x48px (X profile image size). |
| **Header image** | Dashboard screenshot showing the live game state: pot, timer, activity feed, and leaderboard. Updated monthly or at the start of each significant round. |
| **Location** | "Solana Mainnet" |
| **Website** | `https://fomolt3d.com` |
| **Category** | Business / Technology (if applicable on X) |

**Pinned tweet** -- updated at the start of each new round or weekly:

```
FOMolt3D: AI agents compete in game theory for real SOL on Solana.

Watch: https://fomolt3d.com
Play: https://fomolt3d.com/skill.md
Source: https://github.com/crocodiledundalk/FOMolt3D

50% to last buyer. 43% dividends. Bonding curve pricing.
```

### Solana Wallet

The distribution agent holds a Solana wallet for **two purposes only**:

1. **Referral link**: The agent has its own referral link (`?ref={AGENT_PUBKEY}`). When the agent shares game links, the referral param is included. Any agent or human who buys keys via the agent's link generates referral income for the agent's wallet.

2. **Dogfooding**: Demonstrates that agents can earn via referrals without buying keys. The agent is living proof that zero-cost referral income works.

**The agent DOES NOT buy keys or play the game.** This is a deliberate, non-negotiable decision:

- The agent has access to real-time game state and could front-run other players.
- Playing would undermine trust in the game's fairness.
- The insider-trading optics would be devastating for credibility.
- The referral-only model proves that agents can earn without capital risk.

**Referral earnings transparency**: The agent's referral earnings are publicly viewable at `GET /api/player/{AGENT_PUBKEY}`. A monthly transparency post reports:

- Total referral earnings accrued
- Total referral earnings claimed
- Number of agents/humans referred
- How earnings are used (options: burned, donated to tournament pool, reinvested in X API costs, or held transparently)

### Tone of Voice

| Dimension | Specification |
|-----------|--------------|
| **Register** | Informative, concise, data-driven. Not hype-driven. Think "Bloomberg Terminal meets a sports ticker." |
| **Personality** | Neutral reporter with occasional game theory commentary. Appreciates good strategy. Notes interesting patterns. |
| **Excitement level** | Calm for routine updates. Elevated for timer drama (< 60s) and round endings. Never hyperbolic -- let the numbers speak. |
| **Emoji usage** | Minimal. Only for visual scanning: timer icon for time updates, chart icon for milestones, trophy for winners. Max 2 emojis per post. |
| **Hashtags** | `#FOMolt3D` on every post. Contextual: `#Solana`, `#AIAgents`, `#GameTheory` as appropriate. Max 3 hashtags per post. |
| **Thread behavior** | Single tweets for event updates. Threads (max 4 tweets) only for daily/weekly recaps. |
| **Financial language** | NEVER use: "guaranteed," "profit," "risk-free," "investment advice," "will make money," "can't lose." ALWAYS include: "Not financial advice" in bio. |
| **Language** | English only (initial launch). |
| **Pronouns** | Refers to itself as "FOMolt3D" (not "I" or "we"). Third-person reporting style. |

---

## 2. Automated Posting Schedule

The agent polls game state every 30 seconds and posts based on the following 10 triggers. All posts include appropriate Blink URLs for human interaction and the agent's referral parameter.

### Trigger Table

| # | Trigger | Condition | Action | Template Ref | Channels | Priority |
|---|---------|-----------|--------|-------------|----------|----------|
| 1 | **Game state poll** | Every 30 seconds | Fetch `GET /api/state`. Compare with previous state snapshot. Evaluate all trigger conditions below. | -- (internal) | Internal only | -- |
| 2 | **Pot milestone** | `pot_sol` crosses a milestone threshold (1, 5, 10, 25, 50, 100, 250, 500 SOL). Each milestone fires **once per round**. | Post milestone tweet with buy-keys Blink URL. | `pot_milestone` | X | Normal |
| 3 | **Timer drama** | `timer_remaining < 60` seconds AND no timer-drama post in last 5 minutes | Post timer drama tweet with buy-keys Blink URL. Include pot size and active agent count. | `timer_drama` | X | High |
| 4 | **Round end** | `active` transitions from `true` to `false` (winner claimed or timer expired) | Post winner announcement with round stats. Post new-round teaser as reply. Cross-post recap to Discord and Moltbook. | `round_end`, `round_recap` | X, Discord, Moltbook | Critical |
| 5 | **New round start** | `round_number` increments AND `active == true` | Post new round announcement with floor-price buy-keys Blink URL. Highlight that keys are at minimum price. | `new_round` | X, Discord, Moltbook | High |
| 6 | **Hourly summary** | Every 60 minutes, IF at least 1 buy transaction occurred in the last hour | Post activity summary: buys this hour, pot change, active agents, current key price, timer remaining. | `hourly_summary` | X | Low |
| 7 | **Daily recap** | Once daily at 18:00 UTC | Post daily stats thread (2-3 tweets): rounds completed today, total SOL volume, top 3 agents by dividends, notable events. | `daily_recap` | X, Discord | Normal |
| 8 | **Weekly leaderboard** | Monday 12:00 UTC | Post top 10 leaderboard thread (3-4 tweets): rankings, tournament winners if applicable, strategy spotlights, weekly volume. | `weekly_leaderboard` | X, Discord, Moltbook, GitHub Discussions | Normal |
| 9 | **Significant event** | A single buy exceeds 5 SOL, OR a new agent enters (first-ever buy from a new address), OR a notable referral chain event occurs | Post event highlight. For large buys, note the amount and impact on pot. For new agents, welcome them. | `significant_event` | X | Normal |
| 10 | **Manual override** | Operator sends `POST /admin/agent/post` with `{ "text": "...", "channels": ["x", "discord"] }` | Post the provided text verbatim (after sanitization) to specified channels. Used for announcements, corrections, or one-off posts. | None (direct text) | As specified | Immediate |

### Posting Frequency Caps

| Period | Maximum Posts | Rationale |
|--------|-------------|-----------|
| Per hour | 5 | Avoid flooding followers' timelines. Leave room for manual overrides. |
| Per day | 20 | Stay well under X API limits (100/day on Basic tier) and avoid spam perception. |
| Per round-end event | 3 | Allow a burst for the most newsworthy event (announcement + recap + new round). |
| Timer drama per 5 min | 1 | Prevent repetitive "timer low!" posts that annoy followers. |
| Hourly summary | 1 per hour (skip if no activity) | Hourly is already frequent; never double-post. |

**When the daily cap is reached:** All remaining posts for that UTC day are queued in memory. At midnight UTC, the queue is drained (up to the new daily cap) in priority order: Critical > High > Normal > Low. If the queue exceeds 20, lowest-priority items are dropped.

### Post De-duplication Rules

| Rule | Key Format | Cooldown | Implementation |
|------|-----------|----------|----------------|
| No duplicate pot milestones per round | `pot_milestone_{round}_{sol_amount}` | Infinity (once per round) | Track `Set<string>` per round. Reset on new round. |
| No duplicate round-end posts | `round_end_{round_number}` | Infinity (once ever per round) | Check before posting. |
| No identical text within 24 hours | `text_hash_{sha256(text).slice(0,16)}` | 24 hours | SHA-256 hash of post text. Check against 24h in-memory cache with TTL eviction. |
| Timer drama cooldown | `timer_drama_{round}` | 5 minutes | Timestamp-based check. |
| Hourly summary only if activity | Check `buys_this_hour > 0` | 55 minutes | Count buy events since last hourly post. |
| Daily recap | `daily_{YYYY-MM-DD}` | 23 hours | Date-string key. |
| Weekly leaderboard | `weekly_{YYYY}_{week_number}` | 6 days | ISO week number. |

### Trigger Evaluation Pseudocode

```typescript
// Runs every 30 seconds
async function pollAndEvaluate(): Promise<void> {
  const currentState = await fetchGameState(); // GET /api/state
  if (!currentState) return; // API error, skip cycle

  const prev = previousState;
  previousState = currentState;

  if (!prev) return; // First poll, establish baseline

  // Trigger 2: Pot milestone
  const currentMilestone = getHighestMilestone(currentState.pot_sol);
  const prevMilestone = getHighestMilestone(prev.pot_sol);
  if (currentMilestone > prevMilestone) {
    await tryPost('pot_milestone', {
      key: `pot_milestone_${currentState.round}_${currentMilestone}`,
      data: { pot: currentState.pot_sol, milestone: currentMilestone, ...currentState }
    });
  }

  // Trigger 3: Timer drama
  if (currentState.timer_remaining < 60 && currentState.active) {
    await tryPost('timer_drama', {
      key: `timer_drama_${currentState.round}`,
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      data: currentState
    });
  }

  // Trigger 4: Round end
  if (prev.active && !currentState.active) {
    await tryPost('round_end', {
      key: `round_end_${prev.round}`,
      data: { ...currentState, winner: currentState.last_buyer },
      channels: ['x', 'discord', 'moltbook']
    });
  }

  // Trigger 5: New round
  if (currentState.round > prev.round && currentState.active) {
    await tryPost('new_round', {
      key: `new_round_${currentState.round}`,
      data: currentState,
      channels: ['x', 'discord', 'moltbook']
    });
  }

  // Trigger 9: Significant event (large buy)
  if (currentState.pot_sol - prev.pot_sol >= 5) {
    await tryPost('significant_event', {
      key: `big_buy_${Date.now()}`,
      data: { amount: currentState.pot_sol - prev.pot_sol, ...currentState }
    });
  }

  // Trigger 9: New agent (first buy from new address)
  // Detected by monitoring /api/events or comparing player counts
  // Implementation depends on event stream availability
}

// Scheduled triggers (not in the 30s loop)
// Trigger 6: Hourly summary  -> cron('0 * * * *')
// Trigger 7: Daily recap      -> cron('0 18 * * *')
// Trigger 8: Weekly leaderboard -> cron('0 12 * * 1')
```

### State Snapshot Structure

The agent maintains a single in-memory state snapshot that is compared against each poll:

```typescript
interface GameStateSnapshot {
  round: number;
  pot_sol: number;
  pot_lamports: number;
  timer_remaining: number; // seconds
  timer_end: number; // unix timestamp
  total_keys: number;
  active_agents: number;
  active: boolean;
  last_buyer: string; // pubkey
  key_price: number; // SOL
  phase: string; // "active" | "waiting" | "ended"
}

interface AgentState {
  previousSnapshot: GameStateSnapshot | null;
  currentSnapshot: GameStateSnapshot | null;
  milestonesPostedThisRound: Set<number>;
  postCacheTTL: Map<string, number>; // key -> timestamp
  dailyPostCount: number;
  hourlyPostCount: number;
  hourlyBuyCount: number;
  lastHourlyPostTime: number;
  lastDailyPostDate: string; // YYYY-MM-DD
  lastWeeklyPostWeek: string; // YYYY-WW
  postQueue: QueuedPost[];
  consecutiveApiFailures: number;
  paused: boolean;
}
```

---

## 3. Channel Distribution

### X / Twitter (Primary Channel)

- **Triggers served:** All 10 triggers post to X.
- **Format:** Single tweets (< 280 chars) for event triggers 2, 3, 5, 6, 9. Threads (3-4 tweets) for daily recap (7) and weekly leaderboard (8). Two-tweet sequence for round end (4: announcement + recap).
- **Media:** OG images auto-generated by the game URL when shared. Twitter card previews show pot size, timer, agent count. No custom image generation required initially -- the OG meta tags on `fomolt3d.com` generate the preview.
- **Blinks in every post:** Every post includes at least one Blink URL:
  - Milestone and timer posts: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys`
  - Round end posts: `https://fomolt3d.com` (triggers Blink via `actions.json` for extension users, OG card for others)
  - New round posts: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys` (floor price -- emphasize cheapest entry)
  - Generic/recap posts: `https://fomolt3d.com`
- **Referral param:** All links include the agent's referral param: `?ref={AGENT_PUBKEY}`.
- **Reply management:** The agent does NOT auto-reply to mentions unless the mention contains a FOMolt3D-related keyword (see Section 6).

### Discord (Secondary Channel)

- **Triggers served:** Round end (4), new round (5), daily recap (7), weekly leaderboard (8).
- **Channels:**
  - FOMolt3D's own Discord server: `#game-updates` channel (bot posts automatically via webhook).
  - Partner servers (Solana agent communities): post in designated bot/update channels WITH server admin permission only. Never post without explicit invitation.
- **Format:** Discord embeds with rich formatting:
  - Title: event type (e.g., "Round 7 Ended")
  - Description: summary text with key stats
  - Fields: pot, winner, duration, keys sold, top agents
  - Color: gold (#FFD700) for milestones, red (#FF4444) for timer drama, green (#44FF44) for new rounds, blue (#4488FF) for recaps
  - Footer: "fomolt3d.com | Not financial advice"
- **Frequency:** Lower than X. Target: 3-5 Discord posts per day. Only major events (4 triggers vs. 10).
- **Implementation:** Discord webhooks (no bot user required for outbound-only posting). One webhook URL per channel, stored in config.

### Moltbook (Secondary Channel)

- **Triggers served:** Round end (4), new round (5), weekly leaderboard (8).
- **Format:** Markdown posts via Moltbook API (if available) or manual posting via the agent's Moltbook account.
- **Content:** Longer-form than X. Include round recap stats table, strategy analysis, leaderboard, and commentary. 500-2000 characters.
- **Frequency:** 1-2 posts per day maximum. Moltbook audiences expect substance, not rapid-fire updates.
- **Implementation:** HTTP POST to Moltbook API endpoint (TBD -- depends on Moltbook API availability). Fallback: queue posts for manual operator submission.

### GitHub Discussions (Tertiary Channel)

- **Triggers served:** Weekly leaderboard (8) only.
- **Channel:** `https://github.com/crocodiledundalk/FOMolt3D/discussions`
- **Category:** "Show and Tell"
- **Format:** Discussion post with weekly summary: stats table, top 10 leaderboard, notable events, strategy analysis, community highlights. Full Markdown formatting.
- **Frequency:** Once per week (Monday 12:00 UTC).
- **Implementation:** GitHub API (`POST /repos/{owner}/{repo}/discussions` via `gh api` or `octokit`). Requires a GitHub token with discussion write permissions.

### Channel Priority During Rate Limiting

When the agent is approaching daily post limits or experiencing API rate limits, channels are prioritized:

1. **X** (always first -- primary audience, highest reach)
2. **Discord** (second -- community engagement)
3. **Moltbook** (third -- can tolerate delays)
4. **GitHub Discussions** (lowest priority -- weekly only, easily deferred)

---

## 4. Content Generation

### Option A: Template-Based (Primary -- Ship First)

All automated posts use pre-defined templates with placeholder substitution. This is the launch-day system.

**How it works:**

1. Game state is fetched: `{ pot_sol, timer_remaining, total_keys, active_agents, round_number, winner, key_price, last_buyer, phase }`.
2. The appropriate template is selected based on the trigger type.
3. Placeholders are substituted: `{pot}` becomes `14.7`, `{agents}` becomes `47`, `{timer}` becomes `23:47:12`, etc.
4. Character count is validated (< 280 for single tweets).
5. Post is sent to the appropriate channel(s).

**Template example -- pot milestone:**

```
FOMolt3D pot just hit {pot} SOL.

{agents} AI agents competing. Key price: {key_price} SOL.
Timer: {timer}.

Watch or play: https://fomolt3d.com?ref={AGENT_PUBKEY}

#FOMolt3D #Solana #AIAgents
```

**Template example -- timer drama:**

```
{timer_seconds}s remaining. {pot} SOL on the line.

{agents} agents watching. Last buyer wins 50% of pot.

Buy keys: https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys&ref={AGENT_PUBKEY}

#FOMolt3D
```

**Template example -- round end:**

```
Round {round} complete.

Winner: {winner_short}
Pot: {pot} SOL
Keys sold: {total_keys}
Duration: {duration}

New round starting. Keys at floor price (0.005 SOL).
https://fomolt3d.com?ref={AGENT_PUBKEY}

#FOMolt3D #Solana
```

**Template example -- new round:**

```
Round {round} is live. Keys at floor price: 0.005 SOL.

This is the cheapest entry point. Price increases with every buy.

Buy keys: https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys&ref={AGENT_PUBKEY}

#FOMolt3D #AIAgents
```

**Template example -- hourly summary:**

```
FOMolt3D hourly update:

Buys this hour: {buys}
Pot: {pot} SOL (+{pot_change} SOL)
Active agents: {agents}
Key price: {key_price} SOL
Timer: {timer}

https://fomolt3d.com?ref={AGENT_PUBKEY}
```

**Template variety:** Each trigger type should have 3-5 template variants. The agent selects randomly (or round-robin) to avoid repetitive feeds. The content variety guardrail (Section 6) tracks which variants were recently used.

**Advantages:**
- Predictable, controllable, auditable
- No API costs for content generation
- No risk of off-brand, hallucinated, or legally problematic messaging
- Instant -- no generation latency
- Easy to review and approve new templates

**Disadvantages:**
- Repetitive over time (mitigated by variant rotation)
- Cannot adapt to novel game situations
- Cannot generate commentary or analysis

### Option B: AI-Generated Commentary (Secondary -- Add Later)

For weekly and daily summaries, use an AI model to generate natural-language commentary on game events. This adds variety and depth to recap posts.

**How it works:**

1. Collect the period's data: round results, leaderboard changes, strategy shifts, notable events, large buys, new entrants.
2. Send to an AI model (Claude API) with a system prompt:

```
You are the FOMolt3D game reporter. Write a concise, data-driven summary.

Tone: informative, concise, occasionally witty. No hype. No financial advice.
Include: top performers, strategy observations, notable moments, stats.
NEVER use: "guaranteed," "profit," "risk-free," "investment advice," "will make money."
ALWAYS end with: "Not financial advice."

Max length: {max_chars} characters.

Game data for this period:
{json_data}
```

3. Validate the generated content against the keyword blocklist (see Section 6).
4. Validate character count.
5. If validation passes: post. If validation fails: fall back to the template-based version.

**When to add Option B:**
- After the template-based system has been running for 2+ weeks
- When the operator wants more variety in daily/weekly recaps
- Start with weekly summaries only (lowest frequency, easiest to review)
- Expand to daily recaps after 1 week of successful weekly generation

**Guardrails for AI-generated content:**

| Guardrail | Implementation |
|-----------|---------------|
| Keyword blocklist | Reject posts containing: "guaranteed," "profit," "risk-free," "investment advice," "will make money," "can't lose," "moon," "pump." |
| Max length enforcement | Truncate to template fallback if AI generates more than the character limit. |
| Human review queue | AI-generated posts go to a review queue (Discord DM to operator) for the first 2 weeks. After validation, switch to auto-post with async review. |
| Clear labeling | AI-generated posts include "(AI commentary)" in the footer. This is non-negotiable for transparency. |
| Fallback on failure | If AI API is unavailable, rate-limited, or generates blocked content: silently fall back to template. Never skip the post entirely. |
| Cost cap | Max $5/month on AI API calls. At Claude Haiku pricing, this covers hundreds of generations. |

---

## 5. Technical Implementation

### Architecture Overview

```
+-------------------+     +------------------+     +------------------+
|                   |     |                  |     |                  |
|  FOMolt3D API     |<----|  Distribution    |---->|  X / Twitter API |
|  (game state)     |     |  Agent Process   |     |  (posting)       |
|                   |     |  (Node.js)       |     |                  |
+-------------------+     +--+---+---+---+---+     +------------------+
                             |   |   |   |
                             |   |   |   +-------->  Discord Webhooks
                             |   |   |
                             |   |   +------------>  Moltbook API
                             |   |
                             |   +---------------->  GitHub API
                             |
                             +-------------------->  Operator Alerts
                                                     (Discord DM)
```

**Runtime:** Node.js (LTS, currently 20.x or 22.x) running as a persistent process with `setInterval` for the 30-second polling loop and `node-cron` for scheduled triggers.

**Why not serverless:** The 30-second polling interval and stateful tracking (previous game state, de-duplication cache, post counters, milestone tracking) favor a persistent process over cold-start serverless functions. The state is small (< 1KB in memory) and does not need a database.

**Why not part of the Next.js app:** Separation of concerns. The distribution agent is an independent consumer of the public API. It should be deployable, restartable, and upgradeable independently of the web app. If the Next.js app goes down for deployment, the agent continues posting from cached state. If the agent crashes, the web app is unaffected.

### X API Integration

| Parameter | Value |
|-----------|-------|
| **Tier** | Basic ($100/month) |
| **Post limit** | 100 posts per day (our cap: 20) |
| **Read limit** | 50,000 tweet reads per month |
| **Auth** | OAuth 2.0 with PKCE |
| **Token storage** | Environment variables (`X_ACCESS_TOKEN`, `X_REFRESH_TOKEN`). NEVER in code or config files. |
| **Library** | `twitter-api-v2` npm package (well-maintained, handles rate limit headers) |
| **Rate limit handling** | Library reads `x-rate-limit-reset` header. On 429, queue the post and retry after reset window. |
| **Thread posting** | Use `in_reply_to_tweet_id` from the response of the first tweet in a thread. Post sequentially with 1-second delay between tweets. |

**Token refresh flow:**

```typescript
// OAuth 2.0 token refresh (twitter-api-v2 handles this automatically)
// But we need to persist the new refresh token:
client.on('tokenRefreshed', ({ accessToken, refreshToken }) => {
  // Write to a secure token file (not env vars, since those are static)
  writeTokenFile({ accessToken, refreshToken });
  // The token file is .gitignored and permission-restricted (600)
});
```

### Game State Polling

```typescript
async function fetchGameState(): Promise<GameStateSnapshot | null> {
  try {
    const response = await fetch(`${config.game.api_base}/api/state`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000) // 10s timeout
    });

    if (!response.ok) {
      agentState.consecutiveApiFailures++;
      log('warn', `API returned ${response.status}`);

      if (agentState.consecutiveApiFailures >= config.alerts.api_failure_threshold) {
        await alertOperator(`Game API unreachable for ${agentState.consecutiveApiFailures} consecutive polls`);
      }

      if (agentState.consecutiveApiFailures >= (config.alerts.api_pause_threshold_minutes * 2)) {
        // 30 min = 60 polls at 30s interval
        agentState.paused = true;
        await alertOperator('Distribution agent PAUSED due to extended API failure.');
      }

      return null;
    }

    agentState.consecutiveApiFailures = 0;
    if (agentState.paused) {
      agentState.paused = false;
      await alertOperator('Distribution agent RESUMED. API is reachable again.');
    }

    const data = await response.json();
    return parseGameState(data);
  } catch (error) {
    agentState.consecutiveApiFailures++;
    log('error', `API fetch error: ${error.message}`);
    return null;
  }
}

function parseGameState(json: any): GameStateSnapshot {
  return {
    round: json.gameState.round,
    pot_sol: json.gameState.potLamports / 1_000_000_000,
    pot_lamports: json.gameState.potLamports,
    timer_remaining: Math.max(0, json.gameState.timerEnd - Math.floor(Date.now() / 1000)),
    timer_end: json.gameState.timerEnd,
    total_keys: json.gameState.totalKeys,
    active_agents: json.activePlayers || 0,
    active: json.gameState.active,
    last_buyer: json.gameState.lastBuyer,
    key_price: json.keyPriceLamports / 1_000_000_000,
    phase: json.phase
  };
}
```

### Post De-duplication

```typescript
class PostDeduplicator {
  private cache: Map<string, number> = new Map(); // key -> timestamp

  canPost(eventKey: string, cooldownMs: number): boolean {
    const lastPosted = this.cache.get(eventKey);
    if (!lastPosted) return true;
    if (cooldownMs === Infinity) return false; // once-ever events
    return Date.now() - lastPosted > cooldownMs;
  }

  recordPost(eventKey: string): void {
    this.cache.set(eventKey, Date.now());
  }

  // Evict entries older than 48 hours to prevent memory growth
  evict(): void {
    const cutoff = Date.now() - (48 * 60 * 60 * 1000);
    for (const [key, timestamp] of this.cache) {
      if (timestamp < cutoff) this.cache.delete(key);
    }
  }

  // Reset round-specific entries when a new round starts
  resetForNewRound(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('pot_milestone_') || key.startsWith('timer_drama_')) {
        this.cache.delete(key);
      }
    }
  }
}
```

### Frequency Cap Enforcement

```typescript
class FrequencyCap {
  private hourlyCount: number = 0;
  private dailyCount: number = 0;
  private lastHourReset: number = Date.now();
  private lastDayReset: string = new Date().toISOString().slice(0, 10);

  canPost(): { allowed: boolean; reason?: string } {
    this.maybeReset();

    if (this.dailyCount >= config.twitter.max_posts_per_day) {
      return { allowed: false, reason: 'daily cap reached' };
    }
    if (this.hourlyCount >= config.twitter.max_posts_per_hour) {
      return { allowed: false, reason: 'hourly cap reached' };
    }
    return { allowed: true };
  }

  recordPost(): void {
    this.hourlyCount++;
    this.dailyCount++;
  }

  private maybeReset(): void {
    const now = Date.now();
    if (now - this.lastHourReset > 60 * 60 * 1000) {
      this.hourlyCount = 0;
      this.lastHourReset = now;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastDayReset) {
      this.dailyCount = 0;
      this.lastDayReset = today;
    }
  }
}
```

### Error Handling

| Error | Response | Retry Strategy |
|-------|----------|---------------|
| X API rate limit (429) | Queue post. Retry after `x-rate-limit-reset` header time. | Automatic, library-handled. |
| X API auth error (401/403) | Log critical error. Alert operator via Discord DM. Pause X posting. | Manual intervention required. |
| X API network error | Retry 3 times with exponential backoff (1s, 5s, 15s). Then skip. | Skip and log. |
| X API 5xx | Retry 3 times with exponential backoff. Then queue for next cycle. | Queue with backoff. |
| Discord webhook fails | Retry 3 times with exponential backoff. Log and skip if persistent. | Skip and log. |
| Game API returns non-200 | Skip this poll cycle. Increment failure counter. | Auto-resume on next successful poll. |
| Game API unreachable | Skip cycle. Alert operator after 5 consecutive failures (2.5 min). Pause posting after 30 min. | Auto-resume when API returns. |
| Duplicate post detected | Skip silently. Log at debug level for troubleshooting. | No retry needed. |
| Post exceeds 280 chars | Truncate at last complete sentence before 280 chars. If impossible, skip and log. | No retry -- template needs fixing. |
| Post queue overflow | Drop lowest-priority posts when queue exceeds 50 items. | Priority-based eviction. |

### Logging

All agent activity is logged to JSONL (newline-delimited JSON) files for debugging, auditing, and analytics.

```typescript
// Post log: every post attempt (success or failure)
interface PostLogEntry {
  timestamp: string; // ISO 8601
  trigger: string; // "pot_milestone", "timer_drama", etc.
  channel: string; // "x", "discord", "moltbook", "github"
  status: "posted" | "skipped" | "queued" | "failed";
  reason?: string; // "duplicate", "rate_limited", "daily_cap", etc.
  text?: string; // the post text (truncated to 300 chars in logs)
  tweet_id?: string; // X tweet ID if posted successfully
  response_time_ms?: number;
}

// Error log: any error during operation
interface ErrorLogEntry {
  timestamp: string;
  severity: "warn" | "error" | "critical";
  component: string; // "poll", "x_api", "discord", "dedup", etc.
  message: string;
  stack?: string;
}
```

**Log files:**
- `logs/posts.jsonl` -- all post attempts
- `logs/errors.jsonl` -- all errors
- **Rotation:** Rotate daily. Keep 30 days. Total disk: < 50 MB.

### Deployment

**Option 1: pm2 (recommended for simplicity)**

```bash
# Install and start
npm install -g pm2
pm2 start distribution-agent.js --name fomolt3d-agent --max-memory-restart 256M

# Auto-restart on crash, boot
pm2 startup
pm2 save

# Monitoring
pm2 monit
pm2 logs fomolt3d-agent
```

**Option 2: systemd (for production VPS)**

```ini
[Unit]
Description=FOMolt3D Distribution Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/fomolt3d/distribution-agent/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/fomolt3d/distribution-agent/.env
WorkingDirectory=/opt/fomolt3d/distribution-agent
User=fomolt3d
Group=fomolt3d

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/fomolt3d/distribution-agent/logs

[Install]
WantedBy=multi-user.target
```

### Monitoring

| Monitor | Method | Alert Threshold | Alert Channel |
|---------|--------|----------------|---------------|
| Agent process alive | pm2/systemd health check | Process crash -> auto-restart + alert | Operator Discord DM |
| Posts per day | Count entries in `posts.jsonl` | < 1 post in 24 hours (if game is active) | Operator Discord DM |
| Error rate | Count entries in `errors.jsonl` | > 10 errors per hour | Operator Discord DM |
| API response time | Measure `/api/state` latency per poll | > 5 seconds average (10-poll rolling) | Operator Discord DM |
| X API quota usage | Track daily post count | > 80 posts in a day -> warning | Operator Discord DM |
| Memory usage | pm2 memory tracking | > 200 MB -> warning, > 256 MB -> restart | pm2 auto-restart |
| Disk usage (logs) | Cron job checking `logs/` directory | > 100 MB -> rotate and alert | Operator Discord DM |

### Configuration File

All configurable values live in a single YAML config file. Secrets are loaded from environment variables.

```yaml
# distribution-agent-config.yaml

agent:
  name: FOMolt3D
  version: 1.0.0

game:
  api_base: https://fomolt3d.com
  poll_interval_seconds: 30
  referral_pubkey: AGENT_SOLANA_PUBKEY_HERE

twitter:
  enabled: true
  max_posts_per_day: 20
  max_posts_per_hour: 5
  hashtags: ["#FOMolt3D", "#Solana", "#AIAgents"]
  thread_delay_ms: 1000

discord:
  enabled: true
  webhook_urls:
    game_updates: ${DISCORD_WEBHOOK_GAME_UPDATES}
  embed_colors:
    milestone: "#FFD700"
    timer_drama: "#FF4444"
    new_round: "#44FF44"
    recap: "#4488FF"
    round_end: "#FFD700"

moltbook:
  enabled: false  # enable when API access is confirmed
  api_base: https://moltbook.com/api

github:
  enabled: true
  repo: crocodiledundalk/FOMolt3D
  discussion_category: "Show and Tell"

triggers:
  pot_milestones_sol: [1, 5, 10, 25, 50, 100, 250, 500]
  timer_drama_threshold_seconds: 60
  timer_drama_cooldown_minutes: 5
  hourly_summary_min_buys: 1
  daily_recap_time_utc: "18:00"
  weekly_leaderboard_day: "monday"
  weekly_leaderboard_time_utc: "12:00"
  significant_buy_threshold_sol: 5

content:
  mode: template  # "template" or "ai"
  ai_model: claude-3-5-haiku-20241022  # for Option B
  ai_review_queue: true  # require human approval for AI-generated posts
  ai_max_monthly_cost_usd: 5
  templates_dir: ./templates/
  template_variants: 3  # number of variants per trigger type

logging:
  post_log: ./logs/posts.jsonl
  error_log: ./logs/errors.jsonl
  level: info  # "debug" | "info" | "warn" | "error"
  rotation_days: 30

alerts:
  operator_discord_webhook: ${OPERATOR_DISCORD_WEBHOOK}
  api_failure_threshold: 5  # consecutive failures before alert
  api_pause_threshold_minutes: 30
  error_rate_threshold_per_hour: 10

graceful_degradation:
  no_activity_reduce_hours: 24  # reduce to 1 post/day after this
  no_activity_stop_hours: 72  # stop posting entirely after this
  checking_in_template: "FOMolt3D is quiet. No buys in {hours} hours. Pot: {pot} SOL. Timer: {timer}. Game is waiting. https://fomolt3d.com?ref={AGENT_PUBKEY} #FOMolt3D"
```

### Admin API

The distribution agent exposes a minimal admin API on localhost for operator control:

```
POST /admin/agent/post
  Body: { "text": "...", "channels": ["x", "discord"] }
  -> Posts the text to specified channels (sanitized, cap-checked)

POST /admin/agent/pause
  -> Pauses all posting. Agent continues polling but does not post.

POST /admin/agent/resume
  -> Resumes posting.

GET /admin/agent/status
  -> Returns: { paused, dailyPostCount, hourlyPostCount, consecutiveApiFailures,
                lastPostTime, lastPollTime, queueSize, uptime }

POST /admin/agent/config/reload
  -> Reloads config.yaml without restarting the process.
```

**Security:** Admin API binds to `127.0.0.1:3001` only. Not accessible from the network. Operator accesses via SSH tunnel or the VPS console. No authentication required (localhost-only is the auth boundary).

---

## 6. Anti-Spam Guardrails

These rules are non-negotiable. They protect the agent's reputation, comply with X's bot policies, and prevent the project from being perceived as spam.

| # | Rule | Implementation | Rationale |
|---|------|---------------|-----------|
| 1 | **Max 20 posts/day** | Hard cap in the `FrequencyCap` class. If daily count >= 20, all posts are queued until midnight UTC. | X API allows 100, but 20 keeps us far from spam territory. Leaves 80% headroom for manual overrides and emergencies. |
| 2 | **No reply to unrelated threads** | The agent only posts original tweets and replies to its own threads. It NEVER replies to other users' tweets unless they @mention the agent AND the mention contains a FOMolt3D-related keyword (game state query, rule question, etc.). | Prevents the agent from appearing in unrelated conversations. |
| 3 | **No DM spam** | DM functionality is disabled entirely. The agent does not send or respond to DMs. | DMs from bots are universally perceived as spam. |
| 4 | **Transparent labeling** | Bio states "Automated updates from FOMolt3D." Every post is clearly game-related. No impersonation of humans. No pretending to be a person. | Transparency builds trust and complies with X's automated account policy. |
| 5 | **Respect blocks and mutes** | X handles this natively (blocked users do not see the agent's posts). The agent does not track or retaliate against blocks. | Standard social media etiquette. |
| 6 | **No financial claims** | Keyword filter blocks posts containing: "guaranteed," "profit," "risk-free," "investment advice," "will make money," "can't lose," "moon," "to the moon," "pump," "100x." Filter runs on ALL posts including manual overrides. | Avoids regulatory issues and misleading claims. |
| 7 | **No engagement bait** | No "like and retweet to win" posts. No follow-for-follow. No contests that require social actions. No "tag 3 friends" posts. | Engagement bait is spam-adjacent and degrades account reputation on X. |
| 8 | **Cooling period after round end** | After a round-end burst (up to 3 posts), enforce a 30-minute cooldown before the next non-recap post. | Prevents a cluster of posts that looks like a spam burst. |
| 9 | **Content variety enforcement** | Track last 10 post types in a circular buffer. If more than 5 of the same type in the last 10, skip and wait for a different trigger. | Prevents monotonous feeds of identical templates. |
| 10 | **Graceful degradation on inactivity** | If the game has no buy activity for 24+ hours: reduce posting to once per day ("checking in" post). If no activity for 72+ hours: stop posting entirely until activity resumes. | Prevents the agent from posting into a void when nobody is playing. |
| 11 | **No follow/unfollow manipulation** | The agent does not follow accounts to attract follow-backs. It does not mass-follow. Its following list is manually curated (FOMolt3D team, Solana ecosystem accounts, key partners only). | Follow manipulation is detectable and damages reputation. |
| 12 | **Post sanitization** | All post text (including manual overrides) is sanitized: strip control characters, validate UTF-8, remove excess whitespace, enforce max length. | Prevents accidental broken formatting or injection. |

### Keyword Blocklist

The following words/phrases are blocked from ALL posts (template-based, AI-generated, and manual overrides). The filter is case-insensitive and matches whole words:

```
guaranteed, profit, risk-free, risk free, investment advice, financial advice,
will make money, can't lose, cannot lose, moon, to the moon, mooning,
pump, pumping, 100x, 1000x, get rich, free money, no risk, sure thing,
safe investment, alpha leak, insider, NFA
```

**"NFA" is blocked** because including "NFA" (Not Financial Advice) as a parenthetical after making financial claims is a known pattern of bad-faith actors. The agent should not make financial claims in the first place, making "NFA" unnecessary and suspicious.

---

## 7. Open-Source Narrative

### Separate Repository

The distribution agent is released as a separate open-source repository:

| Field | Value |
|-------|-------|
| **Repo name** | `fomolt3d-distribution-agent` |
| **License** | MIT |
| **Org/Owner** | `crocodiledundalk` (same as main repo) |

**Repository contents:**

```
fomolt3d-distribution-agent/
  index.js              -- main entry: polling loop, trigger evaluation, posting
  config.yaml           -- example configuration (placeholder secrets)
  .env.example          -- required environment variables
  package.json          -- dependencies (minimal)
  templates/
    pot-milestone.txt   -- template variants for pot milestones
    timer-drama.txt     -- template variants for timer drama
    round-end.txt       -- template variants for round endings
    new-round.txt       -- template variants for new round starts
    hourly-summary.txt  -- template variants for hourly summaries
    daily-recap.txt     -- template variants for daily recaps
    weekly-leaderboard.txt -- template variants for weekly leaderboard
    significant-event.txt  -- template variants for significant events
  lib/
    polling.js          -- game state fetching and parsing
    triggers.js         -- trigger evaluation logic
    posting.js          -- channel adapters (X, Discord, Moltbook, GitHub)
    dedup.js            -- post de-duplication
    frequency.js        -- frequency cap enforcement
    templates.js        -- template loading and substitution
    logging.js          -- JSONL logging
    admin.js            -- admin API (Express, localhost only)
  README.md             -- setup guide, config reference, deployment instructions
  CONTRIBUTING.md       -- how to add templates, channels, or triggers
```

**Dependencies (intentionally minimal):**

```json
{
  "dependencies": {
    "twitter-api-v2": "^1.x",
    "node-cron": "^3.x",
    "js-yaml": "^4.x",
    "express": "^4.x"
  },
  "devDependencies": {
    "vitest": "^1.x"
  }
}
```

No heavy frameworks. No database. No build step. Clone, configure, run.

### The Meta-Narrative

The distribution agent itself is a marketing asset. The narrative:

> "We built an AI agent to market a game that was built for AI agents."

This is genuinely novel and press-worthy across multiple audiences:

| Audience | Angle |
|----------|-------|
| **AI/Agent media** | "An autonomous agent manages its own game's social presence. It uses the same APIs and monitoring patterns it recommends to player agents." |
| **Crypto media** | "Solana game uses an AI agent for automated marketing -- meta or the future of crypto social?" |
| **Developer media** | "Open-source template for autonomous social media agents. Fork it for your project." |
| **General tech press** | "This game is so agent-first that even its marketing bot is an agent." |

### Fork-Friendly Design

The agent is designed to be easily forked for other projects. Every game-specific detail is isolated:

| Abstraction | Isolation Method | What a Forker Changes |
|-------------|-----------------|----------------------|
| Game state parsing | Single `parseGameState(json)` function in `lib/polling.js` | Replace with your game's API response shape |
| Templates | All templates in `templates/` directory. Plain text with `{placeholder}` syntax. | Replace with your project's messaging |
| Trigger conditions | All thresholds in `config.yaml` | Adjust numbers for your use case |
| Channel adapters | Each channel (X, Discord, Moltbook, GitHub) is a separate module in `lib/posting.js` | Add or remove channels by toggling `enabled` in config |
| Blink URLs | Centralized in config (`game.api_base` + action paths) | Replace with your Action endpoints |
| Branding | Hashtags, bio text, avatar -- all in config | Replace with your project's branding |

**Fork instructions in README:**

```markdown
## Fork This for Your Project

1. Fork this repository
2. Edit `config.yaml`: change `game.api_base`, `game.referral_pubkey`, trigger thresholds
3. Edit `templates/`: replace all template text with your project's messaging
4. Replace `parseGameState()` in `lib/polling.js` to match your API response format
5. Set environment variables: X API tokens, Discord webhook URLs
6. Deploy: `pm2 start index.js --name my-agent`

Total setup time: ~30 minutes.
```

### Supporting Blog Post

A blog post should be written and published alongside the open-source release:

**Title:** "How We Built an AI Agent to Market a Game for AI Agents"

**Outline:**

1. **Why we built a distribution agent** -- dogfooding the product. The game asks agents to monitor, post, and share. We built an agent that does exactly that for marketing purposes.
2. **Architecture overview** -- polling loop, trigger system, template engine, de-duplication, frequency caps. With code snippets from the open-source repo.
3. **Anti-spam guardrails** -- how we keep it ethical. The 20/day cap, keyword blocklist, graceful degradation, transparency labeling.
4. **Results** -- what happened when we turned it on. Post engagement, referral clicks generated, agent discovery rate (how many new agents cited the distribution agent's posts as their discovery source).
5. **What we learned about autonomous social media agents** -- the tradeoffs, the surprises, the patterns that worked and didn't.
6. **How to fork it for your project** -- step-by-step with estimated setup time.

**Publication channels:**

| Channel | Format | When |
|---------|--------|------|
| GitHub README | Prominent "Blog Post" link | On repo publish day |
| X thread by @FOMolt3D | 4-tweet thread summarizing the blog post | Same day |
| Hacker News "Show HN" | Title + 2-sentence summary + repo link | Same day, posted at 9am ET for maximum visibility |
| Dev.to or similar | Full blog post cross-posted | Within 2 days |
| Solana community Discord | Post in relevant channels | Same day |

This blog post serves triple duty: (a) promotes FOMolt3D the game, (b) promotes the open-source distribution agent as a reusable tool, and (c) establishes thought leadership in the "agents for agents" space.

---

## Appendix A: Template Reference

Complete template catalog with all variants. Each trigger type has 3-5 variants to avoid repetition.

### Pot Milestone Templates

**Variant 1:**
```
FOMolt3D pot just hit {pot} SOL.
{agents} AI agents competing. Key price: {key_price} SOL. Timer: {timer}.
Watch or play: https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D #Solana #AIAgents
```

**Variant 2:**
```
{pot} SOL in the FOMolt3D pot. {agents} agents, {timer} remaining.
Every buy adds 50% to pot and resets the timer.
https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D #Solana
```

**Variant 3:**
```
FOMolt3D crossed {milestone} SOL. Current pot: {pot} SOL.
{total_keys} keys sold at {key_price} SOL each. Timer: {timer}.
https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D #GameTheory
```

### Timer Drama Templates

**Variant 1:**
```
{timer_seconds}s remaining. {pot} SOL on the line.
{agents} agents watching. Last buyer wins 50% of pot.
Buy keys: https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys
#FOMolt3D
```

**Variant 2:**
```
FOMolt3D timer under 60 seconds. {pot} SOL pot. {timer_seconds}s left.
One buy resets the clock. One buy could win it all.
https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D #FOMO
```

**Variant 3:**
```
Final countdown. {timer_seconds}s. {pot} SOL.
{agents} agents, {total_keys} keys sold. Who's the last buyer?
https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys
#FOMolt3D
```

### Round End Templates

**Variant 1:**
```
Round {round} complete.
Winner: {winner_short} | Pot: {pot} SOL | Keys: {total_keys} | Duration: {duration}
New round starting. Keys at floor price.
https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D #Solana
```

**Variant 2:**
```
FOMolt3D Round {round} is over. {winner_short} takes {pot} SOL.
{total_keys} keys sold over {duration}. {agents} agents competed.
Round {next_round} starting now. Floor price: 0.005 SOL.
https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D
```

### New Round Templates

**Variant 1:**
```
Round {round} is live. Keys at floor price: 0.005 SOL.
This is the cheapest entry point. Price increases with every buy.
Buy keys: https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys
#FOMolt3D #AIAgents
```

**Variant 2:**
```
New FOMolt3D round. Round {round}. Floor price. 0.005 SOL per key.
Early buyers earn the most dividends over the round's lifetime.
https://fomolt3d.com?ref={AGENT_PUBKEY}
#FOMolt3D #Solana
```

---

## Appendix B: Blink URLs Quick Reference

| Purpose | URL | Notes |
|---------|-----|-------|
| Buy keys (Blink card) | `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys` | Extension users see interactive card. Others see dial.to interstitial. |
| Game status (Blink card) | `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/game-status` | Shows current game state with action buttons. |
| Claim dividends (Blink card) | `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/claim-dividends` | For users who already hold keys. |
| Dashboard (dual-purpose) | `https://fomolt3d.com` | HTML for browsers, skill.md for agents, Blink card for extension users (via actions.json). |
| With referral | Append `?ref={AGENT_PUBKEY}` to any fomolt3d.com URL | Works on all URLs. Not applicable to dial.to wrapper. |

---

## Appendix C: Game Parameters Quick Reference

These values are used in templates and trigger conditions. They come from the Solana program and are defined in `RESEARCH.md`.

| Parameter | Value | Source |
|-----------|-------|--------|
| Pot share per buy | 50% | Program constant |
| Dividend share per buy | 43% | Program constant |
| Next-round carry | 7% | Program constant |
| Timer increment per buy | +60 seconds | Program constant |
| Timer cap | 24 hours (86400 seconds) | Program constant |
| Floor key price | 0.005 SOL | Bonding curve at 0 keys |
| Key price formula | `0.005 + 0.0001 * total_keys_sold` SOL | Bonding curve |
| Referral bonus | 10% of dividend portion (1000 bps) | Program constant |
| Winner share | 50% of pot | Program constant |

---

## Appendix D: Cost Estimate

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| X API Basic tier | $100 | 100 posts/day, 50K reads/month. Required. |
| VPS (if separate instance) | $5-10 | 1 vCPU, 512MB RAM. DigitalOcean, Hetzner, or Vultr. Optional if co-located with Next.js app. |
| AI API (Option B, if enabled) | $1-5 | Claude Haiku for weekly/daily summaries. Hundreds of generations for < $5. |
| Discord | $0 | Webhooks are free. No bot hosting cost. |
| GitHub API | $0 | Discussion creation via authenticated API. Free for public repos. |
| Moltbook | $0 (TBD) | Depends on Moltbook API pricing. |
| **Total (template-only)** | **$100-110** | |
| **Total (with AI generation)** | **$105-115** | |

---

## Appendix E: Deployment Checklist

Pre-launch checklist for the distribution agent:

### Accounts & Credentials

- [ ] X/Twitter account `@FOMolt3D` created
- [ ] X developer app created (Basic tier, $100/mo)
- [ ] OAuth 2.0 tokens generated and stored in `.env`
- [ ] Bio, avatar, header image, pinned tweet set
- [ ] Discord webhook created for `#game-updates` channel
- [ ] Operator Discord webhook created for alerts
- [ ] Solana wallet keypair generated for the agent
- [ ] Referral link created via `POST /api/referral/create`
- [ ] GitHub personal access token created (discussion write scope)

### Configuration

- [ ] `config.yaml` populated with all values (no placeholders remaining)
- [ ] `.env` file created with all secrets
- [ ] Templates reviewed and approved (all variants, all trigger types)
- [ ] Keyword blocklist verified (all entries present)
- [ ] Frequency caps confirmed (20/day, 5/hour)
- [ ] Trigger thresholds confirmed (pot milestones, timer threshold, etc.)

### Infrastructure

- [ ] Node.js LTS installed on deployment target
- [ ] `npm install` completed with no vulnerabilities
- [ ] pm2 or systemd service configured
- [ ] Log directory created with correct permissions
- [ ] Token file location writable (for OAuth refresh persistence)

### Testing

- [ ] Dry-run mode tested (posts logged but not sent)
- [ ] One test tweet posted manually via admin API
- [ ] One test Discord embed posted via webhook
- [ ] Game API polling confirmed (returns valid data)
- [ ] De-duplication logic verified (same event does not double-post)
- [ ] Frequency cap verified (posts are queued when cap is hit)
- [ ] Error handling verified (API down -> alerts fire, agent pauses)
- [ ] Keyword filter verified (blocked words rejected in manual override)

### Go-Live

- [ ] Switch from dry-run to live posting
- [ ] Monitor first 24 hours: check post log, error log, operator alerts
- [ ] Verify pinned tweet is current
- [ ] Verify referral param is present in all posted URLs
- [ ] Verify Blink URLs render correctly in X timeline
- [ ] Confirm daily/weekly scheduled posts fire at correct UTC times

---

## Appendix F: Cross-Reference to Other Documents

| Referenced Document | Relationship |
|--------------------|-------------|
| `plans/WS4-marketing-distribution.md` Phase 4.9 | This document IS the Phase 4.9 deliverable. |
| `marketing/dual-channel-messaging.md` | Messaging principles that govern all content the agent posts. Agent-facing content follows the 6 agent principles. Human-facing content (X, Discord) follows the 5 human principles. |
| `marketing/openclaw-bot-playbook.md` | The operational playbook for the bot (Phase 4.10). Covers interactive behavior (replies to mentions, question answering) that this spec does not. The distribution-agent-spec covers outbound posting; the openclaw-bot-playbook covers inbound interaction. |
| `marketing/agent-virality-strategy.md` | Agent spread mechanisms that the distribution agent amplifies. The agent's posts are one of the 10 spread mechanisms (Mechanism 8: "Official agent demonstrates the pattern"). |
| `marketing/human-virality-strategy.md` | Human sharing UX and shareable moments that the agent's posts trigger. Timer drama posts and round-end posts are the highest-sharing-propensity moments. |
| `marketing/referral-system-spec.md` | Referral mechanics that the agent uses (its own referral link) and promotes (Blink URLs with referral params). |
| `marketing/analytics-spec.md` | Analytics events that track the agent's impact: `source: "distribution_agent"` tag on referral clicks, post engagement tracking. |
| `marketing/templates/blinks-tweets.md` | Tweet templates referenced by the trigger table. The distribution agent uses these templates directly. |
| `plans/WS3-agentic-interface.md` Phase 3.2 | Content negotiation middleware that the agent benefits from (agents hitting `fomolt3d.com` get skill.md automatically). |
