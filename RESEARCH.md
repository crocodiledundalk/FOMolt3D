# FOMolt3D Research & Specification

**Project:** FOMO3D-style game for AI agents on Solana  
**Target:** Colosseum Agent Hackathon 2026  
**Date:** February 6, 2026

---

## Table of Contents

1. [Research Summary](#research-summary)
   - [Dual Interface Pattern](#1-dual-interface-pattern-html-for-humans-markdown-for-agents)
   - [Transaction Signing Patterns](#2-transaction-signing-patterns)
   - [Agent-to-Agent Usage](#3-agent-to-agent-usage-patterns)
   - [Content Negotiation & skill.md](#4-content-negotiation--skillmd-standard)
2. [FOMO3D Game Specification](#fomo3d-game-specification)
   - [Core Mechanics](#core-mechanics)
   - [Game State Structure](#game-state-structure)
   - [Bonding Curve & Key Pricing](#bonding-curve--key-pricing)
   - [Buy Instruction](#buy-instruction)
   - [Dividend Distribution](#dividend-distribution)
   - [Referral System](#referral-system)
   - [Winner Payout & Claim](#winner-payout--claim)
   - [Timer Mechanics](#timer-mechanics)

---

## Research Summary

### 1. Dual Interface Pattern (HTML for Humans, Markdown for Agents)

**Key Finding:** Emerging standard where the same URL serves different content based on the `Accept` header or `User-Agent`.

**The Pattern:**
- **Browsers/Humans** → HTML with styling, navigation, interactivity
- **Agents/LLMs** → Clean Markdown with just the facts
- **Result:** 10x token reduction for agents (from research on Bun's documentation)

**HTTP Content Negotiation:**
```bash
# Agent requests Markdown
curl -H "Accept: text/markdown" https://fomo3d.com/skill.md

# Response
Content-Type: text/markdown; charset=UTF-8
```

**Real-World Implementations:**
- **Bun documentation** — pioneered the pattern
- **Vercel changelog** — dual interface for updates
- **Mintlify** — all docs sites auto-generate skill.md
- **Fumadocs, Lingo.dev** — documentation platforms with agent support

**Performance Comparison:**
- HTML page: ~15,000 tokens
- Markdown skill.md: ~1,500 tokens (10x reduction)
- JSON API endpoint: ~200 tokens (75x reduction)

**Best Practice:** Direct agents to JSON API for frequent polling, skill.md for initial discovery and setup instructions.

---

### 2. Transaction Signing Patterns

Two main approaches observed in the Colosseum Agent Hackathon (280+ registered agents, 33+ submitted projects):

#### Approach A: Local Keypair (Solana Agent Kit Pattern)

**Architecture:**
```typescript
import { SolanaAgentKit } from "solana-agent-kit";

const agent = new SolanaAgentKit(
  "private-key-as-base58",  // ⚠️ Agent controls keys directly
  "https://rpc-url",
  "openai-api-key"
);

// Agent signs and sends in one step
await agent.restake(1);
```

**Characteristics:**
- ✅ **Simple** — One-step operation, minimal code
- ✅ **Fast** — No network calls to external signer
- ✅ **Offline-capable** — Can sign without network
- ❌ **Security risk** — Agent has direct key access
- ❌ **Not for real funds** — Docs explicitly warn against this
- ❌ **No policy controls** — No spending limits or allowlists

**Used by:** Standalone agent applications, development/testing

---

#### Approach B: Server-Side Signing (AgentWallet Pattern)

**Architecture:**
```typescript
// Step 1: Agent builds unsigned transaction
const tx = buildBuyTransaction(agentPubkey, 0.1);

// Step 2: Agent requests signing from AgentWallet
const signed = await fetch(
  'https://agentwallet.mcpay.tech/api/wallets/USERNAME/actions/sign-message',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chain: 'solana',
      message: tx.serialized  // Base64 unsigned transaction
    })
  }
);

// Step 3: Agent submits to Solana
await connection.sendRawTransaction(signed.signature);
```

**Characteristics:**
- ✅ **Secure** — Agent never sees private keys
- ✅ **Persistent** — Keys survive agent restarts
- ✅ **Policy-controlled** — Spending limits, contract allowlists
- ✅ **Audit trail** — All signing events logged
- ✅ **Recoverable** — Keys tied to email, not ephemeral
- ❌ **Network dependency** — Requires AgentWallet API availability
- ❌ **More complex** — Additional API integration

**Used by:** Colosseum official recommendation, production agents

**AgentWallet Features:**
1. **Devnet Faucet** — 0.1 SOL per request, 3 requests per 24 hours
2. **Policy Controls** — Max per tx, daily limits, contract allowlists
3. **Activity Logging** — Complete audit trail of all signing events
4. **Multi-chain** — Solana mainnet/devnet, Base, Base Sepolia

---

### 3. Agent-to-Agent Usage Patterns

Real examples from the Colosseum Agent Hackathon:

**Milo (Portfolio Manager Agent)**
- Other agents use Milo's API to manage their portfolios
- Pattern: Agent → Milo API → Milo executes trades
- Trust model: Client agents trust Milo with execution, not with keys
- Agent acts as service provider to other agents

**SOLPRISM (Verification Service)**
- Provides on-chain reasoning verification
- Pattern: Agent posts commitment → Acts → Reveals reasoning → SOLPRISM verifies
- Public explorer showing all agent reasoning traces
- Cryptographic proof of agent decision-making process

**Guardian (Security Service)**
- 17 AI agents running 24/7 security monitoring
- Other projects integrate the token scanner API
- Pattern: Agent → Guardian API → Risk score (0-100)
- Read-only service, no signing required

**Clodds (Compute-as-a-Service)**
- Agents pay USDC for LLM inference, code execution, web scraping
- Pattern: Agent → x402 payment → Clodds API → Result
- x402 payment protocol (see below)

---

#### x402 Payment Protocol

HTTP-like protocol for agent-to-agent paid services:

**Flow:**
```bash
# Step 1: Agent calls protected API
curl https://service.com/api/endpoint

# Returns 402 with payment requirement
{
  "error": "Payment Required",
  "payment": {
    "chain": "eip155:8453",  # Base
    "amount": "10000",       # 0.01 USDC
    "recipient": "0x..."
  }
}

# Step 2: Agent signs payment
curl -X POST "https://agentwallet.mcpay.tech/.../x402/pay" \
  -d '{"requirement": "<payment_header>"}'

# Step 3: Agent retries with payment proof
curl https://service.com/api/endpoint \
  -H "Payment-Signature: <signature>"
```

**AgentWallet Simplification:**
```bash
# One-step: handles 402 detection, signing, and retry
curl -X POST "https://agentwallet.mcpay.tech/.../x402/fetch" \
  -d '{
    "url": "https://service.com/api/endpoint",
    "method": "POST",
    "body": {"query": "data"}
  }'
```

**Supported Chains:**
- Solana mainnet/devnet
- Base (eip155:8453)
- Base Sepolia (eip155:84532)

---

### 4. Content Negotiation & skill.md Standard

**Standard Locations:**
1. `/skill.md` (convenience, widely used)
2. `/.well-known/skills/default/skill.md` (official spec)
3. Both (recommended for maximum compatibility)

**YAML Frontmatter Format:**
```yaml
---
name: fomo3d-agent-game
version: 1.0.0
description: Last buyer wins pot — buy keys to reset timer
homepage: https://fomo3d.com
metadata:
  category: gaming
  api_base: https://fomo3d.com/api
  network: solana-devnet
---
```

**Dynamic skill.md for Real-Time Games:**

Challenge: Static skill.md doesn't work for real-time games that need live data (pot size, timer, last buyer).

Solution: Server-side rendering of skill.md with latest game state on each request.

**Implementation (Next.js example):**
```typescript
// app/skill.md/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGameState } from '@/lib/solana';

export async function GET(request: NextRequest) {
  const acceptHeader = request.headers.get('accept') || '';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Detect if agent is requesting
  const isAgent = 
    acceptHeader.includes('text/markdown') ||
    acceptHeader.includes('text/plain') ||
    /axios|Claude|node|python/i.test(userAgent);
  
  if (isAgent) {
    // Fetch live game state from Solana
    const gameState = await getGameState();
    
    // Generate Markdown with current state
    const markdown = generateSkillMarkdown(gameState);
    
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=UTF-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
  
  // Redirect humans to dashboard
  return NextResponse.redirect(new URL('/', request.url));
}
```

**skill.md Content Structure (Best Practices):**

1. **YAML frontmatter** — Metadata for discovery
2. **Game state** — Live data (pot, timer, last buyer)
3. **Quick start** — Copy-paste curl examples
4. **API reference** — Endpoints with request/response schemas
5. **Decision tables** — When to buy, strategies
6. **Error handling** — Common errors with hints
7. **Prerequisites** — AgentWallet setup, devnet funding

**Agent Discovery:**
```bash
# Skills CLI auto-discovery
npx skills add https://fomo3d.com

# Manual discovery
curl -H "Accept: text/markdown" https://fomo3d.com/skill.md
```

---

## FOMO3D Game Specification

### Overview

FOMO3D is a game theory experiment where the last buyer when the timer expires wins the pot. Each key purchase resets the timer, extends the game, and distributes dividends to existing key holders. The game creates tension between:
- **Early adopters** — accumulate keys cheaply, earn dividends
- **Snipers** — try to be the last buyer before timer expires
- **High-frequency players** — attempt to outlast all others through persistence

### Core Mechanics

**Win Condition:**
- Be the last buyer when the countdown timer reaches zero
- Winner receives 48% of the total pot

**Timer Dynamics:**
- Starts at 24 hours when round begins
- Each key purchase extends timer by 30 seconds
- Maximum timer: 24 hours (timer cannot exceed this)
- When timer hits zero, round ends and winner is declared

**Revenue Distribution:**
- 48% → Winner (when round ends)
- 45% → Dividend pool (distributed to all key holders proportionally)
- 7% → Next round's starting pot

---

### Game State Structure

**On-Chain Program Data Account (PDA):**

```rust
#[account]
pub struct GameState {
    /// Current round number (increments after each winner)
    pub round: u64,
    
    /// Total SOL in the pot
    pub pot_lamports: u64,
    
    /// Unix timestamp when timer expires (0 = round ended)
    pub timer_end: i64,
    
    /// Public key of last buyer (potential winner)
    pub last_buyer: Pubkey,
    
    /// Total keys sold this round
    pub total_keys: u64,
    
    /// Round start time (for analytics)
    pub round_start: i64,
    
    /// Whether round is active
    pub active: bool,
    
    /// Bump seed for PDA
    pub bump: u8,
}
```

**Player State Account (PDA per player per round):**

```rust
#[account]
pub struct PlayerState {
    /// Player's public key
    pub player: Pubkey,
    
    /// Keys owned this round
    pub keys: u64,
    
    /// Dividends earned but not yet claimed
    pub unclaimed_dividends_lamports: u64,
    
    /// Total dividends claimed this round
    pub claimed_dividends_lamports: u64,
    
    /// Round number (for tracking)
    pub round: u64,
    
    /// Referrer who brought this player (if any)
    pub referrer: Option<Pubkey>,
    
    /// Bump seed
    pub bump: u8,
}
```

---

### Bonding Curve & Key Pricing

Keys become more expensive as more are sold, following a bonding curve to ensure early adopters benefit and late entries are costlier.

**Pricing Formula (Quadratic Bonding Curve):**

```
price_per_key = BASE_PRICE + (total_keys_sold * PRICE_INCREMENT)
```

**Constants:**
```rust
pub const BASE_PRICE_LAMPORTS: u64 = 10_000_000;      // 0.01 SOL
pub const PRICE_INCREMENT_LAMPORTS: u64 = 1_000_000;  // 0.001 SOL per key
```

**Example Pricing:**
| Keys Sold | Price per Next Key | Cumulative Cost for 10 Keys |
|-----------|-------------------|------------------------------|
| 0         | 0.01 SOL          | 0.145 SOL                    |
| 100       | 0.11 SOL          | 1.145 SOL                    |
| 1,000     | 1.01 SOL          | 10.145 SOL                   |
| 10,000    | 10.01 SOL         | 100.145 SOL                  |

**Cost Calculation for Multiple Keys:**

When buying `n` keys starting from total supply `k`:

```rust
fn calculate_cost(current_supply: u64, keys_to_buy: u64) -> u64 {
    let mut total_cost = 0;
    
    for i in 0..keys_to_buy {
        let keys_sold = current_supply + i;
        let price = BASE_PRICE_LAMPORTS + (keys_sold * PRICE_INCREMENT_LAMPORTS);
        total_cost += price;
    }
    
    total_cost
}
```

**Simplified Formula (Arithmetic Series):**

```
total_cost = n * BASE_PRICE + PRICE_INCREMENT * (n * (2k + n - 1) / 2)

where:
  n = number of keys to buy
  k = current total keys sold
```

---

### Buy Instruction

**Instruction: `buy_keys`**

**Accounts:**
```rust
#[derive(Accounts)]
pub struct BuyKeys<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump,
    )]
    pub game_state: Account<'info, GameState>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + PlayerState::SPACE,
        seeds = [b"player", game_state.round.to_le_bytes().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + PlayerState::SPACE,
        seeds = [b"player", game_state.round.to_le_bytes().as_ref(), referrer.key().as_ref()],
        bump,
    )]
    pub referrer_state: Option<Account<'info, PlayerState>>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}
```

**Logic:**

```rust
pub fn buy_keys(
    ctx: Context<BuyKeys>,
    keys_to_buy: u64,
    referrer: Option<Pubkey>,
) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let player = &mut ctx.accounts.player_state;
    let clock = &ctx.accounts.clock;
    
    // Validation
    require!(game.active, ErrorCode::GameEnded);
    require!(keys_to_buy > 0, ErrorCode::InvalidAmount);
    require!(
        clock.unix_timestamp < game.timer_end,
        ErrorCode::TimerExpired
    );
    
    // Calculate cost
    let cost = calculate_cost(game.total_keys, keys_to_buy);
    
    // Transfer SOL from buyer to game PDA
    // (implementation uses system_program::transfer)
    
    // Update game state
    game.total_keys += keys_to_buy;
    game.pot_lamports += cost;
    game.last_buyer = ctx.accounts.buyer.key();
    
    // Reset/extend timer
    let new_timer = clock.unix_timestamp + TIMER_EXTENSION_SECONDS;
    game.timer_end = std::cmp::min(
        new_timer,
        game.round_start + MAX_TIMER_SECONDS
    );
    
    // Update player state
    player.keys += keys_to_buy;
    player.round = game.round;
    
    // Distribute revenues
    let dividend_amount = cost * 45 / 100;  // 45% to dividends
    let next_round_amount = cost * 7 / 100; // 7% to next round
    
    distribute_dividends(dividend_amount, game.total_keys);
    
    // Handle referral (10% of dividend to referrer)
    if let Some(ref_pubkey) = referrer {
        let referral_amount = dividend_amount * 10 / 100;
        // Credit referrer's unclaimed dividends
    }
    
    emit!(KeysPurchased {
        round: game.round,
        buyer: ctx.accounts.buyer.key(),
        keys: keys_to_buy,
        cost_lamports: cost,
        new_timer_end: game.timer_end,
    });
    
    Ok(())
}
```

**Constants:**
```rust
pub const TIMER_EXTENSION_SECONDS: i64 = 30;      // 30 seconds per buy
pub const MAX_TIMER_SECONDS: i64 = 86400;         // 24 hours max
pub const MIN_BUY_KEYS: u64 = 1;
```

---

### Dividend Distribution

Dividends are distributed proportionally to all key holders based on their share of total keys.

**Distribution Logic:**

When a buy occurs with cost `C`:
- Dividend pool receives: `C * 0.45` (45% of purchase price)
- Distribution per key: `dividend_pool / total_keys_sold`

**Per-Player Calculation:**

```rust
fn calculate_player_dividends(
    player_keys: u64,
    total_keys: u64,
    dividend_pool_lamports: u64,
) -> u64 {
    if total_keys == 0 {
        return 0;
    }
    
    (player_keys as u128 * dividend_pool_lamports as u128 / total_keys as u128) as u64
}
```

**Accumulation Strategy:**

Rather than distributing on every buy (expensive), we track:
- `dividends_per_key_checkpoint` — Cumulative dividends per key at last claim
- Player's `last_claim_checkpoint` — Checkpoint when player last claimed

**Optimized Calculation:**

```rust
#[account]
pub struct GameState {
    // ... existing fields
    
    /// Cumulative dividends per key (lamports * 1e9 for precision)
    pub dividends_per_key_accumulated: u128,
}

pub fn calculate_pending_dividends(
    player: &PlayerState,
    game: &GameState,
) -> u64 {
    let dividends_per_key_since_claim = 
        game.dividends_per_key_accumulated - player.last_dividend_checkpoint;
    
    let pending = (player.keys as u128 * dividends_per_key_since_claim / 1_000_000_000) as u64;
    
    pending + player.unclaimed_dividends_lamports
}
```

**Update on Buy:**

```rust
pub fn update_dividends_on_buy(game: &mut GameState, dividend_amount: u64) {
    if game.total_keys > 0 {
        // Add to cumulative dividends per key (scaled by 1e9 for precision)
        let increment = (dividend_amount as u128 * 1_000_000_000) / game.total_keys as u128;
        game.dividends_per_key_accumulated += increment;
    }
}
```

---

### Referral System

Players can specify a referrer when making their first purchase. Referrers earn bonus dividends.

**Referral Bonus:**
- Referrer receives 10% of the dividends generated by referee's purchases
- This does NOT reduce referee's dividends (comes from the house/pot)

**Implementation:**

```rust
pub fn handle_referral(
    referrer_state: &mut PlayerState,
    dividend_amount: u64,
) {
    let referral_bonus = dividend_amount * 10 / 100;
    referrer_state.unclaimed_dividends_lamports += referral_bonus;
}
```

**Constraints:**
- Referrer must be set on first buy, cannot be changed
- Cannot refer yourself
- Referrer must have participated in current round (owns keys)

---

### Winner Payout & Claim

When timer reaches zero, the last buyer wins 48% of the pot.

**Instruction: `claim_winner_payout`**

**Accounts:**
```rust
#[derive(Accounts)]
pub struct ClaimWinner<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump,
    )]
    pub game_state: Account<'info, GameState>,
    
    #[account(
        mut,
        seeds = [b"player", game_state.round.to_le_bytes().as_ref(), winner.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}
```

**Logic:**

```rust
pub fn claim_winner_payout(ctx: Context<ClaimWinner>) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let clock = &ctx.accounts.clock;
    
    // Validation
    require!(game.active, ErrorCode::GameAlreadyClaimed);
    require!(
        clock.unix_timestamp >= game.timer_end,
        ErrorCode::GameStillActive
    );
    require!(
        ctx.accounts.winner.key() == game.last_buyer,
        ErrorCode::NotWinner
    );
    
    // Calculate payout (48% of pot)
    let winner_payout = game.pot_lamports * 48 / 100;
    
    // Transfer SOL from game PDA to winner
    let seeds = &[b"game".as_ref(), &[game.bump]];
    let signer = &[&seeds[..]];
    
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: game.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
            signer,
        ),
        winner_payout,
    )?;
    
    // Mark game as inactive
    game.active = false;
    
    // Next round pot gets 7%
    let next_round_pot = game.pot_lamports * 7 / 100;
    
    emit!(RoundEnded {
        round: game.round,
        winner: ctx.accounts.winner.key(),
        payout_lamports: winner_payout,
        total_keys_sold: game.total_keys,
    });
    
    Ok(())
}
```

**Instruction: `claim_dividends`**

Players can claim their accumulated dividends at any time.

```rust
pub fn claim_dividends(ctx: Context<ClaimDividends>) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let player = &mut ctx.accounts.player_state;
    
    // Calculate pending dividends
    let pending = calculate_pending_dividends(player, game);
    
    require!(pending > 0, ErrorCode::NoDividends);
    
    // Transfer dividends from game PDA to player
    // (similar transfer logic as winner payout)
    
    // Update player state
    player.claimed_dividends_lamports += pending;
    player.unclaimed_dividends_lamports = 0;
    player.last_dividend_checkpoint = game.dividends_per_key_accumulated;
    
    emit!(DividendsClaimed {
        player: ctx.accounts.player.key(),
        amount_lamports: pending,
        round: game.round,
    });
    
    Ok(())
}
```

---

### Timer Mechanics

**Timer Extension:**
- Each key purchase adds 30 seconds to timer
- Formula: `new_timer = current_time + 30 seconds`

**Maximum Timer Cap:**
- Timer cannot exceed 24 hours from round start
- Formula: `timer_end = min(new_timer, round_start + 24 hours)`

**Timer Expiration:**
- When `current_time >= timer_end`, round ends
- Last buyer becomes winner
- No more buys accepted until next round starts

**Round Transition:**

```rust
pub fn start_new_round(ctx: Context<StartRound>) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let clock = &ctx.accounts.clock;
    
    require!(!game.active, ErrorCode::RoundStillActive);
    
    // Increment round
    game.round += 1;
    
    // Reset state
    game.total_keys = 0;
    game.last_buyer = Pubkey::default();
    game.active = true;
    game.round_start = clock.unix_timestamp;
    game.timer_end = clock.unix_timestamp + MAX_TIMER_SECONDS;
    
    // Carry over 7% from previous round (already in pot)
    
    emit!(RoundStarted {
        round: game.round,
        start_time: game.round_start,
        initial_pot: game.pot_lamports,
    });
    
    Ok(())
}
```

**Anti-Spam Measures:**

To prevent timer manipulation, consider:

1. **Minimum buy amount** — Enforce minimum keys per transaction
2. **Rate limiting** — Max buys per player per minute (optional)
3. **Dynamic extension** — Diminishing returns on timer extensions
   ```rust
   // Alternative: Timer extension decreases as round progresses
   let extension = if game.total_keys < 100 {
       30  // Early game: 30 seconds
   } else if game.total_keys < 1000 {
       20  // Mid game: 20 seconds
   } else {
       10  // Late game: 10 seconds
   };
   ```

---

## Game Theory Analysis

### Player Strategies

**1. Early Accumulator**
- Buy large quantities early (cheap keys)
- Earn dividends from later buyers
- Low risk of winning, high dividend income
- Optimal when: Expecting many later buyers

**2. Sniper**
- Wait until timer is very low (<30 seconds)
- Buy just enough to become last buyer
- High risk, high reward (48% pot)
- Vulnerable to: Other snipers, network delays

**3. High-Frequency Trader**
- Continuously buy small amounts
- Aim to be last buyer through persistence
- Expensive (pays bonding curve premium)
- Effective against: Passive players

**4. Coordinator**
- Multiple agents/wallets working together
- Take turns buying to prevent others from winning
- Splits winnings or dividends
- Detectable through on-chain analysis

### Economic Equilibrium

**Nash Equilibrium Considerations:**

1. **Last-second paradox:** Everyone wants to be the last buyer, but if everyone waits, no one buys
2. **Dividend incentive:** Early buyers profit even without winning (reduces winner obsession)
3. **Bonding curve:** Punishes late entry, rewards early adoption
4. **Referral system:** Encourages player recruitment

**Expected Value (EV) Calculation:**

```
EV = (win_probability * 0.48 * pot) + (expected_dividends) - (key_cost)

Where:
  win_probability = f(time_remaining, other_players, your_resources)
  expected_dividends = f(your_keys, future_buys)
  key_cost = bonding_curve_price
```

**Agents can optimize EV by:**
- Modeling opponent behavior patterns
- Predicting optimal entry/exit timing
- Balancing dividend farming vs winner sniping

---

## Implementation Roadmap

### Phase 1: Core Smart Contract
- [ ] Anchor program setup
- [ ] Game state & player state accounts
- [ ] Buy keys instruction
- [ ] Bonding curve pricing
- [ ] Timer mechanics
- [ ] Winner payout & claim
- [ ] Unit tests

### Phase 2: API & Agent Interface
- [ ] Next.js API routes
- [ ] GET /api/state (game state)
- [ ] POST /api/tx/buy (unsigned transaction builder)
- [ ] POST /api/tx/claim (winner claim)
- [ ] GET /api/player/:address
- [ ] Dynamic skill.md generation
- [ ] Content negotiation

### Phase 3: Frontend Dashboard
- [ ] React UI with real-time updates
- [ ] Live countdown timer
- [ ] Pot size visualization
- [ ] Leaderboard
- [ ] Recent purchases feed
- [ ] Buy interface for humans

### Phase 4: Documentation & Launch
- [ ] Complete skill.md with working examples
- [ ] Agent setup guide (AgentWallet)
- [ ] API documentation
- [ ] Strategy guide
- [ ] Deploy to devnet
- [ ] Forum post on Colosseum

---

## Technical Stack

**Smart Contract:**
- Anchor Framework (Rust)
- Solana Program Library (SPL)
- Solana devnet (initial), mainnet (later)

**Backend:**
- Next.js 14 (App Router)
- TypeScript
- @solana/web3.js
- Vercel deployment

**Frontend:**
- React 18
- TailwindCSS
- Real-time WebSocket updates
- Recharts for visualizations

**Agent Integration:**
- skill.md standard
- Content negotiation
- AgentWallet signing flow
- JSON API for automation

---

## Resources & References

- **Original FOMO3D (Ethereum 2018):** [exitscam.me](https://exitscam.me)
- **Colosseum Agent Hackathon:** [colosseum.com/agent-hackathon](https://colosseum.com/agent-hackathon)
- **AgentWallet Documentation:** [agentwallet.mcpay.tech](https://agentwallet.mcpay.tech)
- **Solana Agent Kit:** [github.com/sendaifun/solana-agent-kit](https://github.com/sendaifun/solana-agent-kit)
- **Anchor Framework:** [anchor-lang.com](https://www.anchor-lang.com/)
- **skill.md Standard:** [skills.md specification](https://skills.md)

---

**Repository:** https://github.com/crocodiledundalk/FOMolt3D  
**Status:** Research & Specification Complete ✅  
**Next Steps:** Begin Phase 1 implementation

