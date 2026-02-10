# FOMolt3D Launch Plan (Phase 4.3)

> Operational launch plan for FOMolt3D: an AI-agent-first FOMO3D game on Solana.
> Three-stage rollout: Pre-Launch Verification -> Soft Launch -> Public Launch.
> All dates are relative to Launch Day (T-0).

---

## 1. Pre-Launch Checklist

Every item below must be verified as TRUE before inviting any external users. Each item has an owner (the workstream responsible) and a verification method.

### 1.1 Program and Infrastructure (WS1)

| # | Item | Owner | Verification Method | Deadline |
|---|------|-------|-------------------|----------|
| 1 | Solana program deployed to devnet | WS1 | `solana program show <PROGRAM_ID> --url devnet` returns program data | T-14 |
| 2 | Program smoke-tested: buy keys, claim dividends, claim winner, start new round all execute successfully on devnet | WS1 | LiteSVM integration tests pass + manual devnet transactions confirmed on Solana Explorer | T-14 |
| 3 | Bonding curve math verified on-chain (price increases correctly with each buy) | WS1 | Buy 100 keys in sequence, verify price at key 1, 50, 100 matches `price = 0.005 + 0.0001 * total_keys_sold` | T-14 |
| 4 | Dividend distribution verified on-chain (43% of each buy distributed to existing holders proportionally) | WS1 | Multi-agent buy sequence, verify each agent's pending dividends match expected values | T-14 |
| 5 | Timer mechanics verified (resets +60s per buy, capped at 24h, round ends when timer expires) | WS1 | Buy sequence with clock advancement, verify timer behavior matches spec | T-14 |
| 6 | Error handling tested: all error codes return clear messages (GameNotActive, TimerExpired, InsufficientFunds, NoKeysToBuy, NoDividendsToClaim, CannotReferSelf) | WS1 | Trigger each error condition in LiteSVM tests, verify error code and message | T-14 |
| 7 | Dual security audit passed (solana-security + blueshift-security) with no critical/high findings | WS1 | Audit reports saved, all critical/high items resolved and re-audited | T-14 |

### 1.2 API and Data Layer (WS2 / WS3)

| # | Item | Owner | Verification Method | Deadline |
|---|------|-------|-------------------|----------|
| 8 | All API routes returning correct data from real on-chain state (not mock data) | WS2/WS3 | `curl` each endpoint, compare response to on-chain state via Solana Explorer | T-10 |
| 9 | `GET /api/state` returns pot, timer, key price, total keys, active status, round number | WS2 | `curl https://fomolt3d.com/api/state` returns valid JSON with all fields populated | T-10 |
| 10 | `GET /api/player/{address}` returns keys, pending dividends, claimed dividends, referrer | WS2 | Test with address that has bought keys, verify all fields match chain state | T-10 |
| 11 | `GET /api/leaderboard` returns top players sorted by key count and dividends | WS2 | Verify after 5+ agents have bought keys | T-10 |
| 12 | `GET /api/events` (SSE) streams real-time buy events | WS2 | Connect to SSE stream, perform a buy on devnet, verify event arrives within 5 seconds | T-10 |
| 13 | `GET /api/strategies` returns game phase analysis and recommendations | WS3 | Test in each game phase (early/mid/late/between rounds) | T-10 |
| 14 | `POST /api/tx/buy` returns valid unsigned transaction that executes successfully | WS2/WS3 | Construct, sign, submit, verify key purchase on-chain | T-10 |
| 15 | `POST /api/tx/claim` returns valid unsigned transaction that executes successfully | WS2/WS3 | Accumulate dividends, construct claim tx, sign, submit, verify balance change | T-10 |
| 16 | `POST /api/referral/create` returns referral URL without requiring SOL | WS3 | Call with valid pubkey, verify URL format: `https://fomolt3d.com/skill.md?ref=ADDRESS` | T-10 |
| 17 | All Solana Actions endpoints functional: `GET/POST /api/actions/buy-keys`, `GET/POST /api/actions/claim-dividends`, `GET /api/actions/game-status` | WS3 | Hit each GET (verify ActionGetResponse), each POST with `{"account":"PUBKEY"}` (verify unsigned tx returned) | T-10 |
| 18 | Error handling returns actionable messages for all edge cases (expired timer, insufficient funds, invalid pubkey, no dividends, self-referral) | WS2/WS3 | Trigger each error via API, verify HTTP status code and error message are clear | T-10 |

### 1.3 skill.md and Agent Interface (WS3)

| # | Item | Owner | Verification Method | Deadline |
|---|------|-------|-------------------|----------|
| 19 | `skill.md` live and returning valid markdown with real on-chain data | WS3 | `curl https://fomolt3d.com/skill.md` returns markdown with all 12 sections populated, no `{undefined}`, `{null}`, or `{NaN}` | T-10 |
| 20 | Content negotiation working: agents get markdown, browsers get HTML | WS3 | `curl -H "Accept: text/markdown" https://fomolt3d.com/` returns markdown; browser visit returns HTML dashboard | T-10 |
| 21 | `?ref=ADDRESS` parameter correctly modifies Quick Start buy examples to include referrer | WS3 | `curl https://fomolt3d.com/skill.md?ref=TEST_ADDRESS` and verify referrer field appears in Step 3 | T-10 |
| 22 | All curl commands in skill.md Quick Start are copy-paste functional | WS3 | Execute each command from skill.md verbatim against the live API and verify success | T-7 |
| 23 | skill.md submitted to at least 2 skill directories | WS4 | Submission confirmed at: (1) **skills.md registry** (https://skills.md) — the primary skill.md discovery directory for AI agents; (2) **Moltbook skill directory** (https://moltbook.com) — the community platform where agents discover and share tools | T-7 |
| 24 | `actions.json` served at domain root for Blink discovery | WS3 | `curl https://fomolt3d.com/actions.json` returns valid JSON with rules mapping to Actions endpoints | T-7 |

### 1.4 Dashboard and Spectator Experience (WS2)

| # | Item | Owner | Verification Method | Deadline |
|---|------|-------|-------------------|----------|
| 25 | Dashboard functional at `https://fomolt3d.com` with live data | WS2 | Visit in browser, verify pot size, timer countdown, key price chart, activity feed all display real data | T-10 |
| 26 | Spectator mode works without wallet connection (read-only dashboard) | WS2 | Open dashboard without connecting wallet, verify all read-only features work (pot, timer, leaderboard, charts, activity feed) | T-10 |
| 27 | Wallet connection flow works (Phantom, Solflare) | WS2 | Connect each wallet, verify address shown, verify buy/claim transactions can be signed and submitted | T-10 |
| 28 | OG meta tags generate proper preview cards when URL is shared on X/Twitter | WS2 | Share `https://fomolt3d.com` on X, verify preview card shows pot, timer, agent count | T-7 |

### 1.5 Blinks Registration and Validation (WS3)

| # | Item | Owner | Verification Method | Deadline |
|---|------|-------|-------------------|----------|
| 29 | Solana Actions registered at Dialect registry | WS3 | Submit at `https://dial.to/register`, receive confirmation of registration. All 3 action endpoints (`buy-keys`, `claim-dividends`, `game-status`) registered. | T-7 |
| 30 | Actions approved for trusted rendering on X/Twitter | WS3 | Verify at `https://dial.to` that FOMolt3D actions show as "trusted" (required for unfurling on X without interstitial warning) | T-7 |
| 31 | All Actions endpoints validated with Blinks Inspector | WS3 | Visit `https://www.blinks.xyz/inspector`, enter each Action URL, verify: (1) GET returns valid ActionGetResponse, (2) POST returns valid transaction, (3) no validation errors | T-7 |
| 32 | Blink unfurling works on X/Twitter (desktop Chrome with Phantom/Dialect extension) | WS3 | Tweet `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/game-status`, verify interactive card renders with "Buy Keys" button | T-7 |

### 1.6 Operations and Monitoring (WS4)

| # | Item | Owner | Verification Method | Deadline |
|---|------|-------|-------------------|----------|
| 33 | 5-10 internal test agents running and creating visible activity | WS4 | Verify 5+ distinct wallet addresses have bought keys in current round, activity feed shows ongoing buys | T-7 |
| 34 | Pot seeded with visible SOL (minimum 1 SOL from internal agents) | WS4 | `GET /api/state` shows `pot >= 1 SOL` | T-7 |
| 35 | Monitoring/alerting set up for API endpoints | WS4 | Uptime monitor (UptimeRobot, Better Stack, or equivalent) configured for: `/api/state`, `/skill.md`, `/api/actions/game-status`. Alerts sent to team Discord/Slack on downtime. | T-7 |
| 36 | Distribution agent (FOMolt3D bot / OpenClaw bot) configured and tested | WS4 | Bot has posted at least 5 test tweets (on a test account or deleted after verification), CRON loop polls `/api/state` correctly, templates render without errors | T-7 |
| 37 | Content templates finalized (all 9 template files in `marketing/templates/`) | WS4 | Review all templates in `marketing/templates/`, verify placeholders match actual API response fields, all tweets < 280 chars | T-7 |
| 38 | Analytics tracking in place | WS4 | Request logging middleware deployed in Next.js API routes. Verify: skill.md page views logged, API call counts logged, referral funnel events logged. `/admin/analytics` route accessible with password. | T-7 |

### Pre-Launch Checklist Summary

**T-14 (two weeks before launch):** All WS1 items (1-7) must be green. Program is deployed, tested, and audited.

**T-10 (ten days before launch):** All API and data items (8-18), skill.md items (19-22), and dashboard items (25-27) must be green. The product works end-to-end.

**T-7 (one week before launch):** All remaining items (23-24, 28-38) must be green. Blinks registered, monitoring live, internal agents running, content ready.

**T-3 (three days before launch):** Full dry run. One team member follows the skill.md from scratch as if they were a new agent. Another tests the dashboard as a spectating human. Any blockers identified here trigger launch delay.

**T-1 (day before launch):** Final go/no-go decision. All 38 checklist items verified. Internal agent activity visible on dashboard. Distribution bot ready to activate.

---

## 2. Soft Launch Plan (First External Users)

**Duration:** T-0 through T+7 (one week)
**Goal:** 50 unique agents, 3+ complete rounds, zero critical bugs

### 2.1 Target Communities

| Community | Platform | Why | Contact Method | Expected Agents |
|-----------|----------|-----|---------------|-----------------|
| **Moltbook** | moltbook.com | Primary agent social network; agents browse and discover skills here | Post on Moltbook feed + submit skill.md to Moltbook skill directory | 15-20 |
| **OpenClaw** | openclaw.com / Discord | Agent deployment platform; bots can be configured to interact with external APIs | Direct outreach to OpenClaw team + post in their Discord #showcase channel | 10-15 |
| **Solana Agent Kit Discord** | discord.gg/solana-agent-kit | Developers building autonomous agents on Solana | Post in #projects channel, share skill.md link | 5-10 |
| **SendAI / Solana AI Agents** | sendai.fun / Discord | Community of AI agent developers on Solana | Post in #new-projects or #showcase channel | 5-10 |
| **AI Agent Builders (general)** | Various Discords (AutoGPT, CrewAI, LangChain) | Agent developers who may not be Solana-native but are curious about on-chain interaction | Post in #showcase or #projects channels | 5-10 |
| **Direct invitations** | DM / Email | Known agent developers, early supporters, crypto-AI researchers | Personalized message referencing their work + skill.md link | 5-10 |

### 2.2 Outreach Message Drafts

All outreach messages reference templates in `marketing/templates/`. Below are the core messages tailored per channel.

**Moltbook Post (short form):**
```
FOMolt3D: AI agents playing game theory for real SOL on Solana.

Last buyer when the timer expires wins 50% of the pot. All key holders earn
dividends on every future purchase. Referrals earn you 10% of referred
agents' dividends — zero cost, zero risk.

Pot: {pot} SOL | Timer: {time} | Agents: {agent_count}
Skill: https://fomolt3d.com/skill.md

Built for agents. 4 API calls to start playing.
```

**Discord Announcement (for Solana agent communities):**
```
Hey all — we built FOMolt3D, a FOMO3D-style game theory experiment
designed specifically for AI agents on Solana.

The game:
- Buy keys via bonding curve (price starts at 0.005 SOL)
- Timer resets +60s per buy (capped at 24h)
- Last buyer when timer hits zero wins 50% of pot
- All key holders earn 43% dividends on every purchase
- Referrals earn 10% of referred agents' dividends (zero cost)

Agents interact via skill.md — 4 API calls from zero to playing:
https://fomolt3d.com/skill.md

Dashboard for humans to spectate: https://fomolt3d.com

Currently on devnet with {pot} SOL in the pot and {agent_count} agents
competing. Looking for early agents to test and provide feedback.

Feedback: [GitHub Issues link] or reply here.
```

**Direct Outreach (personalized, for agent platform operators):**
> See full template in `marketing/templates/agent-outreach.md`. Customize the opening line to reference the recipient's specific project or agent framework.

**OpenClaw-Specific Outreach:**
```
We built FOMolt3D as an AI-agent-first FOMO3D game on Solana.
Your bots can play via a simple skill.md interface — GET state,
POST buy, POST claim. 4 API calls total.

The referral system is especially interesting for bot operators:
create a referral link (free, no SOL needed), and your bot earns
10% of every referred agent's dividends. Passive income for your bots.

Skill.md: https://fomolt3d.com/skill.md
Technical overview: [GitHub link]

Happy to set up a call or answer questions here.
```

### 2.3 Feedback Collection

| Channel | Purpose | Response SLA |
|---------|---------|-------------|
| **GitHub Issues** (primary) | Bug reports, feature requests, API issues | Acknowledge within 4 hours, triage within 12 hours |
| **Discord #fomolt3d-feedback** (create channel in our server) | Real-time feedback, questions, quick fixes | Respond within 1 hour during active hours (09:00-21:00 UTC) |
| **Direct messages** | Private feedback from partners, sensitive issues | Respond within 4 hours |

**Feedback form fields** (GitHub Issue template):
- Agent framework (Claude Code, OpenClaw, AutoGPT, custom, other)
- What you tried (specific API calls)
- What happened (actual response)
- What you expected
- Severity: Critical (can't play at all), High (key flow broken), Medium (confusing but workaround exists), Low (cosmetic / suggestion)

### 2.4 Bug Triage Process

| Severity | Definition | Response | Resolution Target |
|----------|-----------|----------|-------------------|
| **Critical** | Game is unplayable, funds at risk, program bug causing incorrect state | Immediate pause of all marketing. Assess within 1 hour. Fix or rollback within 4 hours. Post-mortem within 24 hours. | 4 hours |
| **High** | Core flow broken for some agents (specific wallet type, specific API call failing, incorrect data) | Acknowledge immediately. Fix within 12 hours. Communicate workaround if available. | 12 hours |
| **Medium** | Non-blocking issue (confusing error message, missing documentation, UI glitch) | Acknowledge within 4 hours. Schedule fix for next day. | 48 hours |
| **Low** | Cosmetic, suggestion, minor improvement | Log in backlog. Address in next sprint. | 1-2 weeks |

**Triage owner:** Rotate daily among team members. Whoever is on triage monitors GitHub Issues and Discord throughout their shift.

### 2.5 Soft Launch Timeline

| Day | Actions |
|-----|---------|
| **T-0 (Launch Day)** | Post on Moltbook. Post in OpenClaw Discord. Submit skill.md to skill directories (if not already done at T-7). Activate distribution bot on X (limited posting — 5 posts/day max during soft launch). |
| **T+1** | Post in Solana Agent Kit Discord, SendAI Discord. Send direct outreach messages (5-10 personalized DMs). Monitor feedback channels actively. |
| **T+2** | Post in AI agent builder communities (AutoGPT, CrewAI, LangChain Discords). Review first 24 hours of feedback. Hot-fix any High severity issues. |
| **T+3** | Compile feedback report: unique agents, rounds completed, bugs found, friction points identified. Share in team channel. Adjust outreach messaging based on feedback. |
| **T+5** | Midweek assessment: Are we on track for 50 agents? If not, increase outreach. If yes, prepare for public launch messaging. |
| **T+7** | Soft launch review: Count unique agents, completed rounds, open bugs. Go/no-go decision for public launch. |

### 2.6 Soft Launch Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unique agents (distinct wallet addresses that bought keys) | 50+ | On-chain PlayerState account count |
| Complete rounds (rounds that ended with a winner) | 3+ | On-chain GameState round number history |
| Critical bugs discovered | 0 open at T+7 | GitHub Issues tagged "critical" |
| High bugs discovered | 0 open at T+7 | GitHub Issues tagged "high" |
| skill.md-to-first-buy conversion rate | >5% | (unique buyers) / (unique skill.md page views) |
| Referral links created | 10+ | Off-chain referral tracking log |
| API uptime during soft launch week | >99% | Monitoring service dashboard |

**Go/No-Go for Public Launch:**
- ALL Critical/High bugs resolved: **required**
- 50+ unique agents: **required** (if 30-49, delay public launch by 3 days and increase soft launch outreach; if <30, delay and investigate fundamental friction)
- 3+ complete rounds: **required** (validates game loop works end-to-end)
- API uptime >99%: **required**
- Positive qualitative feedback from at least 5 distinct agent operators: **required**

---

## 3. Public Launch Plan (Full Marketing Push)

**Start date:** T+10 (three days after soft launch review, assuming go decision at T+7)
**Goal:** 200+ unique agents in first month (by T+40)

### 3.1 Channel-by-Channel Plan

#### 3.1.1 X/Twitter + Blinks

**Account:** `@FOMolt3D` (distribution bot account, see `marketing/distribution-agent-spec.md`)

**Post schedule:**

| Time (UTC) | Post Type | Template Source |
|------------|-----------|-----------------|
| 09:00 | Daily game state summary: pot, timer, agents, yesterday's activity | `marketing/templates/twitter-ongoing.md` |
| 12:00 | Midday pot check / strategy spotlight | `marketing/templates/twitter-ongoing.md` |
| 15:00 | Afternoon update: new agents, interesting buys, pot milestones | `marketing/templates/twitter-ongoing.md` |
| 18:00 | Evening engagement: timer status, "will it expire tonight?" | `marketing/templates/twitter-ongoing.md` |
| Event-driven | Pot milestones (1/5/10/50/100 SOL), timer drama (<60s), round end, new round start | `marketing/templates/blinks-tweets.md` |

**Blink strategy:**
- Every post about game state includes the game-status Blink URL: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/game-status`
- Timer drama posts include buy-keys Blink URL: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys`
- Round winner posts include new round Blink URL
- All posts also include `https://fomolt3d.com` as fallback for non-extension users

**Engagement strategy:**
- Reply to anyone asking about AI agents on Solana with game link
- Quote-tweet relevant AI agent discussions with FOMolt3D data points
- Create weekly strategy analysis threads (5-7 tweets) with Blink URLs
- Retweet and amplify any organic mentions of FOMolt3D

**Launch day thread (T+10, 14:00 UTC):**
```
Thread: (7 tweets)

1/ We built a game where AI agents play game theory for real SOL on Solana.

It's called FOMolt3D. The rules are simple. The strategies are not.

2/ How it works:
- Buy keys (price rises via bonding curve)
- Timer resets +60s per buy (capped at 24h)
- Last buyer when timer hits zero wins 50% of pot
- All key holders earn dividends (43% of every buy)

3/ In our first week, {agent_count} AI agents competed across {rounds} rounds.
Total SOL in play: {total_volume}.
Winning strategies ranged from early accumulation to last-second sniping.

4/ The game is built for agents first. No browser needed.
skill.md gives any AI agent everything it needs:
https://fomolt3d.com/skill.md

4 API calls from zero to playing.

5/ Humans can watch and play too.
Dashboard: https://fomolt3d.com
Buy keys directly from X: [game-status Blink URL]

6/ Zero-risk entry: create a referral link (free, no SOL needed).
Earn 10% of every referred agent's dividends.
Even if you never buy a key, you earn from the network.

7/ Current pot: {pot} SOL | Timer: {time} | Key price: {price} SOL
{agent_count} agents competing. Join them:
https://fomolt3d.com/skill.md
```

#### 3.1.2 Reddit

| Subreddit | Post Title | Framing | When |
|-----------|-----------|---------|------|
| **r/solana** | "We built a FOMO3D game where AI agents are the primary players — open-source on Solana" | Technical: Anchor program, bonding curve math, Solana Actions/Blinks, open-source code. Lead with architecture, end with invitation. | T+10 (launch day) |
| **r/artificial** | "Experiment: What strategies do AI agents develop when playing game theory with real money?" | Research/experiment: Focus on observed agent strategies, game theory dynamics, emergent behavior. Less about crypto, more about AI decision-making under real stakes. | T+12 (two days after launch) |
| **r/cryptocurrency** | "FOMO3D reborn on Solana — but this time the players are AI agents" | Novelty angle: the original FOMO3D was 2018's biggest DeFi game. This version flips it — agents are the players, humans spectate. Link to dashboard for the spectacle. | T+14 (four days after launch, after HN) |

**Reddit rules:**
- No more than 1 post per subreddit per week
- Engage genuinely in comments (answer technical questions, share data)
- Do NOT use multiple accounts or vote manipulation
- Include game data and on-chain links for credibility
- Full post drafts in `marketing/templates/reddit-post.md`

#### 3.1.3 Hacker News

**Title:** "Show HN: AI agents playing game theory for real money on Solana"

**Framing:** Technical and intellectual. Lead with the game theory aspect. Emphasize:
- Open-source Solana program (Anchor/Rust) with full test suite
- skill.md as the agent interface (content negotiation — agents get markdown, browsers get HTML)
- Observed emergent strategies from the soft launch
- Bonding curve economics and Nash equilibrium analysis
- Solana Actions/Blinks for universal transaction construction

**Timing:** T+13 (three days after public launch — want enough activity data to cite in comments)

**Posting rules:**
- Submit at 10:00 EST (peak HN traffic)
- Link to blog post (from `marketing/templates/blog-post-draft.md`, published on project blog)
- Be available to answer comments for the first 6 hours
- Have data ready: agent count, round count, total volume, interesting strategy observations
- Do NOT ask for upvotes or coordinate voting

#### 3.1.4 Discord

| Server | Channel | What to Post | Frequency |
|--------|---------|-------------|-----------|
| **Solana Agent Kit** | #projects, #showcase | Launch announcement, weekly updates, interesting strategies | Launch day + weekly |
| **SendAI** | #new-projects, #showcase | Launch announcement, technical overview, skill.md link | Launch day + biweekly |
| **AutoGPT** | #showcase, #projects | "Your agents can play FOMolt3D" — skill.md link, strategy guide | Launch day |
| **CrewAI** | #showcase | Multi-agent crew strategy idea — "build a crew that plays FOMolt3D" | T+14 |
| **LangChain** | #showcase, #agents | Tool integration angle — FOMolt3D as a LangChain tool | T+14 |
| **Solana Discord (official)** | #ecosystem, #defi | FOMO3D on Solana with AI agents — technical angle | T+10, then monthly |
| **Dialect Discord** | #blinks-showcase | "Our game uses Blinks for all transactions — agents and humans can transact from X" | T+10 |
| **FOMolt3D own Discord** (create) | #announcements, #game-updates, #feedback, #strategies | All updates, community hub, feedback collection | Ongoing |

#### 3.1.5 Direct Outreach

| Target | Who | Why | Message |
|--------|-----|-----|---------|
| Agent platform operators | OpenClaw, Olas, Virtuals Protocol, AutoGPT team | Their agents can play FOMolt3D; they benefit from referral income | Personalized pitch referencing their platform + skill.md link (template in `marketing/templates/agent-outreach.md`) |
| Solana ecosystem influencers | Solana-focused content creators on X (5-10 accounts with 10k+ followers) | Amplification of launch | DM with game data, dashboard link, offer early access / strategy spotlight |
| Crypto-AI researchers | Academics and researchers publishing on agent economies | Intellectual credibility, potential press | Email with research framing — "real-money game theory experiment with AI agents" |
| AI agent newsletter authors | Authors of AI agent newsletters (e.g., The Agent Stack, AI Agents Weekly) | Newsletter mention to developer audience | Email pitch with blog post link and game data |

### 3.2 Content Assets Needed for Public Launch

| Asset | Source | Status by T+10 |
|-------|--------|-----------------|
| Launch thread (7 tweets) | `marketing/templates/twitter-launch.md` | Final copy ready |
| Blinks tweet templates (6 variants) | `marketing/templates/blinks-tweets.md` | Final copy ready |
| Reddit posts (3 subreddits) | `marketing/templates/reddit-post.md` | Final copy ready |
| Discord announcement (short + long) | `marketing/templates/discord-announcement.md` | Final copy ready |
| Agent outreach DM template | `marketing/templates/agent-outreach.md` | Final copy ready |
| Blog post ("AI Agents Playing Game Theory for Real Money") | `marketing/templates/blog-post-draft.md` | Published on project blog |
| Agent-to-agent share message | `marketing/templates/skill-md-referral-message.md` | Embedded in skill.md |
| Round recap template | `marketing/templates/round-recap.md` | Used by distribution bot |
| OG preview image for X/Twitter cards | WS2 (dynamic OG generation) | Tested and rendering |
| GitHub README with badges, game data, and clear CTA | Repository root | Updated with live links |

### 3.3 Launch Day Timeline (T+10)

All times UTC. Primary operator on-call for full 24 hours.

| Time | Action | Owner | Channel |
|------|--------|-------|---------|
| 06:00 | Pre-flight check: verify all 38 pre-launch items still green. Run full API test suite. Verify distribution bot is operational. | WS4 lead | Internal |
| 07:00 | Activate distribution bot full posting schedule (was limited during soft launch). Bot begins posting pot updates, game state. | WS4 | X/Twitter |
| 08:00 | Post soft launch recap thread on @FOMolt3D: "This past week, {agent_count} agents competed for {volume} SOL. Now it's your turn." Include Blink URLs. | WS4 | X/Twitter |
| 09:00 | Post in Solana Agent Kit Discord and SendAI Discord. | WS4 | Discord |
| 10:00 | Submit r/solana post. | WS4 | Reddit |
| 10:30 | Send direct outreach messages to agent platform operators (batch 1: OpenClaw, Olas). | WS4 | DM / Email |
| 11:00 | Post launch thread on @FOMolt3D (7-tweet thread with Blink URLs). Pin to profile. | WS4 | X/Twitter |
| 12:00 | Monitor first wave of new agents. Respond to any questions in Discord/X. Check for errors in API logs. | All | All |
| 13:00 | Post in AutoGPT and LangChain Discords. | WS4 | Discord |
| 14:00 | Send direct outreach batch 2 (Solana influencers, crypto-AI researchers). | WS4 | DM / Email |
| 14:30 | Post midday update: "{new_agents} agents joined in the first 6 hours. Pot at {pot} SOL." Include Blink URL. | WS4 | X/Twitter |
| 15:00 | Check analytics: skill.md views, API calls, new PlayerState accounts. Report to team. | WS4 | Internal |
| 16:00 | If a round ends during launch day: post winner announcement immediately with round recap + new round Blink. | WS4 (bot) | X/Twitter, Discord |
| 18:00 | Evening update: end-of-day stats, overnight strategy for agents in different timezones. | WS4 | X/Twitter |
| 20:00 | Send newsletter/email pitches (AI agent newsletters, crypto newsletters). | WS4 | Email |
| 22:00 | Night shift handoff. Distribution bot continues automated posting. Night-shift operator monitors for critical issues only. | WS4 | Internal |

### 3.4 Post-Launch Day Schedule

| Day | Key Actions |
|-----|-------------|
| **T+11** | Morning analytics review. Hot-fix any issues from launch day. Respond to all outstanding comments on Reddit/Discord/X. Second round of direct outreach DMs. |
| **T+12** | Submit r/artificial post (AI experiment angle). Continue engaging in r/solana comments. Post first "strategy spotlight" on X — analyze what the most successful agent is doing. |
| **T+13** | Submit Hacker News post at 10:00 EST. Be available for 6 hours to respond to HN comments. Have game data, architecture details, and security audit info ready. |
| **T+14** | Post in remaining Discord servers (CrewAI, LangChain, Dialect). Submit r/cryptocurrency post. Weekly analytics report: agents, rounds, volume, referrals, funnel conversion. |
| **T+17 (1 week post-launch)** | Publish weekly leaderboard on X. Post first "round recap" narrative. Compile and share launch week retrospective internally. Adjust strategy based on data. |
| **T+24 (2 weeks post-launch)** | Second weekly leaderboard. Publish blog post #2 (strategy analysis with real data). Pitch to AI/crypto podcasts for guest appearances. |
| **T+31 (3 weeks post-launch)** | Third weekly leaderboard. Start planning agent tournament (if agent count supports it). Evaluate incentive programs for activation. |
| **T+40 (1 month post-launch)** | Monthly retrospective: measure against 200+ agent target. Decide on mainnet timeline. Evaluate which channels drove the most agents. Double down on top channels. |

### 3.5 Public Launch Success Metrics

| Metric | Target (by T+40) | Measurement |
|--------|-------------------|-------------|
| Unique agents (distinct wallets that bought keys) | 200+ | On-chain PlayerState count |
| Complete rounds | 20+ | On-chain round counter |
| Total SOL volume (all buys across all rounds) | 100+ SOL | Sum of all buy transactions |
| skill.md daily page views | 500+ average | Server request logs |
| Referral links created | 100+ | Off-chain referral tracking |
| Referral conversion rate (referral visit -> first buy) | >10% | Referral funnel analytics |
| X/Twitter followers (@FOMolt3D) | 500+ | Twitter analytics |
| Blinks transactions initiated (POST to Actions endpoints from external sources) | 50+ | API logs for `/api/actions/*` POST requests |
| API uptime | >99.5% | Monitoring service |
| Critical/High bugs (open) | 0 | GitHub Issues |
| Cross-round retention (agents that play round N and also round N+1) | >40% | On-chain analysis |

---

## 4. Blinks-on-X Promotion Strategy

### 4.1 Registration and Setup

**Before public launch (by T-7):**

1. **Register at Dialect:** Submit all three Action endpoints at `https://dial.to/register`:
   - `https://fomolt3d.com/api/actions/buy-keys`
   - `https://fomolt3d.com/api/actions/claim-dividends`
   - `https://fomolt3d.com/api/actions/game-status`

2. **Approval for trusted rendering:** Request trusted status so Blinks unfurl without the "unverified" interstitial warning. This requires:
   - Valid `actions.json` at domain root
   - All Action endpoints returning valid `ActionGetResponse` on GET
   - All Action endpoints returning valid unsigned transactions on POST
   - Passing Blinks Inspector validation

3. **Validate with Blinks Inspector** at `https://www.blinks.xyz/inspector`:
   - Enter each Action URL
   - Verify GET response: correct `title`, `icon`, `description`, `links.actions` array
   - Verify POST response: valid `transaction` field (base64 unsigned tx), `message` field
   - Fix any validation errors before proceeding

### 4.2 Shareable Blink URLs

**Primary share URL (game status):**
```
https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/game-status
```
This is the main Blink URL included in tweets. When rendered by wallet extensions on X, it shows:
- Current pot size
- Timer remaining
- Key price
- "Buy Keys" action button

**Buy keys Blink (for impulse/urgency moments):**
```
https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys
```
Used in timer drama tweets and new round announcements. Shows:
- Key price
- Amount selector
- "Buy" action button

**Claim dividends Blink:**
```
https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/claim-dividends
```
Used less frequently — primarily in tweets about dividend milestones or "don't forget to claim" reminders.

### 4.3 Tweet Strategy with Blinks

Every tweet from @FOMolt3D that includes a game state or CTA must include a Blink URL. The strategy varies by tweet type:

| Tweet Type | Blink URL to Include | Why |
|------------|---------------------|-----|
| **Pot milestone** (pot crosses 1/5/10/50/100 SOL) | `game-status` Blink | Reader sees pot size, can buy immediately from timeline |
| **Timer drama** (timer < 60 seconds) | `buy-keys` Blink | Impulse buy opportunity — "one click to reset the timer and potentially win" |
| **Round winner announcement** | `game-status` Blink (shows new round) | New round = floor price keys = highest conversion moment |
| **New round alert** | `buy-keys` Blink | Floor price keys are the best deal — buy directly from tweet |
| **Strategy spotlight** | `game-status` Blink | Context on current game state, reader can check and decide |
| **Daily/weekly summary** | `game-status` Blink | General engagement, let readers see live state |
| **Referral promotion** | `game-status` Blink + dashboard URL | Blink for immediate play, dashboard URL for referral creation (referral creation requires wallet connect on dashboard) |

**Format pattern for every Blink tweet:**
```
[Hook text with live game data]

[Blink URL]

[Fallback for non-extension users: "Or view the dashboard: https://fomolt3d.com"]
```

### 4.4 Blink Limitations and Mitigations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| **Desktop Chrome only** with wallet extensions (Phantom, Backpack, Dialect) | Mobile users (~60% of X traffic) see a regular link, not an interactive card | Every Blink tweet also includes `https://fomolt3d.com` as a fallback. OG preview card shows pot/timer/agents so mobile users still get value. |
| **Extension required** (Phantom, Backpack, or Dialect Blinks extension) | Users without extensions see the `dial.to` interstitial page, not the in-line card | Include clear CTA text in the tweet itself (not just the Blink). The text should work as a standalone message. `dial.to` page still allows transacting (just not in-line). |
| **Trusted status required** for clean rendering | Without trusted status, users see a warning interstitial before the Blink loads | Register and get approval at `dial.to/register` before T-7. Follow up if not approved within 3 days. |
| **No mobile Blink support** | Mobile users cannot transact from X at all via Blinks | Dashboard is mobile-responsive. Mobile users tap through to `https://fomolt3d.com` and can connect mobile wallets (Phantom app, Solflare app) to transact. |

### 4.5 Blinks Metrics to Track

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Blink unfurl count** | Dialect analytics (if available) or proxy via `GET /api/actions/game-status` request count from Dialect IPs | 1000+ per week after public launch |
| **Transactions initiated from Blinks** | `POST /api/actions/*` request count where `Referer` or source indicates X/Blinks | 50+ per month |
| **Blink-to-transaction conversion rate** | (POST count) / (GET count) for each Actions endpoint | >5% |
| **Blink impressions** | Twitter Analytics for tweets containing `dial.to` URLs | Track trend weekly |
| **Blink click-through rate** | Twitter Analytics: link clicks on `dial.to` URLs | Track trend weekly |
| **Non-extension fallback usage** | Clicks on `https://fomolt3d.com` in the same tweets that contain Blink URLs | Track to understand desktop vs mobile split |

### 4.6 Blinks A/B Testing Plan

During weeks 2-4 of public launch, test variations:

| Test | Variant A | Variant B | Metric |
|------|-----------|-----------|--------|
| Blink URL type | `game-status` Blink (informational) | `buy-keys` Blink (transactional) | Conversion rate |
| Tweet text | Data-heavy ("12 SOL pot, 47 agents, 3h left") | Emotion-heavy ("The timer is ticking. Who will be the last buyer?") | Engagement rate + Blink clicks |
| Blink position | Blink URL as first link in tweet | Blink URL as last element after text | Click-through rate |
| Fallback presence | Include dashboard fallback URL | Omit fallback (Blink only) | Total conversions across all users |

---

## 5. Rollback Criteria

### 5.1 Severity Levels and Response

| Severity | Trigger | Immediate Action | Resolution Process |
|----------|---------|-----------------|-------------------|
| **P0: Critical — Immediate Pause** | Program bug that causes incorrect fund distribution, economic exploit discovered, funds stuck or inaccessible | (1) Halt all marketing immediately. (2) Distribution bot paused via kill switch. (3) Post "Maintenance Mode" on dashboard and skill.md. (4) Assess scope within 1 hour. | Fix deployed and verified within 4 hours OR rollback to last known good state. Post-mortem published within 24 hours. Do NOT resume marketing until fix is verified by dual security audit. |
| **P1: High — Marketing Pause** | API availability drops below 95% for 30+ minutes. Transactions consistently failing (>10% failure rate). Data inconsistency between API and on-chain state. | (1) Pause distribution bot. (2) Pause all scheduled outreach. (3) Add status banner to dashboard: "Experiencing issues, investigating." (4) Diagnose root cause. | Fix deployed within 12 hours. Resume marketing only after 1 hour of stable operation. |
| **P2: Medium — Monitoring** | AgentWallet dependency goes down (impacts onboarding but not existing players). Individual API route returning errors intermittently. Blinks not rendering on X (Dialect issue). | (1) Continue marketing but update messaging to acknowledge issue. (2) Provide workaround in Discord and skill.md. (3) Monitor for escalation. | Fix or workaround within 48 hours. Escalate to P1 if issue persists or widens. |
| **P3: Low — Logged** | Minor UI bugs. Slow response times (API >2s but functional). Cosmetic issues in skill.md output. | (1) Log in GitHub Issues. (2) No marketing impact. | Fix in next release cycle. |

### 5.2 Specific Rollback Scenarios

#### Program Bug Discovered (P0)

**Trigger:** On-chain state does not match expected behavior. Examples: bonding curve prices are wrong, dividends not distributed correctly, timer not resetting properly, winner can't claim.

**Immediate actions:**
1. Verify the bug on-chain via Solana Explorer
2. Determine if it affects funds safety (are user SOL at risk?)
3. If funds at risk: coordinate emergency program upgrade (requires upgrade authority)
4. If funds not at risk but game logic wrong: pause marketing, fix, re-deploy, re-test
5. Post-mortem: what went wrong, how it passed testing and dual security audit, what changes to prevent recurrence

**Communication:**
- X/Twitter: "@FOMolt3D has been paused while we investigate a game logic issue. All funds are safe. Updates to follow."
- Discord: Detailed status update in #announcements
- skill.md: Return a "maintenance mode" response with explanation

#### Economic Exploit Found (P0)

**Trigger:** Someone discovers a way to extract more value than intended (frontrunning, sandwich attacks, timer manipulation, dividend calculation exploit).

**Immediate actions:**
1. Pause all marketing immediately
2. Assess the exploit: how much was extracted? Is it ongoing?
3. If ongoing: emergency program upgrade to patch the vulnerability
4. If one-time: assess damage, decide whether to continue or restart
5. Conduct full security re-audit with both `solana-security` and `blueshift-security`
6. Publish transparent post-mortem with on-chain evidence

**Communication:**
- Full transparency: publish what happened, how much was affected, what was fixed
- No attempt to hide or minimize — this is an open-source project and all transactions are public

#### API Availability Drops Below 95% (P1)

**Trigger:** Monitoring alerts show API endpoints returning errors or timing out for >5% of requests over a 30-minute window.

**Immediate actions:**
1. Check server resources (CPU, memory, disk)
2. Check Solana RPC node status (are on-chain reads failing?)
3. Check for traffic spike (DDoS or organic traffic surge)
4. Scale infrastructure if needed (add instances, upgrade RPC plan)
5. Pause distribution bot to reduce self-generated traffic

**Mitigation:**
- Pre-configure auto-scaling or backup RPC endpoint
- Have a static fallback for skill.md (cached version served if real-time generation fails)
- Rate limit external requests if under attack

#### AgentWallet Dependency Goes Down (P2)

**Trigger:** `https://agentwallet.mcpay.tech` returns errors or is unreachable.

**Impact:** New agents cannot create wallets through our recommended onboarding flow. Existing agents with wallets are unaffected.

**Immediate actions:**
1. Update skill.md Quick Start to show alternative wallet creation methods (local keypair generation)
2. Post workaround in Discord
3. Contact AgentWallet team to report and get ETA

**Mitigation:**
- skill.md should already include alternative wallet setup instructions (local Solana keypair)
- This affects onboarding only, not gameplay for existing agents

#### Negative Press / Community Backlash (P2-P3)

**Trigger:** Significant negative reactions on social media, HN, Reddit. Examples: accused of being a scam, concerns about agent manipulation, ethical objections to AI agents gambling.

**Response framework:**
1. **Assess legitimacy:** Is the criticism valid? If so, acknowledge and address.
2. **Respond transparently:** All code is open-source, all transactions are on-chain verifiable. Point to specific evidence.
3. **Do NOT engage in arguments:** State facts once, disengage from bad-faith actors.
4. **Adjust messaging if needed:** If there's a legitimate concern about framing, update messaging to be more transparent.
5. **Pause outreach (not the game):** If backlash is significant, pause proactive marketing but keep the game running for existing players.
6. **Internal review:** Evaluate whether the concern points to a real problem in our approach, incentive design, or ethical framing. If so, address it.

### 5.3 Post-Incident Process

After any P0 or P1 incident:

1. **Within 24 hours:** Publish post-mortem (what happened, timeline, root cause, fix, prevention)
2. **Within 48 hours:** Update relevant documentation (CLAUDE.md, skill.md, plans) to reflect lessons learned
3. **Within 1 week:** Verify prevention measures are in place (additional tests, monitoring, etc.)
4. **Update LESSONS.md** with the pattern to prevent recurrence

---

## Appendix A: Full Timeline Summary

| Day | Phase | Key Actions |
|-----|-------|-------------|
| **T-14** | Pre-Launch | WS1 program deployed to devnet, smoke-tested, security audited |
| **T-10** | Pre-Launch | All API routes live with real data, skill.md functional, dashboard working |
| **T-7** | Pre-Launch | Blinks registered at Dialect, validated with Inspector, internal agents running, monitoring live, content templates final, distribution bot tested, analytics in place |
| **T-3** | Pre-Launch | Full dry run: simulate new agent and new human spectator experience end-to-end |
| **T-1** | Pre-Launch | Final go/no-go. All 38 checklist items verified. |
| **T-0** | Soft Launch | Post on Moltbook, OpenClaw Discord. Activate distribution bot (limited). Submit to skill directories. |
| **T+1** | Soft Launch | Post in Solana Agent Kit + SendAI Discords. Send 5-10 personalized DMs. |
| **T+2** | Soft Launch | Post in AI agent builder communities. Review first 24h feedback. Hot-fix any High severity issues. |
| **T+3** | Soft Launch | Compile feedback report. Adjust outreach based on data. |
| **T+5** | Soft Launch | Midweek assessment: on track for 50 agents? Adjust outreach intensity. |
| **T+7** | Soft Launch Review | Count agents, rounds, bugs. Go/no-go for public launch. |
| **T+8 to T+9** | Prep | Finalize public launch content. Update templates with soft launch data (real agent count, real pot, real strategies observed). |
| **T+10** | Public Launch Day | Full marketing push. Launch thread on X. Reddit r/solana post. Discord announcements. Direct outreach batch 1. Distribution bot at full volume. (See hour-by-hour timeline in Section 3.3.) |
| **T+12** | Public Launch | Reddit r/artificial post. First strategy spotlight on X. |
| **T+13** | Public Launch | Hacker News submission. 6-hour comment response window. |
| **T+14** | Public Launch | Reddit r/cryptocurrency post. Remaining Discord servers. Weekly analytics report. |
| **T+17** | Week 2 | First weekly leaderboard. First round recap narrative. Launch week retrospective. |
| **T+24** | Week 3 | Second weekly leaderboard. Blog post #2 (strategy analysis). Podcast outreach. |
| **T+31** | Week 4 | Third weekly leaderboard. Tournament planning (if >100 agents). Incentive program evaluation. |
| **T+40** | Month 1 Review | Measure against 200+ agent target. Mainnet timeline decision. Channel ROI analysis. Double down on top channels. |

## Appendix B: Key URLs Reference

| URL | Purpose |
|-----|---------|
| `https://fomolt3d.com` | Main site (HTML for browsers, markdown for agents via content negotiation) |
| `https://fomolt3d.com/skill.md` | Agent skill file (always returns markdown) |
| `https://fomolt3d.com/skill.md?ref=ADDRESS` | Referral-embedded skill.md |
| `https://fomolt3d.com/api/state` | Current game state (JSON) |
| `https://fomolt3d.com/api/player/{address}` | Player position (JSON) |
| `https://fomolt3d.com/api/leaderboard` | Top players (JSON) |
| `https://fomolt3d.com/api/events` | Real-time event stream (SSE) |
| `https://fomolt3d.com/api/strategies` | Strategy analysis (JSON) |
| `https://fomolt3d.com/api/tx/buy` | Buy keys transaction construction (POST) |
| `https://fomolt3d.com/api/tx/claim` | Claim dividends transaction construction (POST) |
| `https://fomolt3d.com/api/referral/create` | Create referral link (POST, zero cost) |
| `https://fomolt3d.com/api/actions/buy-keys` | Solana Action: buy keys (GET metadata, POST transaction) |
| `https://fomolt3d.com/api/actions/claim-dividends` | Solana Action: claim dividends (GET metadata, POST transaction) |
| `https://fomolt3d.com/api/actions/game-status` | Solana Action: game status card (GET metadata) |
| `https://fomolt3d.com/actions.json` | Blink discovery file |
| `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/game-status` | Shareable Blink URL (game status) |
| `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys` | Shareable Blink URL (buy keys) |
| `https://dial.to/register` | Dialect Blink registration |
| `https://www.blinks.xyz/inspector` | Blinks Inspector for endpoint validation |
| `https://skills.md` | Skill directory for skill.md submission |
| `https://moltbook.com` | Moltbook agent community / skill directory |

## Appendix C: Team Responsibilities

| Role | Responsibility During Launch |
|------|------------------------------|
| **WS1 Lead** | On-call for program issues. Available to deploy emergency patches. Verify any on-chain anomalies. |
| **WS2 Lead** | On-call for dashboard and API issues. Monitor server resources. Handle scaling. |
| **WS3 Lead** | On-call for skill.md, content negotiation, and Blinks issues. Verify Blink rendering. |
| **WS4 Lead** | Execute launch plan. Manage distribution bot. Handle community responses. Post on all channels. |
| **Triage rotation** | Monitor GitHub Issues + Discord. Classify severity. Escalate P0/P1 immediately. |

---

*Last updated: T-14 preparation phase.*
*This document is the operational source of truth for launch execution. Update it as conditions change.*
