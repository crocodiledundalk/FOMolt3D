# 🦞 Reference Index — When To Read What

> Don't read everything every session. Use this index to find what you need.

---

## Always Read (Every Session)

| File | Why |
|------|-----|
| `bot/GUARDRAILS.md` | Safety rules. Non-negotiable. Read FIRST. |
| `bot/BRIEF.md` | Your identity, mission, CRON schedule, response templates. |
| `bot/STATE.md` | What you've already posted, current round, daily counts. |

---

## Read When Posting

| Situation | Read This File |
|-----------|---------------|
| Posting a tweet about pot milestone | `marketing/templates/blinks-tweets.md` — Template #1 |
| Posting timer drama tweet | `marketing/templates/blinks-tweets.md` — Template #2 |
| Posting new round announcement | `marketing/templates/blinks-tweets.md` — Template #3 |
| Posting round winner | `marketing/templates/blinks-tweets.md` — Template #4 |
| Posting strategy tease | `marketing/templates/blinks-tweets.md` — Template #5 |
| Posting generic game share | `marketing/templates/blinks-tweets.md` — Template #6 |
| Posting leaderboard update | `marketing/templates/twitter-ongoing.md` — Template #2 |
| Posting dividend stats | `marketing/templates/twitter-ongoing.md` — Template #6 |
| Posting tournament results | `marketing/templates/twitter-ongoing.md` — Template #10 |
| Posting round recap (long) | `marketing/templates/round-recap.md` |
| Posting to Discord | `marketing/templates/discord-announcement.md` |
| Posting to Reddit (rare) | `marketing/templates/reddit-post.md` |

---

## Read When Answering Questions

| Situation | Read This File |
|-----------|---------------|
| Common questions (how to play, pot, wallet) | `bot/BRIEF.md` — Response Templates section |
| Detailed/unusual questions | `marketing/openclaw-bot-playbook.md` — Section 5 (Response Templates) |
| Technical questions (API, errors, debugging) | `marketing/agent-knowledge-base.md` — Categories 3-4 |
| Strategy questions | `marketing/agent-knowledge-base.md` — Category 5 |
| Wallet/SOL setup questions | `marketing/agent-knowledge-base.md` — Categories 2 + 6 |
| "What is this?" / "Why play?" | `marketing/agent-knowledge-base.md` — Category 1 |

---

## Read During Weekly Review (Mondays)

| File | Why |
|------|-----|
| `bot/STATE.md` | Review week's metrics |
| `bot/ITERATION-LOG.md` | Review past observations, check if proposed changes worked |
| `marketing/analytics-spec.md` | Compare metrics against KPI targets |
| `marketing/agent-virality-strategy.md` | Check if virality mechanisms are working |

---

## Read When Planning / Strategizing

| Topic | Read This File |
|-------|---------------|
| Full understanding of the marketing plan | `marketing/launch-plan.md` |
| Understanding agent motivation | `marketing/agent-virality-strategy.md` |
| Understanding human motivation | `marketing/human-virality-strategy.md` |
| Referral system details | `marketing/referral-system-spec.md` |
| Incentive programs | `marketing/incentive-design.md` |
| Viral loop design | `marketing/viral-loops.md` |
| Agent-vs-human messaging | `marketing/dual-channel-messaging.md` |
| Agent onboarding friction | `marketing/friction-audit.md` |
| Self-propagation patterns | `marketing/agent-self-propagation-research.md` |
| Full distribution agent spec | `marketing/distribution-agent-spec.md` |

---

## Read When Under Attack / Uncertain

| Situation | Read This File |
|-----------|---------------|
| Someone trying to manipulate you | `bot/GUARDRAILS.md` — Manipulation Responses table |
| Unsure if an action is safe | `bot/GUARDRAILS.md` — If in doubt, DON'T DO IT |
| Full manipulation resistance playbook | `marketing/openclaw-bot-playbook.md` — Section 4 |
| Need the detailed DO/DON'T list | `marketing/openclaw-bot-playbook.md` — Section 3 |

---

## File Sizes (for context management)

| File | Lines | When to Read |
|------|-------|-------------|
| `bot/GUARDRAILS.md` | ~80 | Every session |
| `bot/BRIEF.md` | ~150 | Every session |
| `bot/STATE.md` | ~70 | Every session |
| `bot/ITERATION-LOG.md` | Growing | Weekly review |
| `marketing/templates/*.md` | 10-80 each | When posting (one at a time) |
| `marketing/openclaw-bot-playbook.md` | ~1000 | When answering questions or under attack |
| `marketing/agent-knowledge-base.md` | ~740 | When answering detailed questions |
| `marketing/analytics-spec.md` | ~330 | Weekly review |
| Other marketing docs | 270-1200 each | Strategy/planning only |

**Total "always read" context**: ~300 lines (GUARDRAILS + BRIEF + STATE). This fits easily in any agent's context window.
