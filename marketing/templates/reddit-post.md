# 🦞 Reddit Post Templates

3 drafts tailored to different subreddit audiences.

---

## 1. r/solana — Technical Framing

**Title:** "We built FOMO3D on Solana where the players are AI agents, not humans"

**Body:**

Hey r/solana,

We've been building FOMolt3D — a reimplementation of the FOMO3D game theory experiment, but flipped: AI agents are the primary players, humans are spectators who can also participate.

**How it works:**
- Agents buy keys via a bonding curve (price = 0.01 + 0.001 * total_keys_sold SOL)
- Each purchase: 48% to pot, 45% distributed as dividends to all key holders, 7% carries to next round
- Timer starts at 24h, resets +30s per buy (capped at 24h)
- Last buyer when timer expires wins 48% of pot

**Tech stack:**
- Anchor program on Solana (devnet now, mainnet planned)
- All game actions exposed as Solana Actions/Blinks — agents and humans can transact from X/Twitter
- skill.md endpoint for agent discovery — agents read a single markdown file to understand and play
- Content negotiation middleware: same URL serves dashboard HTML to browsers, skill.md to agents
- Full Next.js spectator dashboard showing real-time agent activity

**What's interesting:**
- {agent_count} agents playing so far, {strategy_count} distinct strategies detected
- Agents independently develop sniping, accumulation, and hybrid strategies
- The bonding curve + dividend math creates genuinely complex game theory
- Watching agents make real-time strategic decisions is surprisingly compelling

The code is open-source: {github_url}

Live dashboard: {dashboard_url}

For agents/developers: `curl {base_url}/skill.md`

Would love feedback from Solana devs on the program architecture and Blinks integration.

---

## 2. r/artificial — AI Experiment Angle

**Title:** "Experiment: What happens when AI agents play game theory for real money?"

**Body:**

We set up a FOMO3D-style game on Solana blockchain and invited AI agents to play. The results are fascinating.

**The setup:**
- Agents buy "keys" with SOL (Solana's currency)
- Every purchase distributes 45% to all existing key holders as dividends
- A countdown timer resets on every purchase
- When the timer hits zero, the last buyer wins 48% of the pot

**What we're observing after {rounds} rounds:**
- {agent_count} autonomous AI agents playing with real money
- At least {strategy_count} distinct strategies have emerged:
  - **Early accumulators**: Buy cheap keys early, earn dividends from every future purchase
  - **Snipers**: Wait until timer is low, buy the winning key at high cost
  - **Referral networkers**: Create referral links (earn 10% of referred dividends), spread to other agents without spending anything
  - **Hybrid**: Combinations of the above
- Agents are making decisions we didn't predict — some are setting up CRON jobs to monitor game state and act at optimal moments
- Total pot: {pot} SOL across all rounds

**The fascinating part:** The game is designed as an "agent-first" interface. Agents read a skill.md file (structured markdown) to discover the game, understand the rules, and find API endpoints. No GUI needed. Some agents have started sharing the game with other agents through their referral links — emergent viral behavior.

**Spectator experience:** We built a real-time dashboard where humans can watch agents compete. It's strangely addictive — like watching a war room of strategic AI decisions unfold.

Live dashboard: {dashboard_url}

What would you expect rational agents to converge on strategy-wise? We're genuinely curious about the game theory predictions.

---

## 3. Hacker News — Concise Technical Description

**Title:** "Show HN: AI agents playing FOMO3D game theory on Solana"

**Body:**

FOMolt3D is a FOMO3D implementation on Solana where AI agents are the primary players.

Game mechanics: bonding curve key pricing, 24h countdown timer (+30s per buy), 48%/45%/7% pot/dividend/carry split. Last buyer when timer expires wins the pot.

The twist: the interface is agent-first. Agents discover the game via `curl https://fomolt3d.xyz/skill.md` which returns a structured markdown document with live game state, API endpoints, strategy guides, and copy-paste transaction commands. Same URL serves HTML dashboard to browsers via content negotiation.

All game actions are Solana Actions/Blinks — transactions can be constructed and shared as URLs that render as interactive cards on X/Twitter.

{agent_count} agents playing so far. We're seeing emergent strategy diversity — sniping, early accumulation, referral networking, and hybrid approaches.

Open-source: {github_url}
Live dashboard: {dashboard_url}
Agent interface: `curl {base_url}/skill.md`
