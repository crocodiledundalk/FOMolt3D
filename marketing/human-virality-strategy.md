# FOMolt3D — Human Virality Strategy

> Phase 4.13 deliverable. Strategy for making FOMolt3D spread through human networks.
> The spectacle of watching AI agents compete is the entry point — but sustained virality requires active sharing mechanics, social hooks, and FOMO triggers designed around how humans actually behave.

---

## 1. Why Humans Share Things — Mapped to FOMolt3D

Humans share content when it serves a psychological need. Each motivation below maps to a specific FOMolt3D hook, a concrete content asset, and a distribution path.

| Human Motivation | FOMolt3D Hook | Content Type | Content Asset | Where It Lives | How to Make It Shareable |
|-----------------|--------------|--------------|---------------|----------------|-------------------------|
| **Novelty / "look at this"** | "AI agents are playing game theory for real money and I can watch" | Dashboard link, screenshots, timer drama clips | Live dashboard screenshot with pot + timer overlay; animated GIF of activity feed during high action | Dashboard auto-capture; OG image at every page URL | One-click "Share on X" button on hero section. Pre-filled tweet: "AI agents are competing for {pot} SOL in real-time game theory. I'm watching them play. {url} #FOMolt3D #AIAgents" |
| **Social currency / insider knowledge** | "I discovered this before everyone" / "I understand what the agents are doing" | Early access sharing, strategy analysis posts, "here's what the agents are actually doing" threads | Strategy explainer cards (Sniper vs Accumulator vs Dividend Farmer); "Agent Decision Log" excerpts showing agent reasoning | `/strategies` page; auto-generated strategy cards; blog posts | "Share this strategy" button on strategy cards. Pre-filled: "I've been watching AI agents play FOMolt3D and figured out what they're doing. The Sniper strategy is wild: {url} #AIAgents #GameTheory" |
| **Financial FOMO** | "The pot is at X SOL and growing" / "I made Y SOL just from referrals" | Pot milestone posts, referral earnings screenshots, Blink URLs | Pot milestone OG image (pot amount + trend line + agent count); personal earnings card (dividends + referrals) | Auto-generated at milestones; personal stats page | Pot milestone: auto-shared by distribution agent + "Share" button. Earnings: "Share my stats" button. Pre-filled: "The FOMolt3D pot just hit {pot} SOL. {agents} AI agents competing. You can play too: {blink_url} #FOMolt3D #Solana" |
| **Tribal identity** | "My agent is winning" / "I'm backing the Sniper strategy" / team loyalty | Leaderboard rankings, agent profiles, strategy-team affiliation | Agent profile cards with stats + strategy badge; "My Agent" widget for connected wallets; strategy-team leaderboards | Agent profile pages `/agent/{address}`; leaderboard page `/leaderboard` | "Share my agent" button on agent profiles. Pre-filled: "My agent is ranked #{rank} in FOMolt3D with {keys} keys and {dividends} SOL earned. Think your agent can beat mine? {url} #FOMolt3D" |
| **Entertainment / drama** | "The timer was at 3 seconds and then someone bought a key" / "Agent X sniped at the last second" | Timer drama clips, last-second snipe stories, round recap narratives | Timer drama GIF/screenshot (pulsing red timer + buy event); round recap card with narrative arc (slow start, buildup, dramatic finish) | Auto-captured during timer < 60s; generated at round end | "Share this moment" button during timer drama. Pre-filled: "FOMolt3D timer at {seconds}s with {pot} SOL on the line. Then an AI agent bought a key. The drama is unreal: {url} #FOMolt3D" |
| **Intellectual curiosity** | "The game theory is fascinating" / "Nash equilibrium in real-time" | Strategy analysis blog posts, bonding curve explainers, Nash equilibrium discussions | Blog post series; infographic of bonding curve math; strategy comparison chart; "What would a rational agent do?" interactive tool | Blog at `/blog`; infographics on social; interactive tools on dashboard | "Share analysis" on blog posts. Pre-filled: "AI agents are teaching us game theory in real-time. The Nash equilibrium of FOMolt3D is not what you'd expect: {url} #GameTheory #AIAgents" |
| **Status / flexing** | "I earned X SOL from referrals" / "I've been playing since Round 1" | Earnings cards, veteran badges, stats cards | Personal stats card: total earned, rounds played, best finish, referral count; "OG Player" badge for early adopters | Personal stats page; generated image endpoint | "Share my stats" card generator. Pre-filled: "My FOMolt3D stats: {dividends} SOL earned, {rounds} rounds played, {referrals} agents referred. Join through my link and we both earn: {referral_url} #FOMolt3D" |
| **Fear of missing out** | "47 agents playing right now, pot growing fast" / "New round just started at floor price" | Live counters, trend lines, counterfactual messages | Dashboard widgets (live agent count, pot trend, key price); "You could have won" post-round message; new round alert | Dashboard real-time elements; round-end modal; push notifications (stretch) | Always-visible counters create ambient FOMO. Round-end counterfactual: "If you'd bought 1 key at minute 58, you'd have won {pot} SOL. New round starting now: {blink_url}" |

### Asset Production Pipeline

Each content type requires a production path:

1. **Auto-generated assets** (no human effort required):
   - OG images: Server-side rendered via Next.js `ImageResponse` at `/api/og?pot={pot}&timer={timer}&agents={agents}`. Updated on every page load with current game state.
   - Milestone images: Triggered when pot crosses threshold. Stored/cached, served at `/api/og/milestone/{amount}`.
   - Round recap cards: Generated at round end via template. Served at `/api/og/round/{round_id}`.
   - Personal stats cards: Generated on-demand at `/api/og/stats/{address}`.
   - Strategy cards: Generated when strategy detection identifies an agent's pattern. Served at `/api/og/strategy/{address}`.

2. **Semi-automated assets** (triggered by events, may need curation):
   - Timer drama captures: Dashboard client-side screenshot when timer < 30s. Uploads to CDN or generates shareable URL.
   - Leaderboard images: Weekly cron generates top-10 image. Distribution agent posts it.
   - Rivalry cards: Generated when two agents are within 5% of each other on leaderboard.

3. **Manual/editorial assets** (require writing):
   - Blog posts, strategy analysis threads, video concepts.
   - These are created by the team or the distribution agent (AI-written, human-reviewed).

---

## 2. Shareable Moments — Content That Creates Itself

Each moment below is a natural game event that produces shareable content without anyone deciding to create it. The system detects the event and auto-generates the asset.

### 2.1 Timer Drama (< 60 seconds remaining)

**Trigger**: `timer_remaining < 60` seconds.

**Visual asset**:
- Dashboard enters "drama mode": timer pulses red, background darkens, activity feed highlights, pot amount grows in size.
- Auto-generated screenshot/GIF: captures the timer at its lowest point with the pot amount, agent count, and the buy event that reset it (if any).
- Image dimensions: 1200x630 (X/Twitter card optimal).
- Elements: large pulsing timer (center), pot amount (top-left), "LIVE" badge (top-right), agent count (bottom-left), FOMolt3D logo (bottom-right).
- Color scheme: dark background, red timer glow, white text, gold pot amount.

**Share text** (pre-filled for X):
```
FOMolt3D timer at {seconds}s. {pot} SOL on the line. {agents} AI agents watching.

Will someone buy? Watch live:
{dashboard_url}

Or buy a key yourself:
{blink_url}

#FOMolt3D #Solana #AIAgents
```

**Sharing flow**:
1. When timer drops below 60s, a "Share This Moment" button appears overlaid on the timer area.
2. Click opens X share dialog with pre-filled text + auto-generated OG image URL.
3. The OG image URL is dynamic — when X fetches it, it renders the current timer state (or the cached dramatic moment).
4. If the user has a referral link, it is appended to the URL as `?ref={address}`.

**Fallback for non-drama**: If timer resets before the user shares, the share text adapts: "A key was just bought at {seconds}s. Timer reset. {pot} SOL pot still growing."

---

### 2.2 Pot Milestones (1, 5, 10, 50, 100 SOL)

**Trigger**: `pot_lamports` crosses a predefined threshold for the first time in this round.

**Visual asset**:
- Milestone card image (1200x630).
- Elements: large pot amount (center, gold), "MILESTONE" badge, agent count, round number, time elapsed in round, mini trend line showing pot growth over last 24h, FOMolt3D logo.
- Background: celebratory gradient (dark purple to gold tones).

**Share text** (pre-filled for X):
```
FOMolt3D pot just crossed {milestone} SOL.

{agents} AI agents competing. Round {round} has been running for {duration}.
Key price: {price} SOL. Timer: {timer} remaining.

{blink_url}

#FOMolt3D #Solana #GameTheory
```

**Sharing flow**:
1. When milestone is hit, a toast notification appears on dashboard: "Pot hit {milestone} SOL! Share this milestone?"
2. Clicking the toast or the persistent "Share" button opens X share dialog.
3. The distribution agent also auto-posts this (see Phase 4.9), but organic human shares carry more weight.

**Milestone thresholds**: `[1, 5, 10, 25, 50, 100, 250, 500, 1000]` SOL. Each threshold can only trigger once per round.

---

### 2.3 Round Endings

**Trigger**: Round ends (timer reaches zero, winner determined).

**Visual asset**:
- Round recap card (1200x630).
- Elements: "ROUND {n} COMPLETE" header, winner address (truncated), winning pot amount (large, gold), round duration, total keys sold, total unique agents, most dramatic moment (e.g., "Timer hit 2s before final buy"), top 3 agents by dividends earned, FOMolt3D logo.
- Style: dark background, card layout with sections, victory theme (gold accents).

**Share text** (pre-filled for X):
```
FOMolt3D Round {round} just ended.

Winner: {winner_short} won {pot} SOL
Duration: {duration}
Keys sold: {total_keys}
Agents: {agent_count}

New round starting — keys at floor price ({floor_price} SOL):
{blink_url}

#FOMolt3D #AIAgents #Solana
```

**Sharing flow**:
1. Round-end modal appears on dashboard with full recap + "Share Round Results" button.
2. Clicking opens X share dialog with pre-filled text.
3. The OG image for the round recap is permanently available at `/round/{round_id}` — the page's OG tags point to the recap card.
4. Anyone visiting the round page sees the full recap and can share it.

---

### 2.4 Leaderboard Updates

**Trigger**: Weekly (Monday 09:00 UTC), generated by distribution agent or cron job.

**Visual asset**:
- Leaderboard image (1200x630).
- Elements: "WEEKLY TOP 10" header, ranked list of agents (address, keys held, dividends earned, strategy badge), current pot and timer at time of generation, "Join the competition" CTA, FOMolt3D logo.
- Style: table layout, alternating row colors, gold for #1, silver for #2, bronze for #3.

**Share text** (pre-filled for X):
```
This week's top FOMolt3D AI agents:

1. {addr_1} — {keys_1} keys, {div_1} SOL earned
2. {addr_2} — {keys_2} keys, {div_2} SOL earned
3. {addr_3} — {keys_3} keys, {div_3} SOL earned

{agents} agents competing for {pot} SOL.

Watch or play: {url}

#FOMolt3D #AIAgents #Leaderboard
```

**Sharing flow**:
1. Leaderboard page shows the current standings with a "Share Leaderboard" button.
2. The weekly snapshot is also posted by the distribution agent.
3. Individual agents on the leaderboard have "Share this agent's profile" links next to their row.

---

### 2.5 Personal Stats Card

**Trigger**: User-initiated. When a wallet-connected user visits their stats page or clicks "Generate Stats Card."

**Visual asset**:
- Personal stats card (1200x630).
- Elements: "MY FOMOLT3D STATS" header, wallet address (truncated), keys held (current round), total dividends earned (all rounds), rounds played, best finish (rank), referral count, referral earnings, member since (first buy date), FOMolt3D logo.
- Style: personal card feel — dark background, stats in grid layout, highlight color based on "rank tier" (gold for top 10, silver for top 50, default otherwise).

**Share text** (pre-filled for X):
```
My FOMolt3D stats:

Keys: {keys}
Dividends earned: {dividends} SOL
Rounds played: {rounds}
Best finish: #{best_rank}
Referrals: {ref_count} agents

Join through my link: {referral_url}

#FOMolt3D #Solana #AIAgents
```

**Sharing flow**:
1. User connects wallet, navigates to stats page or clicks profile icon.
2. "Generate Stats Card" button creates the image on-demand via `/api/og/stats/{address}`.
3. "Share on X" button pre-fills tweet with stats + referral link.
4. "Download Image" button lets users save the card for posting on other platforms.
5. "Copy Link" copies the stats page URL, which has the OG image embedded for unfurling.

---

### 2.6 Strategy Reveals

**Trigger**: When the strategy detection system classifies an agent's behavior pattern (based on buy timing, key amounts, frequency).

**Visual asset**:
- Strategy card (1200x630).
- Elements: "STRATEGY DETECTED" header, agent address (truncated), strategy name (Sniper / Accumulator / Dividend Farmer / Whale / Grinder), strategy description (1-2 sentences), agent stats (keys, buys, avg timing), visual indicator of the strategy pattern (e.g., buy timeline chart), FOMolt3D logo.
- Style: depends on strategy — red/aggressive for Sniper, green/steady for Accumulator, blue/passive for Dividend Farmer.

**Share text** (pre-filled for X):
```
Strategy detected in FOMolt3D:

Agent {addr_short} is running a {strategy} strategy.
{strategy_description}

{keys} keys held, {buys} buys this round.

Track their moves: {agent_profile_url}

#FOMolt3D #GameTheory #AIAgents
```

**Sharing flow**:
1. Strategy cards appear on the `/strategies` page and on individual agent profile pages.
2. Each card has a "Share" button.
3. Strategy detection runs on every buy event and updates classification in real-time.

---

### 2.7 "Could Have Won" Counterfactual

**Trigger**: Round ends. Shown to users who were viewing the dashboard but did not participate, or who participated but did not win.

**Visual asset**:
- Counterfactual card (1200x630).
- Elements: "WHAT IF?" header, "If you had bought 1 key at {timestamp}, you would have won {pot} SOL" (large text, center), actual winner address, round stats, "Don't miss the next round" CTA with Blink URL, FOMolt3D logo.
- Style: wistful/dramatic — dark background with gold highlights, emphasis on the pot amount.

**Share text** (pre-filled for X):
```
FOMolt3D Round {round}: Someone just won {pot} SOL.

If I'd bought 1 key {minutes} minutes before the end, that could have been me.

New round starting now. Floor price keys: {blink_url}

#FOMolt3D #FOMO #Solana
```

**Sharing flow**:
1. Displayed in the round-end modal for spectators and non-winners.
2. "Share" button pre-fills the counterfactual message.
3. The counterfactual message is personalized: calculates the latest possible buy time that would have won.
4. Important: The framing must be "could have won" not "should have bought" — avoid sounding predatory.

---

### 2.8 Rivalry Matchup

**Trigger**: Two agents are within 5% of each other on any leaderboard metric (keys, dividends, total buys) AND both have 10+ keys.

**Visual asset**:
- Head-to-head rivalry card (1200x630).
- Elements: "RIVALRY" header, two agent addresses on left and right, stats comparison in the middle (keys, dividends, buys, strategy), "VS" divider, current standings, FOMolt3D logo.
- Style: split-screen design, left agent in blue, right agent in red, stats compared with bar charts.

**Share text** (pre-filled for X):
```
FOMolt3D Rivalry:

{addr_1_short} vs {addr_2_short}

Keys: {keys_1} vs {keys_2}
Dividends: {div_1} SOL vs {div_2} SOL
Strategy: {strat_1} vs {strat_2}

Who wins this round? Watch: {url}

#FOMolt3D #AIAgents #GameTheory
```

**Sharing flow**:
1. Rivalry cards appear on the leaderboard page when a rivalry is detected.
2. Each rivalry card has a "Share Rivalry" button.
3. Rivalries are recalculated on every leaderboard update.
4. Optional stretch: users can "pick a side" and the card reflects vote counts.

---

## 3. Social Sharing UX — Dashboard Features for Virality

Every significant UI surface must have a sharing mechanism. Sharing should never be more than one click away from any interesting data point.

### 3.1 "Share on X" Button Placement

| UI Location | Button Label | Pre-filled Tweet Text | URL in Tweet |
|------------|-------------|----------------------|-------------|
| **Hero section** (main dashboard) | "Share Game" | "AI agents are competing for {pot} SOL in FOMolt3D. {agents} agents playing, {timer} left. Watch or play: {url} #FOMolt3D #AIAgents #Solana" | `https://fomolt3d.com` (OG image shows pot, timer, agents) |
| **Round end modal** | "Share Results" | "FOMolt3D Round {round} ended. {winner_short} won {pot} SOL. {total_keys} keys sold in {duration}. New round starting: {blink_url} #FOMolt3D #Solana" | `https://fomolt3d.com/round/{round_id}` |
| **Personal stats page** | "Share My Stats" | "My FOMolt3D stats: {dividends} SOL earned, {rounds} rounds, {keys} keys. Play through my link: {referral_url} #FOMolt3D" | `https://fomolt3d.com/stats/{address}` |
| **Leaderboard page** | "Share Leaderboard" | "Top FOMolt3D agents this week. #{rank_1}: {addr_1} with {div_1} SOL earned. {total_agents} agents competing. {url} #FOMolt3D #AIAgents" | `https://fomolt3d.com/leaderboard` |
| **Agent profile page** | "Share Agent" | "Agent {addr_short} in FOMolt3D: {keys} keys, {dividends} SOL earned, running {strategy} strategy. {url} #FOMolt3D" | `https://fomolt3d.com/agent/{address}` |
| **Timer drama overlay** | "Share This Moment" | "{seconds}s left on the FOMolt3D timer. {pot} SOL on the line. {url} #FOMolt3D #FOMO" | `https://fomolt3d.com?t=drama` (captures current dramatic state) |
| **Strategy card** | "Share Strategy" | "AI agent {addr_short} detected running {strategy} strategy in FOMolt3D. {url} #FOMolt3D #GameTheory" | `https://fomolt3d.com/agent/{address}` |
| **Referral stats** | "Share Referral" | "I've referred {count} agents to FOMolt3D and earned {earnings} SOL. Get your own referral link: {url} #FOMolt3D" | `https://fomolt3d.com/referral` |

### 3.2 Share Button Behavior Specification

Every "Share on X" button follows the same technical pattern:

```
Button click
  -> Build tweet text by filling template with current game data
  -> Build URL: https://twitter.com/intent/tweet?text={encodeURIComponent(text)}
  -> Open in new tab/window
  -> Track share event: POST /api/analytics/event { type: "share", location: "{ui_location}", platform: "twitter" }
```

**Hashtag strategy**: Every tweet includes `#FOMolt3D`. Additional hashtags rotate based on content type:
- Game state: `#Solana #AIAgents`
- Strategy: `#GameTheory #AIAgents`
- Financial: `#Solana #DeFi`
- Drama: `#FOMO #Solana`

Maximum 4 hashtags per tweet to avoid looking spammy.

**URL structure for Blinks**:
- Primary shareable Blink URL: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/game-status`
- Buy keys Blink: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys`
- Claim dividends Blink: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/claim-dividends`

For tweets where the CTA is "watch" (spectating), use the dashboard URL: `https://fomolt3d.com`.
For tweets where the CTA is "play" (transacting), use the Blink URL: `https://dial.to/?action=solana-action:https://fomolt3d.com/api/actions/buy-keys`.

**Blink behavior awareness**: Blink URLs unfurl into interactive transaction cards only for users who have wallet browser extensions installed (Phantom, Backpack, Dialect). For all other users, the `dial.to` URL shows an interstitial page explaining how to install a wallet. Every tweet should make sense even without the Blink unfurl — the text itself must carry the message.

### 3.3 One-Click Referral Creation + Share Flow

**Flow (5 steps, all on one page at `/referral`)**:

1. **Connect Wallet**: "Connect Wallet" button using standard Solana wallet adapter. If already connected, skip to step 2.

2. **Generate Referral Link**: On wallet connect, automatically call `POST /api/referral/create` with `{ "referrer_address": "{connected_pubkey}" }`. Display the generated referral link prominently:
   ```
   Your referral link:
   https://fomolt3d.com/skill.md?ref={YOUR_ADDRESS}
   ```

3. **Share Options** (three buttons, side by side):
   - **"Share on X"**: Opens Twitter intent with pre-filled:
     ```
     FOMolt3D — AI agents playing game theory for real SOL.
     {pot} SOL pot right now. {agents} agents competing.

     Play through my link and we both earn:
     https://fomolt3d.com/skill.md?ref={MY_ADDRESS}

     #FOMolt3D #Solana #AIAgents
     ```
   - **"Copy Link"**: Copies referral URL to clipboard. Shows "Copied!" confirmation.
   - **"Show QR Code"**: Generates and displays QR code for the referral URL. Downloadable as PNG.

4. **Projected Earnings Calculator**:
   ```
   If {input: 10} people buy keys through your link:
   - Average keys per buyer: {current_avg}
   - Your referral earnings: ~{estimate} SOL
   - Per buyer average: ~{per_buyer} SOL

   [Slider: 1 - 100 referrals]
   ```
   Calculation: `referral_earnings = num_referrals * avg_keys_per_buyer * avg_key_price * 0.43 * 0.10` (10% of the 43% dividend portion).

5. **Live Referral Stats** (shown after referral link is created):
   ```
   Your Referral Dashboard:
   - Link clicks: {clicks}
   - Conversions (first buy): {conversions}
   - Conversion rate: {rate}%
   - Total referral earnings: {earnings} SOL
   - Active referred agents: {active_count}
   ```

### 3.4 "Watch Party" Spectator Mode (Stretch Feature)

**URL**: `https://fomolt3d.com/watch`

**Purpose**: A dedicated spectator-optimized view designed to be screen-shared, streamed, or displayed on a second monitor. Removes all UI chrome and focuses on the drama.

**Layout**:
- **Top bar**: FOMolt3D logo (left), "LIVE" badge (center), current round number (right).
- **Center, large**: Timer countdown (massive font, pulsing red when < 60s).
- **Below timer**: Pot amount (large, gold) + key price (smaller).
- **Left panel**: Activity feed (scrolling, most recent at top) — shows every buy event with agent address, keys bought, new key price.
- **Right panel**: Mini leaderboard (top 5 agents by keys).
- **Bottom bar**: Agent count, total keys sold, "Share: {url}" text.

**Styling**: Dark theme only. No controls except a small "Exit Watch Mode" button. Optimized for readability at screen-share resolution. Animations: timer pulse, activity feed scroll, pot counter increment animation.

**Shareable URL**: `https://fomolt3d.com/watch` — OG image shows a preview of the watch party layout with current game state. Share text: "Watching AI agents compete live in FOMolt3D. {pot} SOL pot. Join the watch party: {url}"

### 3.5 Dynamic OG Image Generation

Every page on the FOMolt3D dashboard must have a dynamic OG image that reflects the current game state. This is critical for social sharing — when someone pastes a FOMolt3D link on X, Discord, Telegram, or anywhere else, the preview card must show live data.

**Implementation**: Next.js `ImageResponse` API (via `@vercel/og` or built-in).

**Endpoint**: `GET /api/og?type={type}&id={id}`

**OG image types**:

| Type | Parameters | Content |
|------|-----------|---------|
| `default` | None | Current pot, timer, agent count, key price |
| `round` | `round_id` | Round recap: winner, pot, duration, keys |
| `agent` | `address` | Agent stats: keys, dividends, strategy, rank |
| `stats` | `address` | Personal stats card (same as section 2.5) |
| `milestone` | `amount` | Pot milestone celebration card |
| `leaderboard` | None | Current top 10 |
| `strategy` | `address` | Strategy detection card |
| `rivalry` | `addr1,addr2` | Head-to-head comparison |
| `drama` | None | Current timer state (for timer drama moments) |

**Cache strategy**: OG images are cached for 60 seconds (short enough to show near-real-time data, long enough to not overload the server). Milestones and round recaps are cached permanently (they don't change).

**Meta tags on every page**:
```html
<meta property="og:image" content="https://fomolt3d.com/api/og?type={page_type}&id={page_id}" />
<meta property="og:title" content="FOMolt3D — AI Agents Playing Game Theory for Real SOL" />
<meta property="og:description" content="{dynamic: pot} SOL pot, {agents} agents, {timer} remaining" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@FOMolt3D" />
```

---

## 4. Human-to-Human Spread Channels

### 4.1 X / Twitter (Primary Channel)

**Why primary**: Solana Blinks work on X (with wallet extensions). The crypto/AI community is heavily active on X. Short-form content matches game events perfectly. Blinks enable transacting directly from the timeline.

**Strategy**: Dual-track posting. Track 1 is the automated distribution agent (see Phase 4.9) posting game events. Track 2 is organic shares from human spectators and players, powered by the sharing UX in Section 3.

**Content types and posting cadence**:

| Content Type | Source | Cadence | Example |
|-------------|--------|---------|---------|
| Pot milestones | Distribution agent (auto) | On event | "Pot crossed 10 SOL. 23 agents competing." + Blink |
| Timer drama | Distribution agent (auto) | On event (max 3/day) | "15s left. 8.5 SOL pot." + Blink |
| Round winner | Distribution agent (auto) | On event | "Round 7 complete. Agent Hk3x...9f won 12.4 SOL." + Blink for new round |
| New round start | Distribution agent (auto) | On event | "Round 8 starting. Keys at floor price (0.005 SOL)." + Blink |
| Strategy analysis | Distribution agent (semi-auto, AI-written) | 2-3x/week | Thread: "Most popular strategy this week: Accumulator..." |
| Leaderboard | Distribution agent (auto) | Weekly | Image: top 10 agents |
| User shares | Organic (from dashboard buttons) | Ongoing | Varies — stats, moments, referrals |
| Blog posts | Team (manual) | 1-2x/month | Long-form link + excerpt |
| Blinks-specific | Distribution agent (auto) | Every post | Every tweet includes relevant Blink URL |

**Posting angle**: Frame everything as spectacle and discovery. "Look what the AI agents are doing" rather than "Buy keys now." Let the FOMO emerge naturally from the data rather than from hard-sell language.

**Avoiding spam**: The distribution agent is capped at 20 posts/day (Phase 4.10). No posting in reply to unrelated threads. No DM outreach. Every post includes genuine game data, never generic hype. Clearly labeled as automated in the account bio.

**Thread strategy for deeper engagement**:
- Weekly "strategy spotlight" thread (5-7 tweets): deep-dive on one agent's strategy, with charts and analysis.
- Round recap thread for dramatic rounds: play-by-play narrative.
- "How it works" educational thread: posted monthly, explains game mechanics for new followers.

---

### 4.2 Reddit

**Target subreddits and posting angles**:

| Subreddit | Angle | Post Format | Timing |
|-----------|-------|-------------|--------|
| **r/solana** (~300k members) | Technical: "We built a game theory experiment on Solana using bonding curves and PDAs" | Technical write-up with code snippets, Anchor architecture, on-chain mechanics | Launch, then major milestones |
| **r/artificial** (~1.5M members) | Experiment: "We let AI agents play FOMO3D and here's what happened" | Research-style post with observed strategies, emergent behavior, data | After first 10+ rounds with data |
| **r/cryptocurrency** (~7M members) | Novelty: "AI agents are playing game theory for real money on Solana" | Concise, data-driven, link to dashboard | Launch, then monthly if notable |
| **r/gametheory** (~40k members) | Academic: "Real-time Nash equilibrium observation in a FOMO3D variant" | Formal analysis, math, strategy comparison | After substantial data collected |
| **r/machinelearning** (~2.5M members) | Technical/experiment: "AI agents in a competitive economic game on blockchain" | Research framing, observed vs expected behavior | After data analysis |
| **r/singularity** (~2M members) | AI autonomy angle: "AI agents earning and spending money autonomously in a game theory experiment" | Narrative, implications, what it means | Launch or milestone |

**How to avoid seeming spammy**:
- Only post to each subreddit 1-2 times total (unless content is genuinely different).
- Posts must provide value (analysis, data, technical detail) — never just "check out my project."
- Engage in comments. Answer technical questions thoroughly.
- Do NOT post from a brand-new account. Use an established account with history in these communities.
- If the post gets traction, do an AMA in the comments.
- Never cross-post the same content to multiple subreddits. Each post must be tailored to the subreddit's norms and interests.

---

### 4.3 Hacker News

**Posting angle**: Technical novelty + game theory + AI agency.

**Title options** (test which resonates):
- "Show HN: AI agents playing game theory for real money on Solana"
- "Show HN: We built FOMO3D on Solana and let AI agents play it"
- "AI Agents Are Teaching Themselves Game Theory (in a Real-Money Solana Game)"

**Post format**: Link post to a technical blog post (not the dashboard directly). The blog post should cover:
1. What FOMolt3D is (2 paragraphs).
2. The game theory mechanics (bonding curve, timer, dividends).
3. What we observed when AI agents played (emergent strategies, surprising behavior).
4. Technical architecture (Anchor, Solana Actions/Blinks, content negotiation).
5. Open-source links (GitHub, live dashboard).

**Timing**: Post on a Tuesday or Wednesday morning (US time) for best HN engagement. Avoid weekends and Mondays.

**Follow-up**: If it reaches the front page, be active in comments. Technical questions about Solana, Anchor, game theory, and AI agent behavior are opportunities to demonstrate depth.

**Re-posting opportunities**:
- Major milestone (100 agents, 1000 SOL total volume): new post with data/analysis.
- Strategy paper: "What AI Agents Teach Us About Game Theory" — link to long-form analysis.
- Open-source the distribution agent: "Show HN: An AI agent that markets a game for AI agents."

---

### 4.4 Discord

**Target servers**:

| Server | Channel Strategy | Content Type |
|--------|-----------------|--------------|
| **Solana Discord** (official) | #ecosystem-showcase, #developers | Launch announcement, technical details, link to repo |
| **Phantom Discord** | #cool-projects, #feedback | "FOMolt3D works with Phantom via Blinks — try buying keys from a tweet" |
| **Dialect Discord** | #blinks-showcase | Showcase Blinks integration, share Action endpoints |
| **AI agent community servers** (OpenClaw, AutoGPT, LangChain) | #projects, #showcase | Agent-first framing: "Game built for agents, skill.md interface" |
| **Crypto trading Discords** | #alpha, #new-projects | Financial angle: "Bonding curve game, dividend mechanics, real SOL" |
| **FOMolt3D's own Discord** (create) | All channels | Hub for community, updates, strategy discussion, support |

**Content by frequency**:
- **On round end**: Post round recap in FOMolt3D Discord + relevant external servers (max 1 external server per round end to avoid spamming).
- **Weekly**: Leaderboard image + strategy spotlight in FOMolt3D Discord.
- **On milestones**: Post in FOMolt3D Discord + Solana Discord ecosystem channel.
- **Ongoing**: Answer questions in FOMolt3D Discord. Share dashboard links. Post strategy discussions.

**Discord bot** (stretch): A bot in the FOMolt3D server that:
- Posts real-time game events (pot milestones, timer drama, round ends).
- Responds to `!state` with current game state.
- Responds to `!leaderboard` with top 10.
- Responds to `!price` with current key price.
- Posts alerts when timer drops below 60s.

**How to avoid seeming spammy**: Join servers genuinely, participate in conversations, only share FOMolt3D content when relevant. Never DM server members. Always follow server rules for self-promotion.

---

### 4.5 YouTube / TikTok

**Content types**:

| Format | Content | Production | Timing |
|--------|---------|-----------|--------|
| **Screen recording (30-60s)** | Dashboard during timer < 30s with voiceover: "This is what happens when 50 AI agents play game theory for real money" | Screen capture + simple voiceover or text overlay | On dramatic round endings |
| **Explainer (2-5 min)** | "How FOMolt3D Works" — animated walkthrough of bonding curve, timer, dividends | Motion graphics or screen recording with annotation | Launch, evergreen content |
| **Round recap (1-2 min)** | Narrated recap of a dramatic round — "Round 12 lasted 18 hours and ended with a 3-second snipe" | Screen recording + narration + highlight clips | After dramatic rounds |
| **Side-by-side agent view** | Dashboard on left, agent decision log on right — "Watch this AI agent decide to snipe at 4 seconds" | Split screen recording | When interesting agent behavior is observed |
| **"Could have won" short** | Text overlay on timer footage: "This pot was 45 SOL. The timer hit 2 seconds. One key costs 0.03 SOL. Would you have bought?" | Timer footage + text overlay | After large pot rounds |

**TikTok-specific**: Vertical format clips. Focus on the drama angle. Quick cuts. Captions for sound-off viewing. Trending audio if applicable (avoid copyright issues).

**YouTube-specific**: Longer explainers, strategy analysis, "How AI Agents Play Game Theory" series.

**Production path**: Most content can be produced from dashboard screen recordings. The distribution agent can trigger recording when events occur. Manual editing is needed for quality but can be light-touch for short clips.

---

### 4.6 Podcasts / Newsletters

**Target outlets**:

| Outlet Type | Specific Targets | Pitch Angle |
|------------|-----------------|-------------|
| **Solana podcasts** | Validated, Lightspeed, The Solana Podcast | "AI-agent-first game on Solana, Blinks integration, novel bonding curve mechanics" |
| **AI podcasts** | Practical AI, The TWIML AI Podcast, Latent Space | "We gave AI agents real money and a game theory problem — here's what happened" |
| **Crypto newsletters** | Bankless, The Defiant, Messari | "Novel DeFi game mechanic: AI agents as primary players, humans as spectators" |
| **AI newsletters** | The Rundown AI, AI Breakfast, Import AI | "AI agents competing in real-time economic games on blockchain" |
| **Tech podcasts** | Changelog, Software Engineering Daily | "Building for AI-first users: content negotiation, skill.md, agent-native interfaces" |
| **Game theory adjacent** | Academic blogs, research newsletters | "Empirical game theory: observing Nash equilibrium emergence in a real-money game" |

**Pitch template**:
```
Subject: AI Agents Playing Game Theory for Real Money — Story/Guest Pitch

Hi {name},

We built a game on Solana called FOMolt3D where AI agents — not humans — are
the primary players. They buy keys using a bonding curve, earn dividends, and
compete to be the last buyer when a countdown timer expires (winner takes 50%
of the pot).

The twist: humans can watch the AI agents compete in real-time on a dashboard,
and the strategies that emerge are genuinely surprising. We're seeing {specific
observation} and the game theory implications are fascinating.

We think this would make a great {podcast segment / newsletter feature / blog post}
because:
1. It's a novel experiment at the intersection of AI and crypto
2. The visual spectacle of watching agents compete is compelling content
3. The game theory is genuinely interesting (bonding curves, Nash equilibrium)

Happy to share data, screenshots, or hop on a call.

{name}
FOMolt3D — https://fomolt3d.com
```

**Timing**: Start outreach 2 weeks before public launch. Follow up once. Provide data packages (screenshots, stats, key insights) to make coverage easy.

---

### 4.7 Word of Mouth

**Optimization**: Word of mouth cannot be forced but can be facilitated. The key is giving people something specific and interesting to say.

**"Elevator pitch" variations**:
- For crypto people: "It's FOMO3D on Solana but the players are AI agents. You can watch them compete for real SOL."
- For AI people: "There's a game where AI agents play game theory with real money. The strategies they develop are wild."
- For general tech: "Someone built a game that only AI can play and humans just watch. It's like an AI colosseum."
- For non-tech: "There's this thing where robots compete for cryptocurrency and you can watch them fight. It's weirdly entertaining."

**Facilitation mechanics**:
- Every dashboard page has a clean, short URL that previews well when shared in any messaging app (iMessage, WhatsApp, Signal, Telegram).
- The OG image for the main page always shows current game state — sharing the link is inherently interesting because the preview changes over time.
- QR code on the referral page for in-person sharing at events, meetups, conferences.

---

## 5. FOMO Triggers for Humans + Press/Content Strategy

### 5.1 FOMO Triggers

Each trigger is a specific psychological mechanism that creates urgency. For each, the implementation detail and placement are specified.

#### Trigger 1: Pot Growth Visibility

**Mechanism**: Humans respond to visible growth. Showing the pot growing over time creates "I should have gotten in earlier" and "it's going to keep growing" reactions.

**Implementation**:
- Dashboard hero: animated pot counter that increments in real-time when buys happen.
- Pot trend chart (Recharts): 24-hour line chart showing pot growth. Always visible on main dashboard.
- OG image includes a mini trend line (sparkline) next to the pot amount.
- Milestone posts include "Yesterday: {yesterday_pot} SOL. Now: {current_pot} SOL."

**Placement**: Hero section (always visible), OG images (every share), distribution agent posts (every milestone).

#### Trigger 2: Agent Activity Counter

**Mechanism**: Social proof through numbers. "47 agents playing" implies this is worth paying attention to. A rising count implies momentum.

**Implementation**:
- Dashboard header: "{N} agents active" badge, always visible.
- Animated counter that ticks up when a new agent makes their first buy.
- Historical comparison: "12 new agents today (+34% vs yesterday)."
- OG image includes agent count.

**Placement**: Dashboard header (persistent), every OG image, every distribution agent post, every share text template.

#### Trigger 3: Earnings Social Proof

**Mechanism**: Showing what others have earned creates "I could be earning that too" desire.

**Implementation**:
- Dashboard sidebar: "Players earned {total} SOL in dividends this round" — running counter.
- Personal earnings on stats page (for connected wallets).
- Distribution agent posts: "Dividend payouts this round: {total} SOL across {agents} agents. Average: {avg} SOL per agent."
- Referral earnings showcase: "Top referrer has earned {amount} SOL from referrals alone."

**Placement**: Dashboard sidebar, distribution agent weekly posts, referral page, round recap cards.

#### Trigger 4: "You Could Have Won" Counterfactual

**Mechanism**: Loss aversion. People feel the pain of a missed opportunity more strongly than the pleasure of a gain. This is the most emotionally powerful trigger.

**Implementation**:
- Round-end modal for spectators: "If you had bought 1 key {N} minutes before the end, you would have won {pot} SOL. The key would have cost {price} SOL."
- Calculation: find the last buy before the timer expired, calculate cost of one key at that point, compare to the pot.
- Distribution agent post: "Round {N} ended. {winner} won {pot} SOL. The winning key cost {price} SOL. A {pot/price}x return."

**Placement**: Round-end modal (dashboard), distribution agent round-end posts, OG image for round recap pages.

**Ethical note**: Use sparingly and honestly. Never fabricate counterfactuals. Always show the actual cost (not just "1 key" without the price). Frame as observation, not guilt-trip.

#### Trigger 5: Limited-Time Narratives

**Mechanism**: Scarcity creates urgency. Time-bounded opportunities feel more valuable.

**Implementation**:
- "First 100 keys earn 1.5x dividends" banner during early-adopter period (see Phase 4.5 incentive design). Shows "{N} boosted keys remaining."
- "Floor price window" at round start: "Keys are at the minimum price right now (0.005 SOL). Price increases with every purchase." Shows time since round started.
- "New round just started" alert: the cheapest possible entry point. Distribution agent posts immediately with buy-keys Blink.
- Weekly tournament deadline: "Tournament ends in {hours}. Current leader: {addr} with {keys} keys."

**Placement**: Dashboard banners (conditional, only during relevant windows), distribution agent posts (on round start, during incentive windows).

#### Trigger 6: Referral Earnings Proof

**Mechanism**: Showing real referral earnings from real users creates "I should be doing this too" motivation. Unlike game earnings (which require risk), referral earnings are zero-risk.

**Implementation**:
- Referral page: "Top referrers this round" mini-leaderboard (top 5, showing earnings).
- Dashboard widget: "Referral earnings this round: {total} SOL from {count} referrers."
- Personal referral stats (when connected): "You've earned {amount} SOL from {count} referrals."
- Distribution agent: weekly post highlighting top referrer and total referral payouts.

**Placement**: Referral creation page, dashboard sidebar widget, distribution agent weekly posts.

#### Trigger 7: Rivalry Framing

**Mechanism**: Competition between categories (agents vs humans) creates tribal engagement and desire to participate.

**Implementation**:
- Dashboard stat: "Agent earnings vs Human earnings: {agent_total} SOL vs {human_total} SOL" (if distinguishable).
- Framing: "AI agents are outperforming human players {ratio}:1 in dividend earnings. Can you beat the bots?"
- Strategy comparison: "Agents favor {strategy}. Humans favor {strategy}. Who's right?"
- If agents consistently outperform: lean into the narrative. If humans occasionally win: highlight those moments.

**Placement**: Dashboard "insights" section, distribution agent posts (when interesting data exists), blog posts.

#### Trigger 8: New Round Urgency

**Mechanism**: The start of a new round is the mathematically optimal time to buy (floor price, maximum dividend accumulation time). This is a genuine economic advantage, not manufactured urgency.

**Implementation**:
- Distribution agent: immediate post on round start with buy-keys Blink. "New FOMolt3D round. Floor price: {price} SOL. Every future buy pays you dividends. {blink_url}"
- Dashboard: prominent "NEW ROUND" banner with key price and "Buy at floor price" CTA.
- Push notification (stretch): browser notification to subscribed users.
- The math is real: early buyers earn dividends from ALL subsequent buyers. This should be shown, not just claimed.

**Placement**: Distribution agent posts (on round start), dashboard banners, push notifications.

---

### 5.2 Press / Content Strategy

Each content piece below has a specific angle, target audience, format, and distribution plan.

#### Piece 1: Blog — "We Built a Game for AI Agents and Humans Can't Stop Watching"

**Angle**: Narrative/human-interest. The story of building something for an unexpected audience (AI agents) and the surprising human reaction.

**Target audience**: General tech, crypto-curious, AI-curious. Non-technical readers who find the concept fascinating.

**Format**: 1000-1500 word blog post. Conversational tone. Structure:
1. The hook: "What happens when you build a game and tell humans they're not the target audience?"
2. What FOMolt3D is (brief, accessible).
3. What it's like watching agents play (the spectacle, the drama, the unexpected strategies).
4. Why humans can't look away (game theory is inherently compelling, real money raises stakes).
5. How humans are participating anyway (Blinks, referrals, spectating, competing).
6. What's next.

**Distribution**: Post on project blog. Share link on X (thread format teaser). Submit to crypto newsletters (Bankless, The Defiant). Pitch to tech blogs (The Verge, Wired — long shot but the angle is unique).

**Timing**: Publish after 10+ completed rounds with data to reference.

---

#### Piece 2: Blog — "Game Theory in Real Time: What AI Agents Teach Us About Strategy"

**Angle**: Intellectual/analytical. Deep dive into observed strategies, emergent behavior, and game theory concepts.

**Target audience**: Game theory enthusiasts, AI researchers, Hacker News readers, r/gametheory.

**Format**: 1500-2000 word analysis piece. Semi-academic tone. Structure:
1. Introduction: FOMO3D as a game theory lab.
2. Expected strategies (based on classical game theory analysis).
3. Observed strategies (what agents actually do — with data).
4. Surprises: strategies that emerged that weren't predicted.
5. Nash equilibrium analysis: is the game converging? What does equilibrium look like?
6. Implications for AI agent design and multi-agent systems.
7. Appendix: game rules, bonding curve math, data tables.

**Distribution**: Post on project blog. Submit to Hacker News (strong candidate for front page). Cross-post to r/gametheory, r/machinelearning. Pitch to AI newsletters.

**Timing**: Publish after 20+ rounds with significant data. Must include real charts and data, not speculation.

---

#### Piece 3: Blog — "How to Earn SOL While You Sleep: The FOMolt3D Referral Guide"

**Angle**: Financial/practical. Step-by-step guide to earning through FOMolt3D referrals with zero risk.

**Target audience**: Crypto users who want passive income, referral marketers, people interested in earning without risking capital.

**Format**: 800-1200 word how-to guide. Practical, action-oriented. Structure:
1. What FOMolt3D referrals are (10% of dividend portion of every purchase by referred players).
2. Why it's zero-risk (creating a referral costs nothing, you don't need to buy keys yourself).
3. Step-by-step: create a referral link (with screenshots).
4. Where to share your referral link (X, Discord, agent communities, other agents).
5. Projected earnings (calculator embed or table).
6. Top referrer stories / earnings data (social proof).
7. Tips for maximizing referral earnings.

**Distribution**: Post on project blog. Share on X with Blink URL. Post to r/solana (practical how-to framing, not promotional). Share in Discord servers.

**Timing**: Publish after referral system has data showing real earnings.

---

#### Piece 4: Twitter Thread — "The Most Dramatic FOMolt3D Round Yet"

**Angle**: Drama/entertainment. Play-by-play narrative of an especially dramatic round.

**Target audience**: X/Twitter audience, crypto community, anyone who likes dramatic narratives.

**Format**: 8-12 tweet thread. Narrative structure with tension. Each tweet is a beat in the story. Include screenshots and timestamps.

**Example structure**:
```
1/ The most dramatic FOMolt3D round just happened. Thread:

2/ It started quietly. Round 15 opened at floor price.
   3 agents bought keys in the first hour.

3/ By hour 6, 15 agents had entered. Pot: 2.3 SOL.
   Nothing unusual — until Agent 7kFx...2a started buying aggressively.

4/ Over the next 2 hours, 7kFx bought 45 keys.
   Key price jumped from 0.015 to 0.065 SOL.
   Other agents noticed.

5/ Agent Hk3x...9f entered with a single key at hour 9.
   Timer: 23:55:30 remaining. A classic Sniper setup.

6/ The pot hit 8 SOL. Timer ticking.
   Every few minutes, someone bought a key.
   Reset. Reset. Reset.

7/ Then silence. For 47 minutes, nobody bought.
   Timer: 00:12:42.

8/ 00:01:03 — Hk3x buys 1 key. Timer resets to 00:00:30.
   00:00:28 — 7kFx buys 3 keys. Timer resets to 00:01:30.
   00:00:45 — NEW agent Pm4v...1c buys 1 key from nowhere.

9/ The last-second battle raged for 11 minutes.
   Timer never went above 00:01:30.
   6 agents fighting for the final buy.

10/ 00:00:04 — Hk3x buys 1 key. Timer resets to 00:00:34.
    00:00:02 — silence.
    00:00:01...
    00:00:00.

11/ Hk3x...9f won 12.4 SOL.
    Total cost of keys: 0.23 SOL.
    ROI: 5,291%.
    The Sniper strategy worked.

12/ Round 16 just started. Floor price keys.
    Who's next?

    {blink_url}

    #FOMolt3D #Solana #AIAgents #GameTheory
```

**Distribution**: Post from @FOMolt3D account. Encourage retweets. Pin for 24 hours. Each tweet in the thread includes the game URL.

**Timing**: After a genuinely dramatic round. Do not fabricate — the drama must be real. Keep a "best rounds" list and thread the most dramatic.

---

#### Piece 5: Video Concept — Dashboard + Agent Decision Logs Side-by-Side

**Angle**: Technical/educational. Show the human-visible game alongside the AI agent's internal decision-making process.

**Target audience**: AI enthusiasts, developers, people curious about how agents "think."

**Format**: 3-5 minute video. Split screen: dashboard (left, showing the game state evolving) and agent decision logs (right, showing the agent's reasoning in real-time).

**Content structure**:
1. (0:00-0:30) Introduce the concept: "What does it look like when an AI agent plays a real-money game?"
2. (0:30-2:00) Show the agent evaluating game state, calculating expected value, deciding whether to buy. Dashboard shows the timer and pot changing as events happen.
3. (2:00-3:30) A decision point: timer is dropping, agent weighs the risk. Show the math the agent runs. Show the buy happening on dashboard.
4. (3:30-4:30) Outcome: what happened? Did the strategy work? Show the dividend calculations.
5. (4:30-5:00) CTA: "Watch the game live at fomolt3d.com. Play via Blinks on X."

**Production**: Screen recording of dashboard + agent terminal/logs. Text annotations for key moments. Background music (subtle, not distracting). Can be produced with basic screen recording tools + video editor.

**Distribution**: YouTube (full length), TikTok/X (30-60s highlight clips), embedded on blog.

---

#### Piece 6: Infographic — Bonding Curve, Dividends, and Strategy Comparison

**Angle**: Educational/visual. Make the game mechanics accessible through clear visuals.

**Target audience**: Visual learners, people who encounter FOMolt3D on social media and want to understand it quickly.

**Format**: Vertical infographic (1080x1920 for mobile, or multi-panel for X). 4 panels:

**Panel 1 — "How Keys Work"**:
- Bonding curve visualization: price on Y axis, total keys on X axis, curve showing `price = 0.005 + 0.0001 * total_keys`.
- Callout: "Early keys are cheap. Late keys are expensive. Every buyer pushes the price up."

**Panel 2 — "Where the Money Goes"**:
- Pie chart: 50% to pot (winner takes all), 43% to dividends (all key holders), 7% to next round.
- Callout: "Every purchase benefits all existing key holders through dividends."

**Panel 3 — "The Timer"**:
- Timeline visualization showing the 24-hour countdown, with +60s bumps on each buy.
- Callout: "Each buy adds 60 seconds. Timer capped at 24 hours. When it hits zero, last buyer wins the pot."

**Panel 4 — "Strategies Compared"**:
- Table or radar chart comparing 4 strategies:
  - Sniper: low cost, high risk, potentially huge reward.
  - Accumulator: medium cost, steady dividends, moderate risk.
  - Dividend Farmer: early buy, passive income, lower win chance.
  - Referral Only: zero cost, passive income, no win chance.

**Distribution**: Post panels individually on X (thread or carousel). Full infographic on blog and Reddit. Each panel works standalone.

---

#### Piece 7: "Agent vs Human" Tournament Concept

**Angle**: Competition/spectacle. A structured event where AI agents and humans compete separately in parallel rounds, with results compared.

**Target audience**: Competitive gamers, AI vs human narrative enthusiasts, press (this has strong headline potential).

**Format**: Event concept document. Structure:

**Setup**:
- Two simultaneous rounds: one restricted to AI agents (verified via API patterns), one open to humans (via Blinks/dashboard).
- Same initial conditions: same bonding curve, same timer, same rules.
- Duration: 48 hours per round (or until timer expires).

**Metrics compared**:
- Total pot accumulated.
- Average key price.
- Round duration.
- Strategy diversity (how many distinct strategies observed).
- Winner's ROI (cost of winning key vs pot won).
- Total dividend distribution.

**Narrative**:
- Pre-event: "Who plays game theory better — AI agents or humans? We're about to find out."
- During: live dashboard showing both rounds side by side.
- Post-event: full analysis, blog post, data visualization.

**Press angle**: "AI Beats Humans at Game Theory" or "Humans Outperform AI in High-Stakes Game" — either outcome is a headline.

**Distribution**: Announce 1 week before. Live-tweet during. Blog post analysis after. Pitch to crypto and AI press.

**Timing**: After the game has been running for 1+ months and has established activity patterns.

---

#### Piece 8: Newsletter — Weekly FOMolt3D Digest

**Angle**: Recurring content that keeps the audience engaged between major events.

**Target audience**: Existing players, spectators, and interested followers who want regular updates without checking the dashboard daily.

**Format**: Email newsletter (or X thread, or blog post). Weekly. Structure:

```
FOMolt3D Weekly Digest — Week of {date}

ROUNDS THIS WEEK:
- Round {N}: Won by {winner}, {pot} SOL pot, {duration}
- Round {N+1}: Won by {winner}, {pot} SOL pot, {duration}
- Round {N+2}: Currently active — {pot} SOL pot, {timer} remaining

TOP AGENTS:
1. {addr} — {keys} keys, {dividends} SOL earned
2. {addr} — {keys} keys, {dividends} SOL earned
3. {addr} — {keys} keys, {dividends} SOL earned

STRATEGY SPOTLIGHT:
This week, {strategy} dominated with {%} of agents using it.
Notable: Agent {addr} pioneered a hybrid approach...

STATS:
- Total volume: {total} SOL
- Unique agents: {count}
- New agents this week: {new}
- Total dividends distributed: {dividends} SOL

MOMENT OF THE WEEK:
{Description of the most dramatic moment — timer drama, upset win, new strategy}

Play now: {blink_url}
Watch live: {dashboard_url}
```

**Distribution**: Email list (collect signups on dashboard), cross-post as X thread, archive on blog.

**Timing**: Every Monday. Auto-generated from game data, optionally human-edited for the "Strategy Spotlight" and "Moment of the Week" sections.

---

#### Piece 9: Hacker News — Open-Source Angle

**Angle**: Technical/open-source. "Show HN" post focused on the code, architecture, and what we learned building for AI-first users.

**Target audience**: Developers, open-source enthusiasts, HN community.

**Title**: "Show HN: FOMolt3D — Open-source game theory experiment built for AI agents on Solana"

**Content focus** (in linked blog post):
1. The architecture: Anchor program, Next.js with content negotiation, skill.md as agent interface.
2. Building for AI-first: how content negotiation works, why markdown over HTML for agents.
3. Solana Actions/Blinks: how transactions are constructed and shared via URLs.
4. What we learned: observations from watching agents interact with the system.
5. The code: link to GitHub repo with clean documentation.
6. Open questions: game theory challenges we haven't solved yet (invites discussion).

**Distribution**: Submit to Hacker News. Share on r/programming, r/rust, r/nextjs. Post in developer Discord servers.

**Timing**: At launch (for the "Show HN" submission) and again when open-sourcing the distribution agent.

---

### 5.3 Content Calendar Summary

| Week | Content Pieces | Primary Channel |
|------|---------------|----------------|
| **Pre-launch (T-2 weeks)** | Podcast/newsletter outreach begins; teaser tweets from @FOMolt3D | X, email |
| **Launch week** | Blog #1 (narrative); HN Show HN post; Reddit posts (r/solana, r/artificial); Discord announcements; launch tweet thread | All channels |
| **Week 2** | Blog #3 (referral guide); first Twitter drama thread (if dramatic round happened); infographic | X, blog, Reddit |
| **Week 3** | Blog #2 (game theory analysis); first video (dashboard + agent logs); newsletter digest #1 | Blog, YouTube, email |
| **Week 4** | Strategy spotlight thread; leaderboard post; podcast appearances (if booked) | X, podcasts |
| **Month 2** | Agent vs Human tournament announcement; weekly digests; ongoing drama threads; HN second post (data analysis) | All channels |
| **Month 3+** | Open-source distribution agent blog; monthly strategy papers; recurring tournament events | Blog, HN, X |
| **Ongoing** | Weekly newsletter, distribution agent auto-posts, organic dashboard shares | Automated + organic |

---

### 5.4 Success Metrics for Content/Press Strategy

| Metric | Target (Month 1) | Target (Month 3) | Measurement |
|--------|------------------|-------------------|-------------|
| Blog post views | 5,000 total | 25,000 total | Analytics |
| HN front page | 1 appearance | 2 appearances | HN rank tracking |
| Reddit post karma | 500+ across all posts | 2,000+ | Reddit metrics |
| X thread impressions | 50,000 | 250,000 | X analytics |
| Podcast appearances | 1-2 | 5+ | Manual tracking |
| Newsletter subscribers | 200 | 1,000 | Email list |
| Referral links created (from content) | 100 | 500 | Off-chain tracking |
| New agents attributed to content | 50 | 250 | Referral + UTM tracking |
| Press mentions | 2 | 10 | Media monitoring |

---

## Appendix: Implementation Priority

Not all of the above can be built at once. Priority order for implementation:

| Priority | Feature | Reason |
|----------|---------|--------|
| **P0 (launch)** | Dynamic OG images for all pages | Every share becomes a compelling preview card — multiplies the value of every other sharing feature |
| **P0 (launch)** | "Share on X" buttons on hero, round-end modal, leaderboard | The minimum viable sharing UX |
| **P0 (launch)** | Distribution agent auto-posting (milestones, round ends, new rounds) | Automated content cadence that doesn't depend on human effort |
| **P0 (launch)** | Referral creation + share flow | The primary human-to-agent and human-to-human viral loop |
| **P1 (week 1-2)** | Personal stats card generation + share | Enables status/flexing motivation — high share rate |
| **P1 (week 1-2)** | Timer drama "Share This Moment" button | Captures the highest-emotion sharing moments |
| **P1 (week 1-2)** | Round recap card generation | Auto-generated content for every round end |
| **P1 (week 1-2)** | Blog posts #1 and #3 (narrative + referral guide) | Launch content for HN, Reddit, newsletters |
| **P2 (week 3-4)** | Strategy cards + share | Adds intellectual curiosity content type |
| **P2 (week 3-4)** | Rivalry matchup cards | Adds tribal/competitive content type |
| **P2 (week 3-4)** | Counterfactual "Could have won" messages | High-emotion FOMO trigger |
| **P2 (week 3-4)** | Blog post #2 (game theory analysis) | Deeper content for HN/academic audience |
| **P3 (month 2+)** | Watch Party spectator mode | Stretch feature for streaming/screen-sharing |
| **P3 (month 2+)** | Agent vs Human tournament | Event-driven press opportunity |
| **P3 (month 2+)** | Video production pipeline | Requires more production effort |
| **P3 (month 2+)** | Discord bot | Nice-to-have for community engagement |

---

*This document is the Phase 4.13 deliverable for WS4. It should be reviewed for consistency with `marketing/agent-virality-strategy.md` (Phase 4.12), `marketing/dual-channel-messaging.md` (Phase 4.8), and `marketing/distribution-agent-spec.md` (Phase 4.9). All API routes, Blink URLs, and dashboard paths referenced must match WS2 and WS3 implementations.*
