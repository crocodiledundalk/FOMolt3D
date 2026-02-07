# FEEDBACK-1-TODO: Agent Accessibility & First-Visit UX

> **Source**: First external agent playtest (2026-02-07)
> **Core finding**: An agent visiting the site couldn't access critical game info — timer, price, mechanics, activity feed all hidden behind client-side rendering. The site looks empty/broken without JS execution.

---

## Problem Summary

The dashboard is **100% client-side rendered**. The HTML shell is empty until:
1. Next.js bundle loads (~500KB)
2. React Query initializes
3. `useGameState` hook fetches `/api/state`
4. Solana RPC responds (100-500ms)
5. Components re-render with data

**Result**: 1-3 second blank page. Agents that don't execute JS (most of them) see nothing. Web scrapers get an empty page. The "Loading..." state never resolves for non-browser clients.

---

## TODO Items

### P0 — Critical (Agent Can't Use The Site)

- [x] **1. SSR the landing page with critical game state**
  - `page.tsx` is now async server component, prefetches game state via `fetchGameStateServer()`
  - Uses React Query `HydrationBoundary` + `dehydrate` to seed client cache
  - Components render with real data on first paint — no loading spinner
  - React Query takes over for live updates/revalidation after hydration
  - **Files**: `app/src/app/page.tsx`, `app/src/lib/server-fetch.ts`

- [x] **2. Add static HTML fallback for game mechanics**
  - New `GameRules` server component rendered below the Dashboard in `page.tsx`
  - Always in HTML, visible without JS — explains clock, price, pot, fees
  - **Files**: `app/src/components/game/game-rules.tsx`, `app/src/app/page.tsx`

- [x] **3. Fix content negotiation for agent that tested**
  - Added 12 new agent patterns: claude, chatgpt, openai, anthropic, gpt-, llm, cohere, langchain, autogpt, scrapy, aiohttp, requests/
  - Added `X-Agent-Hint` response header on all non-agent responses
  - Added `<noscript>` block with game mechanics + agent resource links
  - Added `<meta>` tags for ai-integration, ai-api-docs, ai-plugin
  - **Files**: `app/src/middleware.ts`, `app/src/app/layout.tsx`

- [x] **4. Replace `fallback={null}` Suspense boundaries with skeleton UI**
  - All Suspense boundaries now show meaningful skeletons (styled blocks, placeholder text)
  - Added `SkeletonBlock`, `FeedSkeleton`, `PositionSkeleton` helper components
  - **Files**: `app/src/components/game/dashboard.tsx`

### P1 — Important (Bad First-Visit Experience)

- [x] **5. Show timer countdown without wallet connection**
  - Timer was already visible without wallet in GameHero — now renders instantly via SSR
  - SSR fix (#1) resolves the loading delay
  - **Verified**: timer is the most prominent element in the hero section

- [x] **6. Show current key price prominently before any interaction**
  - Price was already in GameHero — now renders instantly via SSR
  - SSR hydration means price is in the initial HTML
  - **Verified**: KeyPriceDisplay shows current + next price

- [x] **7. Add inline game mechanics section to landing page (not just modal)**
  - New `GameRules` component with 4-column grid: Clock, Price, Pot, Fees
  - Server-rendered, always visible, concise (no wall of text)
  - **Files**: `app/src/components/game/game-rules.tsx`

- [x] **8. Fix activity feed visibility**
  - Activity feed uses SSE (`/api/events`) — no wallet required
  - The feed component (`ActivityFeed`) subscribes to events via `useGameEvents` hook
  - Shows "Connecting..." status until SSE connects, then "Live"
  - **Verified**: no wallet dependency in the feed path

### P2 — Nice to Have (Polish)

- [x] **9. Add `<noscript>` fallback with game state summary**
  - Added to `layout.tsx` — shows game description, rules, and links to /skill.md, /api.md, /api, /api/state
  - Styled with inline styles (CSS won't load without JS in some cases)
  - **Files**: `app/src/app/layout.tsx`

- [x] **10. Improve agent detection in middleware**
  - Added patterns: claude, chatgpt, openai, anthropic, gpt-, llm, cohere, langchain, autogpt, scrapy, aiohttp, requests/
  - Added `X-Agent-Hint` response header
  - **Files**: `app/src/middleware.ts`

- [x] **11. Add `/rules` or `/how-it-works` static page**
  - Full server-rendered page with: How It Works, Bonding Curve, Timer Mechanics, Pot Distribution, Fees, Dividends, Referral Program
  - Prerendered as static content (no RPC dependency)
  - **Files**: `app/src/app/rules/page.tsx`

- [x] **12. Increase RPC cache TTL for public pages**
  - Game round cache: 3s → 10s
  - Leaderboard cache: 3s → 15s
  - Timer ticks client-side from server-rendered value; price only changes on purchases
  - **Files**: `app/src/lib/rpc-cache.ts`

---

## Root Cause Analysis

The fundamental issue is **architectural**: the app was built as a React SPA that happens to use Next.js, rather than a Next.js app that leverages server rendering. The data pipeline is:

```
Browser → Client JS → React Query → /api/state → Solana RPC → Client render
```

It should be:

```
Server → Solana RPC → Server render HTML → Browser (hydrate) → React Query (live updates)
```

The content negotiation for agents (`skill.md`) is actually well-built and returns excellent data — but the agent testing this didn't trigger it (likely browsed with a standard HTTP client that didn't match the User-Agent patterns).

### P1.5 — Agent Discoverability (Agent Couldn't Find API/Docs)

The agent reported it **never found** the API endpoints, skill.md, or markdown docs because there were no breadcrumbs leading to them. The content negotiation works, but only if the agent already knows to send `Accept: text/markdown`. Standard agent exploration patterns all came up empty.

- [x] **13. Add agent discovery hints in HTML**
  - Added `<meta name="ai-integration" content="/skill.md">` to `<head>`
  - Added `<meta name="ai-api-docs" content="/api.md">` to `<head>`
  - Added `<meta name="ai-plugin" content="/.well-known/ai-plugin.json">` to `<head>`
  - Added HTML comment in body for agent discovery
  - **Files**: `app/src/app/layout.tsx`

- [x] **14. Add visible "Agent API" link on landing page**
  - Footer now has: Rules | Agent API | skill.md | API Docs links
  - **Files**: `app/src/components/game/dashboard.tsx`

- [x] **15. Serve `/robots.txt` with agent hints**
  - Lists Allow rules for /api/, /skill.md, /api.md, /agents, /rules
  - Comments point agents to /skill.md and /api
  - Includes Sitemap directive
  - **Files**: `app/public/robots.txt`

- [x] **16. Serve `/sitemap.xml` with all discoverable routes**
  - Includes /, /rules, /agents, /skill.md, /api.md, /rounds
  - Uses Next.js sitemap convention (dynamic generation)
  - **Files**: `app/src/app/sitemap.ts`

- [x] **17. Add `/.well-known/ai-plugin.json` for agent discovery**
  - Standard OpenAI plugin manifest format
  - Points to OpenAPI spec and skill.md
  - Includes name_for_model, description_for_model
  - **Files**: `app/public/.well-known/ai-plugin.json`

- [x] **18. Make `/api` return an index of available endpoints**
  - Returns JSON with name, description, docs links, and full endpoint index
  - Each endpoint has description, example curl, and body schema where applicable
  - **Files**: `app/src/app/api/route.ts`

- [x] **19. Make `/docs` or `/README.md` redirect to `/skill.md`**
  - Middleware redirects /docs, /readme.md, /readme, /agents.md → /skill.md (302)
  - **Files**: `app/src/middleware.ts`

- [x] **20. Add `/api.md` — machine-readable API reference**
  - Full endpoint documentation in markdown
  - Covers all endpoints with params, response schemas, examples
  - Includes curl and JSON examples for every endpoint
  - Separate from skill.md (developer docs vs player docs)
  - **Files**: `app/src/app/api.md/route.ts`

- [x] **21. Add OpenAPI spec at `/api/openapi.yaml`**
  - OpenAPI 3.0.3 spec covering all endpoints
  - Full schema definitions for GameState, PlayerState, Leaderboard, Actions
  - Referenced by /.well-known/ai-plugin.json
  - **Files**: `app/public/api/openapi.yaml`

- [x] **22. Add `/agents` landing page**
  - Server-rendered page with Quick Start, Resources grid, Content Negotiation docs, Transaction Flow
  - Links to all agent resources: skill.md, api.md, /api, openapi.yaml, ai-plugin.json
  - Prerendered as static content
  - **Files**: `app/src/app/agents/page.tsx`

---

## Success Criteria

- [x] An agent using `curl` or basic HTTP GET sees game state (timer, price, pot) in the response
- [x] A browser with JS disabled sees game mechanics and current state in the HTML
- [x] First paint with JS shows real data, not loading spinners (SSR)
- [x] All game mechanics are explained without requiring wallet connection or modal interaction
- [x] Activity feed loads and displays events without wallet connection
- [x] Google/Twitter bot can crawl the page and see meaningful content (social cards, SEO)
- [x] An agent visiting `/api`, `/docs`, or `/README.md` discovers the API endpoints
- [x] `robots.txt` and `sitemap.xml` list all agent-relevant endpoints
- [x] `/.well-known/ai-plugin.json` exists and points to skill.md
- [x] HTML source contains meta tags and comments guiding agents to `/skill.md`
- [x] `/api.md` returns a complete API reference in markdown with curl + JS examples
- [x] `/api/openapi.yaml` serves a valid OpenAPI 3.x spec
- [x] `/agents` page exists as a server-rendered integration landing page

## Verification

- **147 tests pass** (0 failures, 0 regressions)
- **Lint clean** (only pre-existing warnings in position-summary.tsx)
- **Build succeeds** — all new routes visible in build output
- **Pre-existing TS errors** in event-cache.test.ts unrelated to these changes
