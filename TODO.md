# FOMolt3D — Consolidated TODO

> Last updated: 2026-02-07 (all P0.5-P4 items completed)
> Program ID: `EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw`

---

## Status Summary

| Workstream | Status | Tests |
|------------|--------|-------|
| WS1: Solana Program | **Deployed to devnet** | 235 pass (127 unit + 108 integration) |
| WS2: Human Dashboard | **Complete** — all features implemented | 112 pass (10 test files) |
| WS3: Agentic Interface | **Complete** — all features implemented | Covered by WS2 tests |
| WS4: Marketing | **Complete** — all 14 deliverables written | N/A (documents) |
| Bot | **Spec complete** — playbook + guardrails written | N/A (not yet built) |

---

## Remaining Work — Ordered by Priority

### P0: Deployment — DONE

- [x] **Deploy program to devnet** (2026-02-06)
  - Program: `EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw`
  - GlobalConfig created, Round 1 initialized and active
  - Deployer/admin: `64hiasuUgsj7boSGjCayC7WWNyjLC4KqZmNbx1xXZTzp`
  - Config script: `app/scripts/configure-devnet.ts`

### P0.5: Blind Agent Test Findings — ALL FIXED (2026-02-07)

#### Bugs — ALL FIXED

- [x] **Referrer leaderboard logic is backwards** — Fixed: groups by `referrer` field, counts distinct referred players, merges with earnings
- [x] **skill.md leaderboard is incomplete** — Fixed: `topReferrers` populated, `dividendEarners` sorted by `estimateDividend()`, all 3 tables shown
- [x] **Raw JS errors leak in Blinks POST error responses** — Fixed: safe JSON parsing with try/catch, clean 400 messages for all error cases
- [x] **Blinks API returns HTML 404 on cold route** — Fixed: `export const dynamic = "force-dynamic"` on all action routes
- [x] **`actions.json` is missing endpoints** — Fixed: created `app/public/actions.json` with all 4 action paths, removed `game-status`
- [x] **Missing amount parameter undocumented** — Fixed: documented in skill.md API Reference (Option A)
- [x] **Content negotiation empty for sub-pages** — Fixed: middleware rewrites `/rounds`, `/round/*`, `/agent/*` to API endpoints for agent requests (Option A)
- [x] **`/dashboard` returns 404** — Fixed: middleware returns 301 redirect to `/`

#### Referral `?ref=` Flow — ALL FIXED

- [x] **Human flow: Read `?ref=` from URL and persist in localStorage** — Created `ReferralCapture` component, `BuyKeysForm` reads from localStorage when no on-chain referrer
- [x] **Blinks endpoint: Read `?ref=` from URL query params** — GET threads `?ref=` into action hrefs, POST passes referrer to `buildSmartBuy()`
- [x] **Agentic flow: Embed `?ref=` value into skill.md content** — skill.md route accepts `?ref=`, shows referrer note and pre-fills examples

#### Missing Human UI — Claim Flows — ALL DONE

- [x] **Add claim dividends UI** — `ClaimPanel` component shows "Harvest Scraps" button when round ended + player has dividends
- [x] **Add claim winner prize UI** — `ClaimPanel` shows prominent "You Won!" panel when wallet is lastBuyer
- [x] **Wire up claim referral earnings button** — Button in `referral-cta.tsx` now enabled, submits `claim_referral_earnings` instruction

#### Missing Blink Action — DONE

- [x] **Add `/api/actions/claim-referral-earnings` Blink endpoint** — Full GET/POST with error handling, CORS headers, skill.md updated

#### Minor — DONE

- [x] **Document buy-keys max amount in skill.md** — Added to API Reference section

### P1: Post-Deployment Verification

These require a running devnet deployment + public URL:

- [ ] **E2E agent flow test** (WS3 Phase 3.5)
  - Full 7-step flow: fetch skill.md → parse URLs → GET /api/state → POST buy → verify on-chain → GET player → POST claim
  - Referral flow: create referral → agent B fetches skill.md?ref=A → B buys with referrer → A earns
  - Error handling: expired timer, invalid pubkey, zero balance, nonexistent player
  - **Files to create**: `app/src/test/e2e/agent-flow.test.ts`

- [ ] **Blinks Inspector validation** (WS2 Phase 2.4b)
  - Validate all 4 Action endpoints at `https://www.blinks.xyz/inspector`
  - Requires public URL (deploy app or use ngrok)
  - Register at `https://dial.to/register` for trusted rendering on X/Twitter

### P2: Dashboard Polish — MOSTLY DONE

- [x] **Embed Blink card on dashboard** — `BlinkCard` component with `@dialectlabs/blinks`, `stylePreset="x-dark"`
- [x] **"Share on X" button** — `ShareButton` component with dial.to Blink URL, added to dashboard header
- [x] **OG image generation** — `app/src/app/api/og/route.tsx` with dynamic pot/timer/price, meta tags in layout.tsx

Remaining (require manual testing in browser):
- [ ] **Mobile QA** — Test at 375px, 768px, 1024px, 1440px
- [ ] **Accessibility audit** — Keyboard nav, screen reader labels, color contrast
- [ ] **Performance audit** — Re-renders, bundle size, lazy loading, LCP

### P3: Agentic Interface Gaps — ALL DONE

- [x] **Referral rate limiting** — 10 per address per hour, 429 response with Retry-After header
- [x] **Off-chain referral tracking** — In-memory store tracking creation, visits, conversions
- [x] **Price trajectory in skill.md** — "Claw price was X SOL an hour ago, now Y SOL"
- [x] **Pot momentum display** — "Pot grew by X SOL in the last hour"
- [x] **Actions endpoints in skill.md Quick Start** — All 4 Blink endpoints documented in API Reference

### P4: Tech Debt — MOSTLY DONE

- [x] **Legacy `/api/tx/` stubs** — Kept functional with `_deprecated` field pointing to Blinks endpoints
- [x] **Anchor client version alignment** — Verified: `^0.31.1` client is compatible with 0.32.1 IDL format (112 tests pass)
- [x] **Admin authorization** — Already implemented: `useAdmin()` hook checks on-chain config.admin

Remaining (low priority, functional as-is):
- [ ] **@solana/web3.js → @solana/kit migration** — App has 23 imports of web3.js; not urgent

### P5: Bot Implementation (Post-Launch)

- [ ] **Build distribution agent** — Blocked by X API account setup

---

## Completed Work (Reference)

### WS1: Solana Program — DONE
- [x] Phase 1.1: Project scaffolding
- [x] Phase 1.2: Account structures (GlobalConfig, GameState, PlayerState)
- [x] Phase 1.3: Core instructions (6 instructions, register_player merged into buy_keys)
- [x] Phase 1.4: Security hardening (dual audit: solana-security + blueshift-security)
- [x] Phase 1.5: Testing (127 unit + 108 integration = 235 tests)
- [x] Phase 1.6: Deployed to devnet (2026-02-06), config script at `app/scripts/configure-devnet.ts`

### WS2: Human Dashboard — DONE
- [x] Phase 2.1: Project setup & API layer (12 routes, full SDK)
- [x] Phase 2.2: Spectator dashboard (22 components, 7 hooks, charts)
- [x] Phase 2.3: Agent profiles & round history (3 pages)
- [x] Phase 2.4: Human participation (wallet connect, buy form, claim dividends, claim winner, claim referral)
- [x] Phase 2.4b: Blinks integration (4 action endpoints, Blink card on dashboard, Share on X button)
- [x] Phase 2.5: OG image generation, meta tags (mobile QA / a11y / perf are manual verification)

### WS3: Agentic Interface — DONE
- [x] Phase 3.1: skill.md (full template, 10+ sections, referral param, price trajectory, pot momentum)
- [x] Phase 3.2: Content negotiation middleware (/, /skill.md, /rounds, /round/*, /agent/*, /dashboard)
- [x] Phase 3.3: Referral system (endpoint, rate limiting, tracking, ?ref= in all flows)
- [x] Phase 3.4: FOMO mechanics (phase-aware, price trajectory, pot momentum)
- [x] Phase 3.4b: Blinks in skill.md (all 4 endpoints documented in API Reference + Quick Start)

### WS4: Marketing — DONE
- [x] Phase 4.1: Friction audit (`marketing/friction-audit.md`)
- [x] Phase 4.2: Referral system spec (`marketing/referral-system-spec.md`)
- [x] Phase 4.3: Launch plan (`marketing/launch-plan.md`)
- [x] Phase 4.4: Viral loops (`marketing/viral-loops.md`)
- [x] Phase 4.4b: Self-propagation research (`marketing/agent-self-propagation-research.md`)
- [x] Phase 4.5: Incentive design (`marketing/incentive-design.md`)
- [x] Phase 4.6: Content templates (9/9 in `marketing/templates/`)
- [x] Phase 4.7: Analytics spec (`marketing/analytics-spec.md`)
- [x] Phase 4.8: Dual-channel messaging (`marketing/dual-channel-messaging.md`)
- [x] Phase 4.9: Distribution agent spec (`marketing/distribution-agent-spec.md`)
- [x] Phase 4.10: OpenClaw bot playbook (`marketing/openclaw-bot-playbook.md`)
- [x] Phase 4.11: Agent knowledge base (`marketing/agent-knowledge-base.md`)
- [x] Phase 4.12: Agent virality strategy (`marketing/agent-virality-strategy.md`)
- [x] Phase 4.13: Human virality strategy (`marketing/human-virality-strategy.md`)

### Bot Spec — DONE
- [x] BRIEF.md, GUARDRAILS.md, STATE.md, REFERENCE.md, ITERATION-LOG.md
