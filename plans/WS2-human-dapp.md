# Workstream 2: Human-Facing Dapp (Spectator-First)

## Overview
Build a web dashboard where humans can WATCH agents play in real-time. The primary experience is spectating — seeing the pot grow, timer tick, agents buy keys, strategies unfold. Participation (connecting wallet, buying keys) is secondary.

### Status: ~90% Complete

| Phase | Status |
|-------|--------|
| 2.1 Project Setup & API Layer | **DONE** — 12 API routes, full SDK (12 modules), 112 tests |
| 2.2 Spectator Dashboard | **DONE** — 22 components, 7 hooks, charts, leaderboard, activity feed |
| 2.3 Agent Profiles & Round History | **DONE** — /agent/[address], /rounds, /round/[id] pages |
| 2.4 Human Participation | **DONE** — WalletConnect, BuyKeysForm, claim flow |
| 2.4b Blinks Integration | **Mostly done** — 4 Action endpoints implemented. Missing: Blink card embed on dashboard, "Share on X" button |
| 2.5 Polish & Performance | **Partially done** — Missing: OG image, accessibility audit, mobile QA, performance audit |

## Mandatory Skills

| Skill | When to Invoke | Mandate |
|-------|---------------|---------|
| `solana-frontend` | Phase 2.1 (project setup, API routes), Phase 2.4 (wallet integration, tx construction) | **Required** for ALL Solana frontend work — wallet auth, RPC connections, data fetching with React Query, transaction construction/execution, state management, error handling. |
| `react-best-practices` | Phase 2.2 (component architecture), Phase 2.5 (performance) | **Required** for component design, bundle optimization, eliminating waterfalls, rendering performance. Invoke before building any component. |
| `ui-skills` | Phase 2.2 (dashboard layout), Phase 2.5 (polish) | **Required** for accessibility, animation, and design constraints. Enforces a11y, performance, and visual quality. |
| `ralph-validation` | Phase 2.1 (API route correctness) | **Required** self-validation on API routes: verify every route returns correct data for known program states. |
| `success-criteria` | Start of EVERY phase | **Required** — invoke to confirm phase criteria before starting work. |
| `git-workflow` | Every commit | **Required** — atomic commits with testing gates. |
| `code-simplifier` | End of Phase 2.2, end of Phase 2.5 | **Required** — simplify component code after each major implementation pass. |
| `repo-docs-sync` | After README/docs changes | **Required** — keep documentation in sync. |

## Directory Structure
```
app/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── public/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, providers, global styles
│   │   ├── page.tsx                # Main spectator dashboard
│   │   ├── agent/[address]/
│   │   │   └── page.tsx            # Individual agent profile page
│   │   ├── rounds/
│   │   │   └── page.tsx            # Round history browser
│   │   ├── round/[id]/
│   │   │   └── page.tsx            # Individual round detail/replay
│   │   └── api/
│   │       ├── state/route.ts      # GET: current game state (JSON)
│   │       ├── player/[address]/route.ts  # GET: player state
│   │       ├── tx/buy/route.ts     # POST: build unsigned buy tx
│   │       ├── tx/claim/route.ts   # POST: build unsigned claim tx
│   │       ├── events/route.ts     # SSE: real-time event stream
│   │       └── leaderboard/route.ts # GET: leaderboard data
│   ├── components/
│   │   ├── GameHero.tsx            # Pot amount, timer countdown, last buyer
│   │   ├── TimerDisplay.tsx        # Animated countdown with urgency states
│   │   ├── ActivityFeed.tsx        # Live scrolling feed of agent actions
│   │   ├── ActivityItem.tsx        # Single activity row (buy/claim/referral)
│   │   ├── BondingCurveChart.tsx   # Price curve visualization (Recharts)
│   │   ├── PotGrowthChart.tsx      # Pot size over time
│   │   ├── AgentLeaderboard.tsx    # Sortable table: keys, dividends, wins
│   │   ├── KeyPriceDisplay.tsx     # Current price + next price
│   │   ├── RoundStats.tsx          # Round metadata (duration, total buys, unique agents)
│   │   ├── AgentCard.tsx           # Summary card for agent profiles
│   │   ├── StrategyTag.tsx         # Visual tag for detected strategy type
│   │   ├── WalletConnect.tsx       # Wallet adapter button (secondary feature)
│   │   ├── BuyKeysForm.tsx         # Buy form (secondary feature)
│   │   └── ClaimButton.tsx         # Claim dividends/winner (secondary feature)
│   ├── hooks/
│   │   ├── useGameState.ts         # Poll/subscribe to game state
│   │   ├── useActivityFeed.ts      # SSE connection for live events
│   │   ├── usePlayerState.ts       # Fetch player data by address
│   │   └── useCountdown.ts         # Client-side timer countdown
│   ├── lib/
│   │   ├── program.ts              # Anchor program client setup
│   │   ├── idl.ts                  # IDL types (generated from Anchor)
│   │   ├── rpc.ts                  # Solana RPC connection config
│   │   ├── events.ts               # Parse on-chain transaction logs into events
│   │   └── format.ts               # Format SOL, time, addresses
│   └── styles/
│       └── globals.css             # Tailwind imports, custom properties
```

---

## Phase 2.1: Project Setup & API Layer

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-frontend` for project setup, RPC config, and API routes.

### Tasks
- [ ] Initialize Next.js 14+ app with App Router, TypeScript, Tailwind
- [ ] Install dependencies: `@solana/web3.js`, `@coral-xyz/anchor`, `@solana/wallet-adapter-*`
- [ ] Configure Solana RPC connection in `lib/rpc.ts` (devnet, with fallback URLs)
- [ ] Set up Anchor program client in `lib/program.ts` using exported IDL
- [ ] Copy IDL from WS1 output to `lib/idl.ts` (or `lib/idl.json`)
- [ ] Implement utility functions in `lib/format.ts`:
  - [ ] `formatSol(lamports: number): string` — e.g., "1.234 SOL"
  - [ ] `formatAddress(pubkey: string): string` — e.g., "7xKX...3fD2"
  - [ ] `formatTime(seconds: number): string` — e.g., "2h 15m 30s"

### API Routes (each is a checkable deliverable):
- [ ] `GET /api/state` — Fetch GameState PDA, return:
  ```json
  { "round": 1, "pot_lamports": 500000000, "timer_end": 1234567890,
    "last_buyer": "7xKX...", "total_keys": 150, "key_price_lamports": 10160000,
    "active": true }
  ```
- [ ] `GET /api/player/[address]` — Fetch PlayerState PDA, return:
  ```json
  { "keys": 10, "pending_dividends_lamports": 5000000,
    "claimed_dividends_lamports": 2000000, "referrer": "8yLM..." }
  ```
- [ ] `GET /api/leaderboard` — Aggregate top players, return sorted arrays for:
  - Top key holders (address, keys)
  - Top dividend earners (address, total_claimed)
- [ ] `POST /api/tx/buy` — Accept `{ buyer, keys_to_buy, referrer? }`, return `{ transaction: "<base64>" }`
  - Must construct valid unsigned Anchor transaction
  - Must derive correct PDA addresses
  - Must handle `init_if_needed` for new PlayerState
- [ ] `POST /api/tx/claim` — Accept `{ player }`, return `{ transaction: "<base64>" }`
- [ ] `GET /api/events` — SSE endpoint:
  - Poll on-chain transaction signatures for the program every 2-3 seconds
  - Parse transaction logs into events: `{ type: "BUY"|"CLAIM"|"WIN", player, amount, keys, timestamp }`
  - Stream as SSE `data:` frames

### Testing (invoke `ralph-validation`)
- [ ] Each API route tested with mock program state — correct JSON shape returned
- [ ] `POST /api/tx/buy` produces a valid serialized transaction (deserializable, correct accounts)
- [ ] `GET /api/events` SSE stream opens and delivers events
- [ ] Error responses: 400 for invalid input, 404 for non-existent player, 500 with message for RPC failures

### Phase 2.1 Completion Criteria
- [ ] Next.js app starts with `npm run dev` — no errors
- [ ] All 6 API routes return correct responses for devnet program state
- [ ] Transaction builder routes produce valid unsigned transactions
- [ ] SSE endpoint streams events
- [ ] All routes have error handling (400/404/500 with clear messages)
- [ ] Commit via `git-workflow`

---

## Phase 2.2: Spectator Core — The "War Room" Dashboard

> **Skill gate**: Invoke `success-criteria`. Invoke `react-best-practices` for component architecture. Invoke `ui-skills` for design constraints.

### Task 2.2.1: Hooks
- [ ] `useGameState.ts` — Polls `GET /api/state` every 3 seconds, returns typed game state + loading/error
- [ ] `useCountdown.ts` — Takes `timer_end` timestamp, returns `{ hours, minutes, seconds, urgency }` updated every second. `urgency` = "normal" | "warning" | "critical" | "expired"
- [ ] `useActivityFeed.ts` — Connects to `GET /api/events` SSE, maintains rolling array of last 100 events, auto-reconnects on disconnect
- [ ] `usePlayerState.ts` — Fetches `GET /api/player/[address]`, returns typed player state

### Task 2.2.2: Hero Section Components
- [ ] `GameHero.tsx` — Full-width hero:
  - Giant pot amount in SOL (use `formatSol`, animate on change)
  - Round number badge
  - Current key price
  - Last buyer address (truncated, linked to `/agent/[address]`)
- [ ] `TimerDisplay.tsx` — Countdown display:
  - Color states: green (>1hr), yellow (>5min), orange (>1min), red+pulsing (<1min)
  - Shows "ROUND ENDED" when expired
  - Accessible: `aria-live="polite"` for screen readers

### Task 2.2.3: Activity Feed
- [ ] `ActivityFeed.tsx` — Scrolling container:
  - Auto-scrolls to bottom on new events
  - Pauses auto-scroll on hover
  - Shows "Connecting..." state when SSE disconnected
- [ ] `ActivityItem.tsx` — Single event row:
  - Timestamp, agent address (linked), action type badge (color-coded), amount, key count
  - BUY = blue, CLAIM = green, WIN = gold, REFERRAL = purple

### Task 2.2.4: Leaderboard
- [ ] `AgentLeaderboard.tsx` — Tabbed sortable table:
  - Tabs: "Key Holders" / "Dividend Earners"
  - Columns: Rank, Address (linked to profile), Keys/Dividends, Strategy Tag
  - Sortable by clicking column headers
- [ ] `StrategyTag.tsx` — Visual badge: "Sniper" (red), "Accumulator" (blue), "High-Freq" (purple)

### Task 2.2.5: Charts
- [ ] `BondingCurveChart.tsx` — Line chart (Recharts):
  - X-axis: total keys sold, Y-axis: price per key
  - Mark current position with highlighted dot
  - Show formula on hover
- [ ] `PotGrowthChart.tsx` — Area chart showing pot size over time for current round

### Task 2.2.6: Page Assembly
- [ ] `page.tsx` — Assemble all components into dashboard layout:
  - Hero section (full width, top)
  - Activity Feed (60% width, left) + Leaderboard (40% width, right)
  - Charts section (full width, bottom)
  - Responsive: stack vertically on mobile

### Testing
- [ ] Dashboard renders without errors when game state is loading
- [ ] Dashboard renders correctly with mock game state data
- [ ] Timer countdown matches server time within 1 second
- [ ] Activity feed auto-scrolls and pauses on hover
- [ ] Leaderboard sorts correctly on column click
- [ ] Charts render with sample data points
- [ ] Mobile layout: no horizontal scrolling, readable text at 375px width

### Phase 2.2 Completion Criteria
- [ ] All 12 components implemented and rendering
- [ ] Dashboard shows live data from devnet API routes
- [ ] Timer accurate within 1 second of on-chain state
- [ ] Activity feed updates within 3 seconds of transaction
- [ ] No accessibility violations (run `ui-skills` audit)
- [ ] `react-best-practices` review: no unnecessary re-renders, proper memoization
- [ ] `code-simplifier` run on all components
- [ ] Commit via `git-workflow`

---

## Phase 2.3: Agent Profiles & Round History

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-frontend` for data fetching patterns.

### Task 2.3.1: Agent Profile Page (`/agent/[address]`)
- [ ] Stats summary: total keys, total dividends earned, rounds participated
- [ ] Activity history: table of all buys/claims for this address in current round
- [ ] Strategy detection: classify based on buy patterns (Sniper/Accumulator/HFT/Mixed)
- [ ] Referral info: who referred them, who they've referred
- [ ] `AgentCard.tsx` component for summary display

### Task 2.3.2: Round History (`/rounds`)
- [ ] Table of completed rounds: round number, winner, pot size, duration, total keys, unique agents
- [ ] Click row -> navigate to `/round/[id]`

### Task 2.3.3: Round Detail (`/round/[id]`)
- [ ] Timeline view of all events in the round
- [ ] Final stats: winner, pot size, total dividends distributed, total keys sold
- [ ] Player breakdown: who bought how many keys, who claimed how much

### Phase 2.3 Completion Criteria
- [ ] Agent profile page loads for any valid address
- [ ] Agent profile shows correct stats from on-chain data
- [ ] Round history lists all completed rounds
- [ ] Round detail shows complete event timeline
- [ ] All pages handle loading/error states gracefully
- [ ] Commit via `git-workflow`

---

## Phase 2.4: Human Participation (Secondary)

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-frontend` for wallet adapter and transaction patterns.

### Tasks
- [ ] `WalletConnect.tsx` — Wallet adapter integration (Phantom, Solflare, Backpack)
  - Uses `@solana/wallet-adapter-react` with proper provider setup in `layout.tsx`
  - Shows connected address, balance, disconnect button
- [ ] `BuyKeysForm.tsx` — Buy keys form:
  - Input: number of keys (validated: > 0, integer)
  - Display: estimated cost in SOL (calculated from bonding curve)
  - Submit: calls `POST /api/tx/buy`, signs with wallet, submits
  - Status: shows tx pending -> confirmed -> finalized
- [ ] `ClaimButton.tsx` — Claim dividends button:
  - Shows pending dividend amount
  - Submit: calls `POST /api/tx/claim`, signs with wallet, submits
  - Disabled when no dividends to claim
- [ ] Personal stats panel (when wallet connected):
  - Your keys, your pending dividends, your claimed dividends
  - Your referral link
- [ ] Transaction status toasts (pending -> confirmed -> finalized / error)

### Testing
- [ ] Wallet connection works with at least Phantom
- [ ] Buy flow: connect wallet -> enter keys -> see cost -> confirm -> tx succeeds
- [ ] Claim flow: connect wallet -> see pending amount -> claim -> tx succeeds -> amount updates
- [ ] Error handling: insufficient funds, tx failure, wallet disconnect mid-tx

### Phase 2.4 Completion Criteria
- [ ] Wallet adapter connects and disconnects cleanly
- [ ] Buy keys flow works end-to-end (wallet -> form -> tx -> confirmation)
- [ ] Claim dividends flow works end-to-end
- [ ] Transaction status feedback (toasts) for all states
- [ ] All error states handled with user-friendly messages
- [ ] Commit via `git-workflow`

---

## Phase 2.4b: Solana Blinks Integration

> **Skill gate**: Invoke `success-criteria`. Reference `solana-dev-skill` (specifically `blinks-actions.md`) for Actions spec and implementation patterns.

Blinks (Blockchain Links) turn our game actions into interactive cards that render on X/Twitter (via wallet extensions), in wallets, and on our own dashboard. This is a **major promotional channel**: anyone can share a "Buy Keys" link on X and their followers can transact directly from the timeline.

### Background

- Solana Actions are HTTP APIs (GET metadata + POST to get unsigned tx) conforming to the Actions spec
- Blinks are URLs that Action-aware clients (Phantom, Backpack, Dialect Chrome extensions) unfurl into interactive cards
- On X/Twitter: when someone shares a Blink URL, followers with wallet extensions see an interactive card with buttons, input fields, and can sign transactions inline
- Limitation: X integration requires Chrome extensions (desktop only); mobile users fall back to `dial.to` interstitial
- Registration required: must register at `https://dial.to/register` for trusted rendering on X

### Tasks

#### Infrastructure
- [ ] Create `app/src/app/actions.json/route.ts` — Actions manifest mapping paths to API endpoints
  - Must return `Access-Control-Allow-Origin: *` for GET and OPTIONS
  - Map `/api/actions/**` to `/api/actions/**`
- [ ] Install `@solana/actions` package for SDK helpers (`createPostResponse`, `createActionHeaders`, `ACTIONS_CORS_HEADERS`)

#### Action Endpoints (3 game actions as Blinks)
- [ ] `GET /api/actions/buy-keys` — Returns Action metadata:
  - Icon: game logo/banner image
  - Title: "FOMolt3D — Buy Keys" with live pot amount
  - Description: current pot, timer remaining, key price — creates urgency
  - Quick-buy buttons: "Buy 1 Key", "Buy 5 Keys", "Buy 10 Keys"
  - Custom amount input: number field with min=1
  - Each button href includes `?amount=N`
- [ ] `POST /api/actions/buy-keys?amount=N` — Builds and returns unsigned buy_keys transaction:
  - Reads `account` from POST body
  - Derives PDAs (GameState, PlayerState)
  - Builds Anchor instruction for `buy_keys`
  - Returns base64-encoded serialized transaction
  - Action chaining: after confirmation, show "Keys Purchased!" completion card with round stats
- [ ] `GET /api/actions/claim-dividends` — Returns Action metadata:
  - Shows pending dividends for the requesting user (if known, otherwise generic)
  - Single "Claim Dividends" button
- [ ] `POST /api/actions/claim-dividends` — Builds claim_dividends transaction
- [ ] `GET /api/actions/game-status` — Read-only Action:
  - Shows current pot, timer, last buyer, key price
  - Linked action: "Buy Keys" button that chains to the buy-keys Action
  - This is the **primary shareable Blink** — people share game status, viewers can immediately buy
- [ ] All Action endpoints handle OPTIONS for CORS preflight
- [ ] All Action endpoints return proper `Access-Control-Allow-*` headers

#### Dashboard Embedding (Dialect SDK)
- [ ] Install `@dialectlabs/blinks` package
- [ ] Create `BlinkCard.tsx` component using Dialect's `<Blink>` React component
- [ ] Embed "Buy Keys" Blink card on dashboard as an alternative to the custom BuyKeysForm
  - Use `stylePreset="x-dark"` or custom theme matching dashboard
  - Wrapped in WalletProvider context
- [ ] Add "Share on X" button that generates a shareable Blink URL:
  - Format: `https://dial.to/?action=solana-action:https://fomolt3d.xyz/api/actions/game-status`
  - Opens X compose window with pre-filled text + Blink URL

### Testing
- [ ] `GET /api/actions/buy-keys` returns valid ActionGetResponse (validate against spec)
- [ ] `POST /api/actions/buy-keys` with valid account returns base64-encoded transaction
- [ ] Transaction from POST is deserializable and has correct program instructions
- [ ] `actions.json` accessible at domain root with correct CORS headers
- [ ] Action validates at `https://www.blinks.xyz/inspector`
- [ ] Action renders at `https://dial.to/?action=solana-action:https://fomolt3d.xyz/api/actions/buy-keys`
- [ ] Embedded Blink card renders on dashboard and produces valid transactions
- [ ] "Share on X" button generates correct URL

### Phase 2.4b Completion Criteria
- [ ] `actions.json` served at domain root with correct rules and CORS
- [ ] 3 Action endpoints (buy-keys, claim-dividends, game-status) all conform to Actions spec
- [ ] Buy-keys Action has quick-buy buttons (1, 5, 10) AND custom amount input
- [ ] Game-status Action shows live pot/timer and chains to buy-keys
- [ ] All endpoints pass Blinks Inspector validation
- [ ] Blink card embedded on dashboard and functional
- [ ] "Share on X" button generates working Blink URL
- [ ] Commit via `git-workflow`

---

## Phase 2.5: Polish & Performance

> **Skill gate**: Invoke `success-criteria`. Invoke `react-best-practices` for performance audit. Invoke `ui-skills` for accessibility audit.

### Tasks
- [ ] Mobile responsive layout (test at 375px, 768px, 1024px, 1440px)
- [ ] Loading states: skeleton screens for all data-dependent components
- [ ] Error boundaries: wrap each major section (hero, feed, leaderboard, charts)
- [ ] SEO metadata in `layout.tsx`: title, description, OG tags
- [ ] OG image: auto-generated showing pot size and timer (for social sharing)
- [ ] Performance audit (`react-best-practices`):
  - [ ] No unnecessary re-renders (verify with React DevTools profiler)
  - [ ] API response caching (1-2s TTL via React Query)
  - [ ] Bundle size check: no oversized dependencies
  - [ ] Chart components lazy-loaded
- [ ] Accessibility audit (`ui-skills`):
  - [ ] Keyboard navigation for all interactive elements
  - [ ] Screen reader labels on timer, pot, leaderboard
  - [ ] Color contrast meets WCAG AA
  - [ ] Focus management on page transitions
- [ ] `code-simplifier` run on entire `app/src/` directory

### Phase 2.5 Completion Criteria
- [ ] Mobile: no horizontal scroll at 375px, all text readable, buttons tappable (44px min)
- [ ] Skeleton screens shown during data loading
- [ ] Error boundaries catch and display friendly errors
- [ ] OG image renders with live data
- [ ] `react-best-practices` audit: no critical performance issues
- [ ] `ui-skills` audit: no critical accessibility issues
- [ ] Page loads in < 2 seconds on 3G throttled connection (LCP)
- [ ] Commit via `git-workflow`

---

## WS2 Overall Success Criteria

- [ ] Dashboard loads and shows live game state within 2 seconds
- [ ] Timer countdown accurate to within 1 second of on-chain state
- [ ] Activity feed updates within 3 seconds of on-chain transaction
- [ ] Leaderboard accurately reflects current key holdings and dividends
- [ ] Agent profile pages show complete history for any address
- [ ] Bonding curve chart renders correctly and marks current price
- [ ] Human can connect wallet, buy keys, and claim dividends through the UI
- [ ] Mobile layout usable (no horizontal scrolling, readable, tappable)
- [ ] Spectator-only mode: everything viewable without wallet connection
- [ ] Solana Actions/Blinks: all 3 Action endpoints pass Blinks Inspector validation
- [ ] "Share on X" generates working Blink URL that unfurls game status with buy buttons
- [ ] Blink card embedded on dashboard as alternative buy interface
- [ ] `react-best-practices` audit passed
- [ ] `ui-skills` accessibility audit passed
- [ ] All commits via `git-workflow`

## Dependencies
- **WS1**: Deployed program + IDL (required by Phase 2.1)
- **WS3**: Shares API routes (coordinate implementation)

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| RPC rate limits on frequent polling | Use account subscriptions where possible, React Query cache (1-2s TTL), batch requests |
| Stale data due to Solana confirmation times | Show "confirming..." states, use `confirmed` commitment level |
| Large activity history for old rounds | Paginate API responses, lazy load historical data |
| SSE connection drops | Auto-reconnect with exponential backoff, show connection status indicator |
