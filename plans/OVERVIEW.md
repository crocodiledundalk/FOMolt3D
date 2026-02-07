# FOMolt3D — Implementation Plan Overview

> Last updated: 2026-02-06

## Workstreams

| # | Workstream | Plan File | Status |
|---|-----------|-----------|--------|
| 1 | [Solana Program](./WS1-solana-program.md) | `WS1-solana-program.md` | **Deployed to devnet** — 235 tests pass |
| 2 | [Human Dapp](./WS2-human-dapp.md) | `WS2-human-dapp.md` | **~90% complete** — polish items remain (Blink embed, OG image, a11y, mobile QA) |
| 3 | [Agentic Interface](./WS3-agentic-interface.md) | `WS3-agentic-interface.md` | **~85% complete** — minor features + E2E blocked by deploy |
| 4 | [Marketing & Distribution](./WS4-marketing-distribution.md) | `WS4-marketing-distribution.md` | **Complete** — all 14 deliverables written |

## Critical Milestones

- [x] **M1**: Solana program compiles and all instructions pass LiteSVM integration tests
- [x] **M2**: Both security audits (`solana-security` + `blueshift-security`) pass with no critical/high findings
- [x] **M3**: Program deployed to devnet with exported IDL (2026-02-06, admin: `64hiasuUgsj7boSGjCayC7WWNyjLC4KqZmNbx1xXZTzp`)
- [x] **M4**: skill.md live with real game data, all API endpoints functional *(code complete, needs deployed program for live data)*
- [ ] **M5**: Dashboard showing live spectator experience with embedded Blinks *(Blink embed + Share button remaining)*
- [ ] **M5b**: Solana Actions registered at Dialect registry, Blinks unfurling on X/Twitter *(blocked by M3)*
- [ ] **M6**: Full agent flow tested end-to-end (discover -> buy -> claim -> refer) *(blocked by M3)*
- [x] **M7**: All WS4 deliverables complete and reviewed
- [ ] **M8**: FOMolt3D distribution agent deployed and auto-posting to X *(spec complete, implementation pending)*

## What's Next

1. **Fix audit findings** (P0.5) — leaderboard bug, claim UIs, missing Blink endpoint
2. **Dashboard polish** (M5) — Blink card embed, Share on X, OG image, mobile QA, a11y
3. **Agentic gaps** — referral rate limiting, price trajectory, Actions in skill.md
4. **E2E testing** (M6) — full agent flow against deployed program
5. **Bot implementation** (M8) — build from spec in `marketing/distribution-agent-spec.md`

## Consolidated TODO

See [`TODO.md`](../TODO.md) for the full prioritized remaining work list.
