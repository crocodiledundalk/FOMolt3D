# Workstream 1: Solana Program Development

## Overview
Build, test, and deploy the on-chain Anchor program that implements all FOMO3D game mechanics: configurable game parameters, bonding curve key purchases, dividend distribution, timer management, referral tracking, combined claiming, and round lifecycle.

### Status: CODE COMPLETE — Awaiting Devnet Deployment

| Phase | Status |
|-------|--------|
| 1.1 Scaffolding | **DONE** |
| 1.2 Account Structures | **DONE** |
| 1.3 Core Instructions | **DONE** — 6 instructions (register_player merged into buy_keys via init_if_needed) |
| 1.4 Security Hardening | **DONE** — dual audit passed (solana-security + blueshift-security) |
| 1.5 Testing | **DONE** — 235 tests (127 unit + 108 integration across 13 files) |
| 1.6 Devnet Deployment | **DONE** — Deployed 2026-02-06, admin `64hiasuUgsj7boSGjCayC7WWNyjLC4KqZmNbx1xXZTzp`, config script at `app/scripts/configure-devnet.ts` |

## Mandatory Skills

| Skill | When to Invoke | Mandate |
|-------|---------------|---------|
| `solana-program-development` | Phase 1.1 (scaffolding), Phase 1.2 (accounts), Phase 1.3 (instructions), Phase 1.6 (deploy) | **Required** for ALL Anchor code — scaffolding, account structs, instruction handlers, deployment. Invoke at the start of each coding phase. |
| `litesvm` | Phase 1.5 (integration tests) | **Required** for ALL integration tests. Sets up LiteSVM test infrastructure, sends transactions, verifies state changes. **Do NOT use solana-test-validator, solana-program-test, or Mollusk.** |
| `solana-unit-testing` | Phase 1.5 (unit tests) | **Required** for unit tests on bonding curve math, dividend calculations, validation logic, serialization roundtrips. |
| `solana-security` | Phase 1.4 (after implementation, before tests) | **Required** first-pass security audit. Run on the complete program source. All critical/high findings must be fixed before proceeding. |
| `blueshift-security` | Phase 1.4 (after `solana-security` pass) | **Required** second-pass audit using Blueshift vulnerability patterns. Covers both Anchor-specific and general Solana attack vectors. |
| `ralph-validation` | Phase 1.5 (on economic invariant tests) | **Required** self-validation cycle on dividend math and bonding curve calculations. Retry on failure until invariants hold. |
| `success-criteria` | Start of EVERY phase | **Required** — invoke to confirm phase success criteria are defined before starting work. |
| `git-workflow` | Every commit | **Required** — atomic commits with testing gates. |
| `code-simplifier` | End of Phase 1.3, end of Phase 1.5 | **Required** — simplify instruction handlers after implementation, simplify test code after tests pass. |

## Technology Constraints

- **Anchor version**: 0.32.1 (pinned in `Cargo.toml`).
- **Testing framework**: LiteSVM ONLY. No solana-test-validator, no solana-program-test, no Mollusk.
- **Test language**: Rust-based LiteSVM tests in `tests/` directory (not TypeScript Anchor tests).
- **Arithmetic**: All on-chain math via `checked_*` operations. Use `u128` intermediates where overflow is possible.

## Directory Structure
```
programs/fomolt3d/
├── Cargo.toml
├── src/
│   ├── lib.rs                          # Program entrypoint, declare_id, module registration
│   ├── state/
│   │   ├── mod.rs
│   │   ├── global_config.rs            # GlobalConfig singleton — game parameter storage
│   │   ├── game_state.rs               # GameState per-round — includes config snapshot
│   │   └── player_state.rs             # PlayerState per-player-per-round
│   ├── instructions/
│   │   ├── mod.rs
│   │   ├── create_or_update_config.rs  # Admin: create or update global config
│   │   ├── initialize_first_round.rs   # Admin: create round 0, no previous game
│   │   ├── start_new_round.rs          # Permissionless: create round N+1, validates prev round ended
│   │   ├── register_player.rs          # Create player account without buying keys
│   │   ├── buy_keys.rs                 # Core: purchase keys, distribute funds, extend timer
│   │   ├── claim.rs                    # Combined: winner prize + dividends (either/both)
│   │   └── claim_referral_earnings.rs  # Referrer: sweep accumulated referral earnings
│   ├── errors.rs                       # Custom error codes
│   ├── events.rs                       # Event structs (7 events for frontend consumption)
│   ├── math.rs                         # Pure math functions (extracted for testability)
│   └── constants.rs                    # DIVIDEND_PRECISION + default parameter values
tests/
│   ├── integration/
│   │   ├── mod.rs
│   │   ├── test_full_lifecycle.rs      # Full round: config -> init -> buys -> expire -> claim -> new round
│   │   ├── test_config.rs             # GlobalConfig create/update flows
│   │   ├── test_buy_keys.rs           # Buy mechanics, bonding curve, dividends
│   │   ├── test_dividends.rs          # Multi-player dividend distribution + claiming
│   │   ├── test_referrals.rs          # Referral bonus flows + claim_referral_earnings
│   │   ├── test_register_player.rs    # Player registration without buying
│   │   ├── test_combined_claim.rs     # Combined claim: winner + dividends + edge cases
│   │   ├── test_timer.rs             # Timer extension and expiry edge cases
│   │   ├── test_errors.rs            # All error conditions
│   │   ├── test_economic_invariant.rs # Total inflows == total outflows
│   │   └── helpers.rs                # LiteSVM setup, airdrop, account helpers
│   └── unit/
│       ├── mod.rs
│       ├── test_bonding_curve.rs     # Pure math: cost calculations at various key counts
│       ├── test_dividend_math.rs     # Accumulator precision, rounding behavior
│       └── test_timer_logic.rs       # Extension capping, edge cases
Anchor.toml
Cargo.toml (workspace)
```

---

## Instruction Set Summary

| # | Instruction | Signer | Purpose |
|---|-------------|--------|---------|
| 1 | `create_or_update_config` | Admin | Create or update the GlobalConfig singleton with game parameters |
| 2 | `initialize_first_round` | Admin | Create round 0 — no previous game needed, reads params from GlobalConfig |
| 3 | `start_new_round` | Any | Create round N+1 — requires previous round (N) to be ended + winner claimed, reads params from GlobalConfig |
| 4 | `register_player` | Player | Create a PlayerState account without buying keys (e.g. for referral setup) |
| 5 | `buy_keys` | Buyer | Purchase keys — bonding curve pricing, dividend distribution, timer extension, referral handling |
| 6 | `claim` | Player | Combined claim — winner prize and/or dividends in a single transaction |
| 7 | `claim_referral_earnings` | Referrer | Sweep accumulated referral earnings from vault to referrer wallet |

---

## Phase 1.1: Project Scaffolding

> **Skill gate**: Invoke `success-criteria` to confirm phase criteria. Invoke `solana-program-development` for scaffolding.

**STATUS: DONE** — Anchor workspace initialized, module structure created.

### Tasks
- [x] Initialize Anchor workspace
- [x] Configure `Anchor.toml` for devnet, pin Anchor 0.32.1
- [x] Create module structure: `state/`, `instructions/`, `errors.rs`, `constants.rs`
- [x] Update `constants.rs` — keep only implementation constants (not game params, which now live in GlobalConfig):

| Constant | Type | Value | Meaning |
|----------|------|-------|---------|
| `DIVIDEND_PRECISION` | `u128` | `1_000_000_000` | 1e9 scaling for dividend accumulator |

Default values for GlobalConfig initialization (used in tests and as reference):

| Default | Type | Value | Meaning |
|---------|------|-------|---------|
| `DEFAULT_BASE_PRICE_LAMPORTS` | `u64` | `10_000_000` | 0.01 SOL base key price |
| `DEFAULT_PRICE_INCREMENT_LAMPORTS` | `u64` | `1_000_000` | 0.001 SOL per key increment |
| `DEFAULT_TIMER_EXTENSION_SECS` | `i64` | `30` | Seconds added per buy |
| `DEFAULT_MAX_TIMER_SECS` | `i64` | `86_400` | 24-hour max timer cap |
| `DEFAULT_WINNER_BPS` | `u64` | `4700` | 47% to winner |
| `DEFAULT_DIVIDEND_BPS` | `u64` | `4400` | 44% to dividends |
| `DEFAULT_NEXT_ROUND_BPS` | `u64` | `700` | 7% carry to next round |
| `DEFAULT_PROTOCOL_FEE_BPS` | `u64` | `200` | 2% protocol fee |
| `DEFAULT_REFERRAL_BONUS_BPS` | `u64` | `1000` | 10% of dividend share to referrer |

- [x] Update `errors.rs` with revised error codes (see below)
- [x] Verify project compiles with `anchor build`

### Updated Error Codes

| Error Code | When Returned |
|------------|---------------|
| `GameNotActive` | Buying keys when round is inactive |
| `GameStillActive` | Starting new round when current is still active |
| `TimerExpired` | Buying keys after timer has ended |
| `TimerNotExpired` | Claiming winner before timer ends |
| `InsufficientFunds` | Buyer doesn't have enough SOL |
| `NoKeysToBuy` | `keys_to_buy == 0` in buy_keys |
| `NothingToClaim` | Calling claim with zero dividends AND not the winner (or already claimed) |
| `NotWinner` | Non-last-buyer trying to claim winner prize |
| `WinnerAlreadyClaimed` | Double-claiming winner prize |
| `WinnerNotClaimed` | Starting new round before winner has claimed |
| `CannotReferSelf` | Referrer == player |
| `ReferrerMismatch` | Passed referrer doesn't match stored referrer on PlayerState |
| `ReferrerNotRegistered` | Referrer has no PlayerState in this round |
| `NoReferralEarnings` | Claiming referral earnings with zero balance |
| `Unauthorized` | Non-admin calling admin-only instruction |
| `InvalidConfig` | BPS values don't sum to 10000, or invalid parameter values |
| `Overflow` | Arithmetic overflow in any calculation |
| `PlayerAlreadyRegistered` | Calling register_player when PlayerState already exists |

### Phase 1.1 Completion Criteria
- [x] `anchor build` succeeds with zero errors
- [ ] All constants updated (implementation constants + defaults)
- [ ] All error codes updated with `#[error_code]` attribute
- [x] Module structure matches directory layout above
- [ ] Commit via `git-workflow` skill

---

## Phase 1.2: Account Structures

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-program-development` for account definitions.

### Tasks
- [ ] Implement `GlobalConfig` account struct in `state/global_config.rs`
- [ ] Update `GameState` account struct in `state/game_state.rs`
- [ ] Update `PlayerState` account struct in `state/player_state.rs`
- [ ] Add `#[account]` derives and space calculations
- [ ] Verify PDA derivation seeds are correct

### `GlobalConfig` PDA (singleton)
- **Seeds**: `[b"config"]`
- **Purpose**: Admin-controlled game parameters. Values are copied into each GameState at round initialization. Changes to GlobalConfig only affect FUTURE rounds, never in-progress ones.
- **Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `admin` | `Pubkey` | Admin authority — only this signer can update config or start round 0 |
| `base_price_lamports` | `u64` | Base price per key in lamports |
| `price_increment_lamports` | `u64` | Price increment per key already sold |
| `timer_extension_secs` | `i64` | Seconds added to timer per buy |
| `max_timer_secs` | `i64` | Maximum timer duration in seconds |
| `winner_bps` | `u64` | Winner share in basis points |
| `dividend_bps` | `u64` | Dividend share in basis points |
| `next_round_bps` | `u64` | Next round carry share in basis points |
| `protocol_fee_bps` | `u64` | Protocol fee share in basis points |
| `referral_bonus_bps` | `u64` | Referral bonus as BPS of dividend portion |
| `protocol_wallet` | `Pubkey` | Wallet that receives protocol fees |
| `bump` | `u8` | PDA bump seed |

**Validation**: `winner_bps + dividend_bps + next_round_bps + protocol_fee_bps == 10000`. Referral bonus is carved FROM the dividend portion, not additive. Protocol fee is transferred directly from buyer to protocol_wallet (never enters vault).

### `GameState` PDA
- **Seeds**: `[b"game", round.to_le_bytes()]`
- **Round numbering**: First round = round 0
- **Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `round` | `u64` | Round number (0-indexed) |
| `pot_lamports` | `u64` | Total SOL in pot |
| `timer_end` | `i64` | Unix timestamp when timer expires |
| `last_buyer` | `Pubkey` | Address of most recent key buyer |
| `total_keys` | `u64` | Total keys sold this round |
| `round_start` | `i64` | Unix timestamp of round start |
| `active` | `bool` | Whether round is active |
| `winner_claimed` | `bool` | Whether winner has claimed prize |
| `dividends_per_key_accumulated` | `u128` | Scaled dividend accumulator (DIVIDEND_PRECISION scaling) |
| `next_round_pot` | `u64` | Accumulated carry for next round |
| `base_price_lamports` | `u64` | Snapshot from GlobalConfig at init |
| `price_increment_lamports` | `u64` | Snapshot from GlobalConfig at init |
| `timer_extension_secs` | `i64` | Snapshot from GlobalConfig at init |
| `max_timer_secs` | `i64` | Snapshot from GlobalConfig at init |
| `winner_bps` | `u64` | Snapshot from GlobalConfig at init |
| `dividend_bps` | `u64` | Snapshot from GlobalConfig at init |
| `next_round_bps` | `u64` | Snapshot from GlobalConfig at init |
| `protocol_fee_bps` | `u64` | Snapshot from GlobalConfig at init |
| `referral_bonus_bps` | `u64` | Snapshot from GlobalConfig at init |
| `protocol_wallet` | `Pubkey` | Snapshot from GlobalConfig at init |
| `winner_pot` | `u64` | Accumulated winner prize pool |
| `bump` | `u8` | PDA bump seed |

**Key design**: All game parameters are snapshotted from GlobalConfig at round initialization. During gameplay, instructions ONLY read from GameState fields — never from GlobalConfig. This means mid-round config changes don't affect in-progress games.

### `PlayerState` PDA
- **Seeds**: `[b"player", game_state.key(), player_pubkey]`
- **Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `player` | `Pubkey` | Player's wallet address |
| `keys` | `u64` | Keys held in this round |
| `round` | `u64` | Round number |
| `unclaimed_dividends_lamports` | `u64` | Pending dividends not yet withdrawn |
| `claimed_dividends_lamports` | `u64` | Total dividends already withdrawn |
| `last_dividend_checkpoint` | `u128` | Snapshot of accumulator at last dividend update |
| `referrer` | `Option<Pubkey>` | Who referred this player (set once on first tx, immutable after) |
| `referral_earnings_lamports` | `u64` | Accumulated earnings from being someone's referrer (not yet claimed) |
| `claimed_referral_earnings_lamports` | `u64` | Total referral earnings already claimed |
| `is_agent` | `bool` | Whether this player is an AI agent (vs human) |
| `bump` | `u8` | PDA bump seed |

### Phase 1.2 Completion Criteria
- [ ] All three structs compile with correct `#[account]` attributes
- [ ] Space calculations are correct (manually verified: 8 discriminator + sum of field sizes)
- [ ] GlobalConfig space = 8 + (32 + 8*4 + 8*4 + 8*4 + 1) = verify exact
- [ ] GameState space = 8 + (8+8+8+32+8+8+1+1+16+8 + 8+8+8+8+8+8+8+8 +1) = verify exact
- [ ] PlayerState space = 8 + (32+8+8+8+8+16+33+8+8+1+1) = verify exact
- [ ] PDA derivation seeds documented in code comments
- [ ] `anchor build` succeeds
- [ ] Commit via `git-workflow` skill

---

## Phase 1.3: Core Instructions

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-program-development` for instruction implementation.

### Task 1.3.1: `create_or_update_config`
- [ ] Admin-only instruction
- [ ] Uses `init_if_needed` on GlobalConfig PDA — safe because admin-gated
- [ ] On create: sets all parameters + records admin pubkey
- [ ] On update: validates `signer == config.admin`, updates parameter values
- [ ] **Validation**: `winner_bps + dividend_bps + next_round_bps == 10000`
- [ ] **Validation**: All BPS values >= 0, all price/timer values > 0
- [ ] Anchor context:
  ```
  #[account(
      init_if_needed,
      payer = admin,
      space = 8 + GlobalConfig::SPACE,
      seeds = [b"config"],
      bump,
  )]
  pub config: Account<'info, GlobalConfig>,
  ```

### Task 1.3.2: `initialize_first_round`
- [ ] Admin-only instruction — creates round 0
- [ ] No previous game needed in accounts context
- [ ] Reads parameters from GlobalConfig and snapshots them into GameState
- [ ] Create GameState PDA with `round = 0`, `active = true`
- [ ] Set `timer_end = clock.unix_timestamp + config.max_timer_secs`
- [ ] Set `last_buyer = Pubkey::default()` (no buyer yet)
- [ ] Anchor context includes: `admin` (signer), `config` (read), `game_state` (init), `vault` (SystemAccount PDA)
- [ ] Verify: `signer == config.admin`

### Task 1.3.3: `start_new_round`
- [ ] **Permissionless** — anyone can start a new round
- [ ] Requires previous round game state (round N) passed in context
- [ ] **Validations**:
  - `!prev_game.active` → `GameStillActive`
  - `prev_game.winner_claimed` → `WinnerNotClaimed`
- [ ] Reads parameters from GlobalConfig and snapshots them into new GameState
- [ ] Create new GameState PDA with `round = prev_game.round + 1`
- [ ] Seed new round: `pot_lamports = prev_game.next_round_pot`
- [ ] Transfer carry-over lamports from old vault to new vault
- [ ] Set fresh timer: `timer_end = clock + config.max_timer_secs`
- [ ] Set `active = true`, `winner_claimed = false`, `total_keys = 0`

### Task 1.3.4: `register_player`
- [ ] Creates a PlayerState account without buying any keys
- [ ] Use `init` (NOT `init_if_needed`) — fails if PlayerState already exists → `PlayerAlreadyRegistered`
- [ ] Sets `player`, `round`, `bump`, `is_agent` flag
- [ ] Optionally sets `referrer` if a valid referrer account is passed in context:
  - Referrer must not be self → `CannotReferSelf`
  - Referrer must have a valid PlayerState in this round → `ReferrerNotRegistered`
- [ ] Sets `keys = 0`, all earnings fields to 0
- [ ] **Purpose**: Allows a player to register for referral before buying keys. Agents can register as `is_agent = true`.

### Task 1.3.5: `buy_keys`
- [ ] Implement `buy_keys(keys_to_buy: u64)` instruction
- [ ] Uses `init_if_needed` for PlayerState — creates account if not yet registered
- [ ] **Validations**:
  - `game.active == true` → `GameNotActive`
  - `keys_to_buy > 0` → `NoKeysToBuy`
  - `clock.unix_timestamp < game.timer_end` → `TimerExpired`
- [ ] **Bonding curve cost calculation** (all checked math, u128 intermediates):
  ```
  cost = keys_to_buy * game.base_price_lamports
       + game.price_increment_lamports * keys_to_buy * (2 * total_keys + keys_to_buy - 1) / 2
  ```
  Note: uses `game.base_price_lamports` and `game.price_increment_lamports` (GameState fields), NOT constants.
- [ ] **SOL transfer**: buyer → vault via `system_program::transfer`
- [ ] **Dividend snapshot** (BEFORE updating player keys):
  ```
  pending = player.keys * (game.accumulated - player.checkpoint) / PRECISION
  player.unclaimed += pending
  player.checkpoint = game.accumulated
  ```
- [ ] **First-buy edge case**: if `game.total_keys == 0`, skip dividend distribution (no one to distribute to).
- [ ] **Dividend distribution** (if `game.total_keys > 0`):
  ```
  dividend_amount = cost * game.dividend_bps / 10000
  increment = dividend_amount * PRECISION / game.total_keys
  game.accumulated += increment
  ```
- [ ] **Referral handling** (optional referrer account in context):
  - If `player.referrer` is `None` AND a valid referrer account is passed:
    - Referrer must not be self → `CannotReferSelf`
    - Referrer must have a valid PlayerState → `ReferrerNotRegistered`
    - Set `player.referrer = Some(referrer_pubkey)`
  - If `player.referrer` is `Some(existing)` AND a referrer account is passed:
    - `referrer_pubkey == existing` → `ReferrerMismatch` if they don't match
  - If `player.referrer` is `Some(existing)` and referrer earns:
    - `referral_bonus = dividend_amount * game.referral_bonus_bps / 10000`
    - `referrer_state.referral_earnings_lamports += referral_bonus`
    - This bonus is carved from the dividend portion (reduces dividends distributed to key holders)
  - Same logic applies on first buy if referrer is being set in this same transaction
- [ ] **State updates**:
  - `game.total_keys += keys_to_buy`
  - `game.pot_lamports += cost`
  - `game.last_buyer = buyer`
  - `game.next_round_pot += cost * game.next_round_bps / 10000`
  - `player.keys += keys_to_buy`
- [ ] **Timer extension**: `game.timer_end = min(clock + game.timer_extension_secs, game.round_start + game.max_timer_secs)`
- [ ] **is_agent flag**: If this is a first-time player via `init_if_needed`, the `is_agent` flag can be set via an instruction argument

### Task 1.3.6: `claim`
- [ ] **Combined claim** — handles both winner prize AND dividends in a single instruction
- [ ] Calculate pending dividends:
  ```
  delta = game.accumulated - player.checkpoint
  pending_dividends = player.keys * delta / PRECISION + player.unclaimed
  ```
- [ ] Check if player is the winner:
  ```
  is_winner = clock >= game.timer_end
           && player.key() == game.last_buyer
           && !game.winner_claimed
  ```
- [ ] If is_winner: `winner_payout = game.pot_lamports * game.winner_bps / 10000`
- [ ] Total payout = `pending_dividends + winner_payout` (either can be 0)
- [ ] **Validation**: `total_payout > 0` → `NothingToClaim`
- [ ] Transfer `total_payout` from vault to player
- [ ] Update dividend state: `player.unclaimed = 0`, `player.checkpoint = game.accumulated`, `player.claimed_dividends += pending_dividends`
- [ ] If winner was claimed: `game.winner_claimed = true`, `game.active = false`

### Task 1.3.7: `claim_referral_earnings`
- [ ] Allows a referrer to sweep accumulated referral earnings
- [ ] **Validation**: `player.referral_earnings_lamports > 0` → `NoReferralEarnings`
- [ ] Transfer `player.referral_earnings_lamports` from vault to player
- [ ] Update state: `player.claimed_referral_earnings += amount`, `player.referral_earnings_lamports = 0`

### Phase 1.3 Completion Criteria
- [ ] All 7 instructions compile
- [ ] `anchor build` produces valid IDL at `target/idl/fomolt3d.json`
- [ ] IDL contains all 7 instructions, 3 account types, all error codes
- [ ] Each instruction has correct Anchor account constraints (`seeds`, `bump`, `has_one`, `constraint`)
- [ ] All arithmetic uses `checked_*` operations — zero unchecked math
- [ ] All game parameter reads use GameState fields (never constants or GlobalConfig during gameplay)
- [ ] State updates happen BEFORE lamport transfers in every instruction
- [ ] `code-simplifier` skill run on all instruction handlers
- [ ] Commit via `git-workflow` skill

---

## Phase 1.4: Security Hardening

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-security` skill for first audit pass. Then invoke `blueshift-security` for second pass.

### Tasks
- [ ] Run `solana-security` audit on complete program source
- [ ] Fix all critical and high severity findings
- [ ] Run `blueshift-security` audit on complete program source
- [ ] Fix all critical and high severity findings from Blueshift patterns
- [ ] Verify the following security properties manually:

### Security Checklist
- [ ] **Overflow protection**: Every arithmetic operation uses `checked_add/mul/div/sub` or returns `Overflow` error
- [ ] **PDA authority**: All SOL transfers use vault PDA — no leaked signer authority
- [ ] **Account constraints**: All `#[account()]` attributes specify correct `seeds`, `bump`, `has_one`, `constraint`
- [ ] **Reentrancy**: State updates occur BEFORE all lamport transfers in every instruction
- [ ] **Single-claim**: `claim` checks `winner_claimed == false` and sets it `true` atomically
- [ ] **First-buy safety**: `buy_keys` handles `total_keys == 0` without division by zero
- [ ] **Rent exemption**: All `init` accounts have sufficient space for rent exemption
- [ ] **Signer verification**: Admin instructions check `signer == config.admin`
- [ ] **No duplicate init**: GameState PDA seeds include round number, preventing collision
- [ ] **Timer integrity**: Timer can only be extended, never shortened; capped at `round_start + max_timer_secs`
- [ ] **Referral safety**: Cannot refer self, referrer must have valid PlayerState, referrer set only once, ReferrerMismatch enforced
- [ ] **Config immutability during round**: GameState parameters are snapshotted — config changes don't affect in-progress rounds
- [ ] **Referral earnings isolation**: Referral earnings tracked separately from dividends, claimed via separate instruction
- [ ] **init_if_needed safety**: Only used where re-initialization is safe (GlobalConfig: admin-gated, PlayerState: idempotent)

### Phase 1.4 Completion Criteria
- [ ] `solana-security` audit report produced with zero critical/high findings remaining
- [ ] `blueshift-security` audit report produced with zero critical/high findings remaining
- [ ] All 14 security checklist items verified and checked off
- [ ] Any medium/low findings documented with rationale if not fixed
- [ ] Commit via `git-workflow` skill

---

## Phase 1.5: Testing

> **Skill gate**: Invoke `success-criteria`. Invoke `litesvm` for integration test setup. Invoke `solana-unit-testing` for unit tests. Invoke `ralph-validation` for economic invariant validation.

### CRITICAL: Testing Framework
- **Use LiteSVM ONLY** — invoke the `litesvm` skill for setup and patterns
- **Do NOT use**: solana-test-validator, solana-program-test, Mollusk, or `anchor test`
- Tests are Rust-based, in the `tests/` directory
- Use `litesvm` skill for: LiteSVM instance setup, account cloning, transaction sending, state verification

### Task 1.5.1: Unit Tests (invoke `solana-unit-testing`)
- [ ] **Bonding curve tests** (`test_bonding_curve.rs`):
  - Cost of 1 key when `total_keys = 0`: should be `BASE_PRICE = 10_000_000`
  - Cost of 1 key when `total_keys = 100`: verify against formula
  - Cost of 10 keys when `total_keys = 0`: verify batch pricing
  - Cost of 1 key when `total_keys = 1000`: verify at scale
  - Cost of 100 keys when `total_keys = 99_900`: verify near 100k limit
  - Overflow test: cost calculation at `total_keys = 100_000` must not overflow u128
- [ ] **Dividend math tests** (`test_dividend_math.rs`):
  - Single player buys, verify accumulator value
  - Two players, verify proportional distribution
  - Accumulator precision: 1000 sequential buys, verify no drift > 1 lamport per tx
  - Rounding: verify `floor` behavior on fractional lamports
- [ ] **Timer logic tests** (`test_timer_logic.rs`):
  - Extension from `t` to `t + 30`
  - Cap at `round_start + max_timer_secs`
  - Extension when already near cap: should cap, not exceed

### Task 1.5.2: Integration Tests (invoke `litesvm`)
- [ ] **Config lifecycle** (`test_config.rs`):
  - Admin creates config with valid parameters
  - Admin updates config — new rounds use new values
  - Non-admin cannot create/update config → `Unauthorized`
  - Invalid BPS values (don't sum to 10000) → `InvalidConfig`
- [ ] **Full lifecycle** (`test_full_lifecycle.rs`):
  - Create config → init round 0 → player A buys 5 keys → player B buys 3 keys → warp time past timer → player B calls `claim` (gets winner prize + dividends) → anyone starts round 1
  - Verify: pot amounts, winner payout, next round carry, dividend balances
  - Verify: round 1 uses config params snapshotted at creation
- [ ] **Player registration** (`test_register_player.rs`):
  - Register player without buying keys → PlayerState exists with 0 keys
  - Register with referrer → referrer set correctly
  - Register with self-referral → fails `CannotReferSelf`
  - Register with non-existent referrer → fails `ReferrerNotRegistered`
  - Register twice → fails `PlayerAlreadyRegistered`
  - Register as agent → `is_agent = true`
- [ ] **Multi-player dividends** (`test_dividends.rs`):
  - 5 players each buy different amounts of keys
  - Each player calls `claim`
  - Verify: each player's claimed amount matches proportional share
  - Verify: total claimed + pot remainder = total deposited (economic invariant)
- [ ] **Combined claim** (`test_combined_claim.rs`):
  - Winner claims → gets both winner prize + dividends in one tx
  - Non-winner claims → gets only dividends
  - Player with 0 keys and no win → `NothingToClaim`
  - Winner claims, then claims again → second claim gets remaining dividends only (no double winner payout)
- [ ] **Referral flow** (`test_referrals.rs`):
  - Player A registers (no referrer)
  - Player B registers with referrer = Player A
  - Player B buys keys → Player A's `referral_earnings_lamports` increases
  - Player A calls `claim_referral_earnings` → earnings transferred
  - Edge cases: refer self (fails), referrer mismatch (fails), claim zero earnings (fails)
  - Verify: referral bonus carved from dividend portion
- [ ] **Timer mechanics** (`test_timer.rs`):
  - Buy extends timer by `game.timer_extension_secs`
  - Multiple buys don't exceed `game.max_timer_secs` cap
  - Buy after timer expires fails with `TimerExpired`
- [ ] **Error conditions** (`test_errors.rs`):
  - All error codes tested with specific trigger conditions
  - At least one test per error code
- [ ] **Economic invariant** (`test_economic_invariant.rs`) — invoke `ralph-validation`:
  - 10 players, 50 random buys, some with referrers, all claim dividends + referral earnings, winner claims
  - Assert: `sum(all_claims) + winner_payout + referral_payouts + next_round_carry == sum(all_deposits)` (tolerance: ≤ N lamports where N = number of buy transactions)
  - Run validation loop: if invariant fails, retry with debug output until root cause identified

### Phase 1.5 Completion Criteria
- [ ] All unit tests pass: `cargo test --lib` (minimum 12 test cases)
- [ ] All integration tests pass via LiteSVM (minimum 25 test cases)
- [ ] Economic invariant holds within tolerance (≤ 1 lamport per transaction rounding)
- [ ] Overflow test passes at 100,000 total keys
- [ ] All error conditions tested and returning correct error codes
- [ ] Test coverage: every instruction has at least 3 test cases (happy path + 2 error paths)
- [ ] `ralph-validation` cycle completed successfully on economic invariant
- [ ] Commit via `git-workflow` skill

---

## Phase 1.6: Devnet Deployment

> **Skill gate**: Invoke `success-criteria`. Invoke `solana-program-development` for deployment.

### Tasks
- [ ] Run `anchor build` — clean build with no warnings
- [ ] Deploy to devnet: `anchor deploy --provider.cluster devnet`
- [ ] Record program ID in `Anchor.toml` and `lib.rs` `declare_id!`
- [ ] Export IDL to `target/idl/fomolt3d.json`
- [ ] Copy IDL to `app/src/lib/idl.json` (for frontend consumption)
- [ ] Smoke test on devnet:
  - [ ] Call `create_or_update_config` — verify GlobalConfig PDA created
  - [ ] Call `initialize_first_round` — verify GameState PDA for round 0 created
  - [ ] Call `register_player` — verify PlayerState created with 0 keys
  - [ ] Call `buy_keys` with 1 key — verify key credited, pot updated, timer extended
  - [ ] Call `buy_keys` with second wallet + referrer — verify referral earnings tracked
  - [ ] Call `claim` — verify dividends transferred
- [ ] Update `README.md` with program ID and devnet deployment info
- [ ] Run `repo-docs-sync` skill to sync documentation

### Phase 1.6 Completion Criteria
- [ ] Program deployed to devnet with stable program ID
- [ ] IDL exported and accessible at `target/idl/fomolt3d.json`
- [ ] All 6 smoke test transactions confirmed on devnet
- [ ] Program ID documented in README, Anchor.toml, and lib.rs
- [ ] Commit via `git-workflow` skill

---

## WS1 Overall Success Criteria

Every item must be checked off before WS1 is considered complete:

- [ ] All 7 instructions execute correctly on devnet
- [ ] Full round lifecycle works end-to-end (config → init round 0 → buys → timer expires → claim → new round)
- [ ] GlobalConfig: admin can create/update, changes only affect future rounds
- [ ] Dividend math: total outflows == total inflows within ≤ 1 lamport/tx tolerance
- [ ] Referral system: earnings tracked correctly, carved from dividend portion, claimable separately
- [ ] Combined claim: winner + dividends in single tx, works for either/both/neither
- [ ] Player registration: accounts can be created without buying keys, is_agent flag works
- [ ] Timer: configurable extension per buy, capped at configurable max from round start
- [ ] Bonding curve: configurable prices, verified at 0, 100, 1000, 100000 total keys
- [ ] All error codes tested and returning correctly
- [ ] No overflow at 100,000 keys (u128 stress test passes)
- [ ] LiteSVM test suite: ≥ 37 test cases passing (12 unit + 25 integration)
- [ ] `solana-security` audit: zero critical/high findings
- [ ] `blueshift-security` audit: zero critical/high findings
- [ ] Program deployed to devnet with exported IDL
- [ ] All commits made via `git-workflow` skill

## Dependencies
- None (this is the foundation — all other workstreams depend on this)

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Integer overflow in bonding curve at high key counts | Use u128 intermediates for multiplication, comprehensive overflow tests |
| Dividend rounding errors accumulate over many buys | 1e9 precision scaling, invariant test that total outflows match inflows |
| First-buy edge case (dividing by 0 total keys) | First buy has no dividends to distribute, special-case the 0-key state |
| PDA space limits | Pre-calculate max account size with all new fields, verify in Phase 1.2 criteria |
| Referral earnings double-counting | Separate referral earnings from dividend earnings, isolated claim instruction |
| Config change mid-round affecting game fairness | Parameters snapshotted at round init — mid-round config changes have no effect |
| `init_if_needed` re-initialization attacks | Only used on admin-gated (GlobalConfig) and idempotent (PlayerState) accounts |
| Anchor version compatibility | Pin Anchor CLI 0.32.1 and crate version in Cargo.toml |
| LiteSVM compatibility issues | Invoke `litesvm` skill which has latest patterns; use `gap-learning` if issues arise |
