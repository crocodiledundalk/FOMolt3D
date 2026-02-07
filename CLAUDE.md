# FOMolt3D — CLAUDE.md

> AI-agent-first FOMO3D game theory experiment on Solana.
> Last buyer when the countdown expires wins 48% of the pot.
> Agents are the primary players; humans are spectators who can participate.

---

## Project Overview

FOMolt3D reimplements the FOMO3D game on Solana with a dual-interface architecture:
- **Agents** receive clean Markdown via `Accept: text/markdown` content negotiation
- **Browsers** receive an interactive Next.js dashboard
- **Blinks** expose game actions as shareable Solana Actions URLs

The game uses a bonding curve (`price = 0.01 + 0.001 * total_keys_sold` SOL), a 24-hour countdown timer (+30s per buy, capped at 24h), and distributes each purchase as 48% pot / 45% dividends / 7% next-round carry.

### Workstreams

| WS | Scope | Key Tech |
|----|-------|----------|
| WS1 | Solana Program | Anchor (latest), Rust, PDAs, LiteSVM |
| WS2 | Human Dashboard | Next.js, React, TailwindCSS, Recharts |
| WS3 | Agentic Interface | skill.md, content negotiation, Solana Blinks |
| WS4 | Marketing & Distribution | Research docs, content templates |

### Key Documents

| Document | Purpose |
|----------|---------|
| `RESEARCH.md` | Complete game spec, bonding curve math, dividend formulas, error codes |
| `MARKETING.md` | GTM strategy, distribution channels, growth mechanics |
| `plans/OVERVIEW.md` | Workstream dependencies and milestone definitions |
| `plans/WS1-solana-program.md` | Smart contract phases and tasks |
| `plans/WS2-human-dapp.md` | Dashboard UI phases and tasks |
| `plans/WS3-agentic-interface.md` | Agent-first interface phases and tasks |
| `plans/WS4-marketing-distribution.md` | Marketing deliverables and launch plan |

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `LESSONS.md` with the pattern
- Write rules that prevent the same mistake recurring
- Review lessons at session start

### 4. RALPH Validation (Mandatory)
- **Every non-trivial task MUST use the `ralph-validation` skill** (Retry And Loop for Perfection and Healing)
- Define explicit, verifiable success criteria BEFORE starting implementation
- Iterate until ALL criteria genuinely pass — no partial credit
- Set iteration limits: small (~5 attempts), medium (~10), large (~20)
- If hitting the limit without resolution, escalate as a blocker
- RALPH loops are the final gate before any task is marked complete

### 5. Verification Before Done
- Never mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness
- Ask yourself: "Would a staff engineer approve this?"

### 6. Efficient Context Management
- Use targeted searches over loading full documents
- Offload research to subagents to keep the main context clean

---

## Technology Stack

### Solana Program (WS1)

| Technology | Version | Notes |
|-----------|---------|-------|
| **Anchor** | Latest stable | Primary framework — always use the latest version |
| Rust | stable toolchain | `cargo clippy --workspace -- -D warnings` must pass |
| Solana CLI | Latest stable | devnet for testing, mainnet for production |
| **LiteSVM** | Latest | **Mandatory** for all integration tests — no Bankrun, no solana-test-validator |

### Frontend (WS2 + WS3)

| Technology | Version | Notes |
|-----------|---------|-------|
| **Next.js** | 15.x (App Router) | Server components by default, client only when needed |
| React | 19.x | Follow `react-best-practices` skill strictly |
| TypeScript | 5.x | Strict mode, no `any` types |
| TailwindCSS | 4.x | Utility-first, follow `ui-skills` constraints |
| Recharts | Latest | Game charts: pot size, key price, timer, dividends |
| **@solana/kit** | Latest | Primary client SDK for all new Solana client code |
| **@coral-xyz/anchor** | Latest | Anchor client bindings for program interaction |
| **Solana Actions / Blinks** | Latest spec | Transaction construction and sharing (see below) |

### Solana Blinks & Actions (WS3)

Solana Blinks (Blockchain Links) are a **mandatory** part of our transaction construction and agent interface:

- **All game actions** (buy keys, claim dividends, claim winner prize) MUST be exposed as Solana Actions endpoints
- Actions endpoints live at `/api/actions/*` and return `ActionGetResponse` / `ActionPostResponse` payloads
- Blinks allow any agent, wallet, or social platform to construct and execute transactions via a simple URL
- The `actions.json` file MUST be served at the domain root for Blink discovery
- Transaction construction in Actions endpoints MUST use `@solana/kit` for building transactions
- Blinks are the **primary mechanism** agents use to interact with the game — the skill.md references Blink URLs, not raw RPC calls
- Human users can also share Blinks on social media to drive participation

**Implementation requirements:**
- `GET /api/actions/buy-keys` — returns action metadata (label, description, parameters for key amount)
- `POST /api/actions/buy-keys` — accepts `{ account: string }` + params, returns serialized unsigned transaction
- `GET /api/actions/claim-dividends` — returns action metadata
- `POST /api/actions/claim-dividends` — returns serialized unsigned transaction
- `GET /api/actions/claim-winner` — returns action metadata
- `POST /api/actions/claim-winner` — returns serialized unsigned transaction
- All endpoints follow the [Solana Actions specification](https://solana.com/docs/advanced/actions)
- Include proper CORS headers and `X-Action-Version` / `X-Blockchain-Ids` response headers

---

## Mandatory Skill Usage

Skills in `.claude/skills/` are **binding instructions**, not optional references. Ignoring an available skill is the same as ignoring this file.

### Skill Mapping

| Skill | MUST Use When |
|-------|---------------|
| `solana-program-development` | Writing or modifying ANY Solana program code (Anchor) |
| `solana-dev-skill` | All Solana client code, RPC interactions, wallet connections |
| `solana-frontend` | All frontend wallet auth, transaction construction, data fetching |
| `litesvm` | ALL Solana program integration tests — this is the only test runtime |
| `solana-unit-testing` | Unit testing math, validation logic, serialization |
| `solana-security` | Security audits of program code — run on EVERY instruction |
| `blueshift-security` | Secondary security audit using Blueshift vulnerability patterns |
| `react-best-practices` | ALL React component work — 40+ rules across 8 categories |
| `ui-skills` | ALL UI/interface work — accessibility, performance, animation |
| `ralph-validation` | EVERY non-trivial task — the mandatory validation loop |
| `git-workflow` | EVERY commit — atomic commits, testing gates, quality summaries |
| `success-criteria` | EVERY task start — define explicit pass/fail criteria upfront |
| `gap-learning` | After ANY failure or correction — capture and prevent recurrence |
| `code-simplifier` | After completing features — simplify recently modified code |
| `context-management` | When context window is filling — compact and delegate |
| `subagent-orchestration` | When parallelization would improve throughput |
| `todo-management` | Task discovery, decomposition, and priority tracking |
| `repo-structure` | After creating or modifying any resource |
| `repo-docs-sync` | After changes to skills, commands, templates, or guides |

### Workflow-Triggered Skills

| Moment | Invoke Skill | Purpose |
|--------|-------------|---------|
| Task start | `success-criteria` + relevant domain skill(s) | Define acceptance criteria, load patterns |
| Solana program changes | `solana-security` + `blueshift-security` | Dual-layer security audit |
| Writing tests | `litesvm` + `solana-unit-testing` | Correct test infrastructure |
| Frontend work | `react-best-practices` + `ui-skills` + `solana-frontend` | Performance, accessibility, wallet integration |
| Transaction construction | `solana-dev-skill` + Blinks spec | Use Actions/Blinks pattern |
| Validation/QA | `ralph-validation` | RALPH loop until all criteria pass |
| Committing | `git-workflow` | Atomic commits, conventional messages, test gate |
| After corrections | `gap-learning` | Document what went wrong |
| After completion | `code-simplifier` | Simplify and refine |

---

## Security Requirements

Security is paramount — this is a financial game handling real SOL.

### Dual-Layer Auditing (Mandatory)

Every Solana program instruction MUST pass **both** audit layers before being considered complete:

1. **`solana-security` skill** — Primary audit for common Solana vulnerabilities:
   - Missing signer checks
   - Missing owner checks
   - Arithmetic overflow/underflow
   - PDA seed collisions
   - Reinitialization attacks
   - Unauthorized CPI calls
   - Rent/lamport drain attacks

2. **`blueshift-security` skill** — Secondary audit using Blueshift patterns:
   - Known exploit patterns from historical Solana attacks
   - Anchor-specific vulnerability checks
   - Economic exploit vectors (frontrunning, sandwich attacks)
   - Cross-program invocation safety

### Security Rules
- ALL arithmetic MUST use checked math (`checked_add`, `checked_mul`, etc.) — no silent overflow
- ALL PDAs MUST include proper bump seeds and validation
- ALL accounts MUST have owner and signer checks as appropriate
- The bonding curve and dividend math MUST have dedicated fuzz tests
- Timer manipulation resistance MUST be verified (clock sysvar vs. block timestamps)
- NEVER store private keys or secrets in code, config, or environment files committed to git

---

## Testing Strategy

### Solana Program Tests

| Layer | Tool | What It Covers |
|-------|------|----------------|
| Unit tests | `cargo test` | Math functions, bonding curve, dividend calculation, serialization |
| Integration tests | **LiteSVM** (mandatory) | Full instruction execution, account state changes, error conditions |
| Security tests | `solana-security` + `blueshift-security` | Vulnerability scanning per instruction |
| Fuzz tests | `cargo-fuzz` or equivalent | Bonding curve edge cases, overflow conditions |

**LiteSVM is the ONLY acceptable integration test runtime.** Do not use `solana-test-validator`, Bankrun, or manual RPC testing for automated tests.

### Frontend Tests

| Layer | Tool | What It Covers |
|-------|------|----------------|
| Component tests | Vitest + React Testing Library | UI rendering, interaction, accessibility |
| Integration tests | Playwright (via `playwright-skill`) | Full user flows, wallet connection, transaction submission |
| API tests | Vitest | Actions/Blinks endpoints, content negotiation |

### Pre-Commit Checks (ALL must pass)

```
cargo clippy --workspace -- -D warnings
cargo test --workspace
cargo fmt --all -- --check
npm run lint          (frontend)
npm run typecheck     (frontend)
npm test              (frontend)
```

### Coverage Targets

| Area | Minimum | Notes |
|------|---------|-------|
| Bonding curve math | 95% | Financial logic — near-complete coverage required |
| Program instructions | 90% | Every instruction, happy path + error cases |
| Dividend distribution | 95% | Financial logic — edge cases matter |
| API routes / Blinks | 85% | All action endpoints, error responses |
| React components | 75% | Interaction tests, not snapshot-only |
| Content negotiation | 90% | Agent vs. browser path must be tested |

---

## Git & GitHub Best Practices (Mandatory)

The `git-workflow` skill MUST be invoked for every commit. Additionally:

### Commit Conventions
- **Atomic commits**: one logical change per commit
- **Conventional messages**: `type(scope): description`
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `security`
  - Scopes: `program`, `frontend`, `actions`, `blinks`, `agent`, `marketing`
  - Example: `feat(program): implement bonding curve key purchase instruction`
- **Test gate**: full test suite MUST pass before any commit — no `--no-verify`
- **Documentation sync**: when code structure changes, update related docs

### Branch Strategy
- `main` — stable, tested, deployable
- `feat/*` — feature branches off main
- `fix/*` — bug fix branches
- `security/*` — security audit fixes
- PRs require passing CI and at least one review pass (human or RALPH)

### Rules
- NEVER force-push to `main`
- NEVER commit failing tests, linter errors, or debug artifacts
- NEVER commit secrets, keys, or `.env` files
- ALL PRs must include a test plan in the description
- Use `git-workflow` skill for quality summaries on every commit

---

## Roadmap & Task Tracking

```
Master roadmap:     plans/OVERVIEW.md        (workstream dependencies and milestones)
Phase plans:        plans/WS{N}-*.md         (detailed task breakdowns per workstream)
Active TODO:        tasks/TODO.md            (current sprint items with checkboxes)
Lessons learned:    LESSONS.md               (updated after every correction)
Blockers:           BLOCKERS.md              (uncertainties requiring human input)
```

**Rules:**
- Work through TODO items top-to-bottom — do NOT skip or reorder without human approval
- Mark items `[x]` as delivered AND validated (via RALPH loop), not just "code written"
- When a milestone completes, mark it done in `plans/OVERVIEW.md` with the commit hash
- Respect workstream dependencies: WS1 phases 1.1-1.6 block WS2 and WS3

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary.
- **Agents First**: The primary user is an AI agent, not a human. Optimize for machine-readability.
- **Security Always**: This handles real SOL. Dual-audit everything. No shortcuts.
- **Blinks Everywhere**: All game actions are Solana Actions. Blinks are the universal transaction interface.

---

## What NOT to Do

- Do NOT start coding without reading relevant docs, plans, skills, and existing code
- Do NOT skip tests or consider "I'll add tests later" acceptable
- Do NOT commit code that fails tests or linters
- Do NOT mark items complete without a passing RALPH validation loop
- Do NOT silently make architectural decisions — document blockers and ask
- Do NOT use `solana-test-validator` or Bankrun — LiteSVM is the only integration test runtime
- Do NOT build transaction construction without Solana Actions/Blinks endpoints
- Do NOT write frontend code without consulting `react-best-practices` and `ui-skills`
- Do NOT modify Solana program code without running both `solana-security` and `blueshift-security`
- Do NOT introduce technologies not listed in the stack table without creating a blocker first
- Do NOT spin endlessly on a problem — escalate after hitting RALPH iteration limits
- Do NOT ignore feedback from reviews, validation, or security audits
- Do NOT use `@solana/web3.js` for new code — use `@solana/kit` (with `@solana/web3-compat` only for legacy dependencies)
