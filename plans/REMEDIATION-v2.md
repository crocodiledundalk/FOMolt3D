# FOMolt3D Program Remediation Plan v2

> Three changes to the Solana program: auto-end rounds, simplify dividends, restructure fee ordering.
> This plan supersedes any conflicting details in WS1 or RESEARCH.md.

---

## Summary of Changes

| # | Change | Impact |
|---|--------|--------|
| 1 | **Auto-end round on timer expiry** — any instruction after timer expires flips `active = false`. Double-claim prevention via `current_round = 0` sentinel. First round starts at 1 (not 0). | `buy_keys`, `claim`, `claim_referral_earnings`, `register_player`, `settle_round`, `initialize_first_round`, `start_new_round`, GameState, PlayerState |
| 2 | **Remove dividend accumulator** — replace per-share tracking with simple `total_dividend_pool`. Dividends are proportional to keys held, claimable only at round end. | `buy_keys`, `claim`, `settle_round`, GameState, PlayerState, `math.rs` |
| 3 | **Restructure fee ordering** — 2% house edge off the top, then 10% referral from remainder, then the rest splits into pot (winner/dividend/next_round). BPS validation changes. | `buy_keys`, `create_or_update_config`, `math.rs`, `constants.rs`, GlobalConfig, GameState |

---

## Change 1: Auto-End Round on Timer Expiry + Double-Claim Prevention

### Current Behavior
- `buy_keys` checks `clock < timer_end` and fails with `TimerExpired`
- Round only ends when the winner calls `claim` (sets `active = false`, `winner_claimed = true`)
- `register_player` has an Anchor constraint `game_state.active` that blocks registration on inactive rounds
- First round is round 0
- `current_round` is always set to a valid round number

### Proposed Behavior

**Auto-end logic:** Every instruction that reads GameState checks: if `clock >= timer_end && active == true`, set `active = false`. Then:

| Instruction | After auto-end |
|-------------|---------------|
| `buy_keys` | Return `Ok(())` immediately — no-op, no purchase. Timer expired, round is over. |
| `claim` | Proceed with end-of-round claim (dividends + winner prize) |
| `claim_referral_earnings` | Proceed normally (referral claims work anytime) |
| `register_player` | Return `GameNotActive` error — can't register for ended round |

**Double-claim prevention:**
- After `claim` on an ended round: set `player.current_round = 0`, `player.keys = 0`
- Subsequent `claim` calls fail because `player_state.current_round != game_state.round` (the `PlayerNotInRound` constraint)
- `settle_round` similarly resets `current_round = 0` then sets it to the new round

**Round numbering:**
- First round = **1** (not 0)
- `current_round = 0` is the sentinel meaning "not in any active round"
- `initialize_first_round` creates round 1
- `register_player` sets `current_round = game.round` (always >= 1)

### File Changes

**`register_player.rs`:**
1. Remove Anchor constraint `game_state.active` from account validation
2. Change `init` to `init_if_needed` on player_state PDA — handles both first-time and returning players
3. Add manual handler logic:
   ```
   // Auto-end check
   if clock >= game.timer_end && game.active:
       game.active = false
   if !game.active:
       return err!(GameNotActive)

   // If PDA already exists (returning player), require current_round == 0
   if player_state was not just initialized:
       require!(player.current_round == 0, PlayerAlreadyRegistered)

   // Set fields (same as before for new players, reset per-round for returning)
   player.current_round = game.round
   player.keys = 0
   player.last_dividend_checkpoint = 0  // removed in Change 2
   player.unclaimed_dividends_lamports = 0  // removed in Change 2
   player.referral_earnings_lamports = 0
   ```
4. Note: `init_if_needed` requires checking whether the account was freshly created or already existed. Use the pattern: check if `player.player == Pubkey::default()` (freshly initialized) vs already set (returning player).

**`buy_keys.rs`:**
1. Replace the manual `require!(game.active)` and `require!(clock < timer_end)` checks with:
   ```
   // Auto-end check
   if clock >= game.timer_end {
       if game.active {
           game.active = false;
       }
       return Ok(());  // No-op success — round is over
   }
   require!(game.active, GameNotActive);
   ```
2. Rest of buy logic unchanged (timer hasn't expired, game is active)

**`claim.rs`:**
1. Add auto-end check at the top:
   ```
   if clock >= game.timer_end && game.active {
       game.active = false;
   }
   ```
2. Block mid-round claims (since dividends are now end-of-round only — see Change 2):
   ```
   require!(!game.active, GameStillActive);
   ```
3. After payout, reset player state:
   ```
   player.keys = 0;
   player.current_round = 0;  // sentinel — prevents re-claim
   ```
4. Remove the `PlayerNotInRound` constraint? No — keep it. It prevents claiming from a round you're not in. After reset to 0, subsequent claims fail here.

**`claim_referral_earnings.rs`:**
1. Add auto-end check (same pattern)
2. No other changes — referral claims work during active or ended rounds
3. Do NOT reset `current_round` here (referral claims don't end participation)

**`settle_round.rs`:**
1. Add auto-end check on old_game_state
2. After settling, player transitions: `current_round = new_game.round`
3. If player already claimed (current_round == 0): modify constraint to allow settling from round 0
   - Change: `constraint = player_state.current_round == old_game_state.round`
   - To handler logic: `require!(player.current_round == old_game.round || player.current_round == 0)`
   - If current_round == 0: skip payout (already claimed), just join new round
   - If current_round == old_game.round: claim + join (existing behavior)

**`initialize_first_round.rs`:**
1. Change `new_game.round = 0` to `new_game.round = 1`
2. Update PDA seeds: `seeds = [b"game", 1u64.to_le_bytes().as_ref()]`

**`start_new_round.rs`:**
1. No changes needed — already uses `prev_game.round + 1` which will be 2, 3, etc.

---

## Change 2: Remove Dividend Accumulator — Simplify to Total Pool

### Current Behavior
- `dividends_per_key_accumulated: u128` in GameState — cumulative per-key dividend tracking
- `last_dividend_checkpoint: u128` in PlayerState — snapshot of accumulator at last interaction
- `unclaimed_dividends_lamports: u64` in PlayerState — pending dividends from accumulator deltas
- `calculate_dividend_increment()` and `calculate_pending_dividends()` in math.rs
- Players can claim dividends mid-round (fair because accumulator handles timing)

### Proposed Behavior
- **GameState** gets `total_dividend_pool: u64` — total lamports allocated to dividends this round
- **PlayerState** loses `last_dividend_checkpoint` and `unclaimed_dividends_lamports`
- On each `buy_keys`: add the dividend portion to `total_dividend_pool`
- On `claim` (end-of-round only): player gets `(player.keys * total_dividend_pool) / total_keys`
- After claiming: deduct from `total_dividend_pool` and reset player keys
- No mid-round dividend claims (simplified model doesn't handle late-buyer fairness)
- Rounding dust stays in `total_dividend_pool` (negligible)

### File Changes

**`game_state.rs`:**
1. Remove field: `dividends_per_key_accumulated: u128` (-16 bytes)
2. Add field: `total_dividend_pool: u64` (+8 bytes)
3. Update SPACE: 215 - 16 + 8 = **207**
4. Update space test

**`player_state.rs`:**
1. Remove field: `last_dividend_checkpoint: u128` (-16 bytes)
2. Remove field: `unclaimed_dividends_lamports: u64` (-8 bytes)
3. Update SPACE: 131 - 16 - 8 = **107**
4. Update space test

**`math.rs`:**
1. Remove function: `calculate_dividend_increment()`
2. Remove function: `calculate_pending_dividends()`
3. Add function: `calculate_dividend_share(player_keys: u64, total_dividend_pool: u64, total_keys: u64) -> Result<u64>`
   ```rust
   pub fn calculate_dividend_share(player_keys: u64, total_dividend_pool: u64, total_keys: u64) -> Result<u64> {
       if total_keys == 0 || player_keys == 0 {
           return Ok(0);
       }
       u64::try_from(
           (player_keys as u128)
               .checked_mul(total_dividend_pool as u128)
               .ok_or(FomoltError::Overflow)?
               .checked_div(total_keys as u128)
               .ok_or(FomoltError::Overflow)?
       ).map_err(|_| FomoltError::Overflow.into())
   }
   ```
4. Remove tests for deleted functions, add tests for new function
5. Update economic invariant tests

**`buy_keys.rs`:**
1. Remove dividend accumulator distribution logic (lines 169-213 approx)
2. Replace with: `game.total_dividend_pool += dividend_amount` (or effective_dividend after referral — see Change 3)
3. Remove snapshot/checkpoint logic (lines 216-229)
4. Keep: add keys, update game state, extend timer

**`claim.rs`:**
1. Remove accumulator-based dividend calculation
2. Replace with:
   ```rust
   let dividend_share = math::calculate_dividend_share(
       player.keys, game.total_dividend_pool, game.total_keys
   )?;
   ```
3. After payout: `game.total_dividend_pool -= dividend_share`
4. Remove: `player.unclaimed_dividends_lamports = 0` and `player.last_dividend_checkpoint = ...`

**`settle_round.rs`:**
1. Remove accumulator-based dividend calculation
2. Replace with same proportional calculation: `(keys * total_dividend_pool) / total_keys`
3. After payout from old round: `old_game.total_dividend_pool -= dividend_share`
4. Note: settle_round needs `old_game_state` to be `mut` (already is)

**`initialize_first_round.rs`:**
1. Replace `dividends_per_key_accumulated = 0` with `total_dividend_pool = 0`

**`start_new_round.rs`:**
1. Replace `dividends_per_key_accumulated = 0` with `total_dividend_pool = 0`

**`constants.rs`:**
1. `DIVIDEND_PRECISION` is no longer needed — can be removed

---

## Change 3: Restructure Fee Ordering (House Edge + Referral)

### Current Behavior
```
cost = bonding_curve_price
protocol_fee = cost * 200/10000 (2%)        → protocol_wallet
vault_amount = cost - protocol_fee           → vault
winner = cost * 4700/10000 (47%)             → winner_pot
dividend = cost * 4400/10000 (44%)           → accumulator
next_round = cost * 700/10000 (7%)           → next_round_pot
referral = dividend * 1000/10000 (10% of dividend = 4.4% of cost) → referrer

BPS validation: winner + dividend + next_round + protocol = 10000
```

### Proposed Behavior
```
cost = bonding_curve_price

Step 1: House edge (off the top)
  house_fee = cost * protocol_fee_bps / 10000  (e.g., 2%)
  after_fee = cost - house_fee
  house_fee → protocol_wallet (direct, never enters vault)

Step 2: Referral (from remainder, if applicable)
  if referrer exists and provided:
    referral = after_fee * referral_bonus_bps / 10000  (e.g., 10% of 98% = 9.8% of cost)
    pot_contribution = after_fee - referral
    referral → vault (tracked in referrer_state.referral_earnings_lamports)
  else:
    pot_contribution = after_fee

Step 3: Pot splits (from pot_contribution)
  winner_amount = pot_contribution * winner_bps / 10000
  dividend_amount = pot_contribution * dividend_bps / 10000
  next_round_amount = pot_contribution * next_round_bps / 10000

  All three → vault (tracked in game.winner_pot, game.total_dividend_pool, game.next_round_pot)

BPS validation: winner_bps + dividend_bps + next_round_bps = 10000
protocol_fee_bps is SEPARATE (not part of the 10000 sum)
referral_bonus_bps is SEPARATE (applied to after-fee amount)
```

### Default Values

| Parameter | Old Default | New Default | Notes |
|-----------|------------|-------------|-------|
| `protocol_fee_bps` | 200 (part of 10000 sum) | 200 (separate) | Same 2%, but now excluded from BPS sum |
| `winner_bps` | 4700 | 4800 | 48% of pot contribution |
| `dividend_bps` | 4400 | 4500 | 45% of pot contribution |
| `next_round_bps` | 700 | 700 | 7% of pot contribution |
| `referral_bonus_bps` | 1000 (10% of dividend) | 1000 (10% of after-fee) | Same 10%, but larger base |
| BPS sum | 10000 (4 values) | 10000 (3 values) | Protocol fee excluded |

### Effective Rates (with referrer)

| Bucket | % of gross cost |
|--------|----------------|
| House fee | 2.0% |
| Referral | 9.8% (10% of 98%) |
| Winner | 42.3% (48% of 88.2%) |
| Dividends | 39.7% (45% of 88.2%) |
| Next round | 6.2% (7% of 88.2%) |
| **Total** | **100.0%** |

### Effective Rates (no referrer)

| Bucket | % of gross cost |
|--------|----------------|
| House fee | 2.0% |
| Winner | 47.04% (48% of 98%) |
| Dividends | 44.1% (45% of 98%) |
| Next round | 6.86% (7% of 98%) |
| **Total** | **100.0%** |

### File Changes

**`math.rs`:**
1. Change `validate_bps_sum` to accept 3 parameters (remove protocol_fee_bps):
   ```rust
   pub fn validate_bps_sum(winner_bps: u64, dividend_bps: u64, next_round_bps: u64) -> Result<()>
   ```
2. Update all tests for validate_bps_sum

**`constants.rs`:**
1. Update defaults:
   - `DEFAULT_WINNER_BPS = 4800`
   - `DEFAULT_DIVIDEND_BPS = 4500`
   - `DEFAULT_NEXT_ROUND_BPS = 700`
   - `DEFAULT_PROTOCOL_FEE_BPS = 200` (unchanged)
   - `DEFAULT_REFERRAL_BONUS_BPS = 1000` (unchanged)
2. Remove `DIVIDEND_PRECISION` (from Change 2)

**`create_or_update_config.rs`:**
1. Update BPS validation call: `validate_bps_sum(winner, dividend, next_round)` — 3 params

**`buy_keys.rs`:**
Major rewrite of the fee distribution section:
1. Calculate house fee: `house_fee = cost * protocol_fee_bps / 10000`
2. Calculate after_fee: `after_fee = cost - house_fee`
3. Transfer house_fee to protocol_wallet (same as current)
4. Handle referral:
   - If player has referrer AND referrer_state provided:
     - `referral = after_fee * referral_bonus_bps / 10000`
     - Credit referrer: `referrer_state.referral_earnings_lamports += referral`
     - `pot_contribution = after_fee - referral`
   - Else:
     - `pot_contribution = after_fee`
5. Transfer `after_fee` to vault (the full after-fee amount, including referral which is owed from vault)
6. Calculate pot splits from pot_contribution:
   - `winner_amount = pot_contribution * winner_bps / 10000`
   - `dividend_amount = pot_contribution * dividend_bps / 10000`
   - `next_round_amount = pot_contribution * next_round_bps / 10000`
7. Update accumulators:
   - `game.winner_pot += winner_amount`
   - `game.total_dividend_pool += dividend_amount`
   - `game.next_round_pot += next_round_amount`

**Referral simplification:**
- Remove the complex referrer-in-current-round check
- Remove the "referrer exists but not in round → redirect to winner_pot" logic
- If player has a referrer: pay referral. If not: pot gets more. Simple.
- The `require!(referrer_state.is_some())` when `player.referrer.is_some()` stays (prevent omitting referrer account)

**First-buy edge case:**
- If `total_keys == 0` (first buy): dividend_amount has no one to distribute to
- In old model: added to winner_pot. In new model: add to `total_dividend_pool` anyway — the first buyer will hold all keys and get it all back at round end
- Actually, this works fine: total_dividend_pool += dividend_amount, and at claim time first_buyer.keys == total_keys, so they get 100%

---

## Supporting Changes

### Account Size Updates

| Account | Old Size | New Size | Delta |
|---------|----------|----------|-------|
| GlobalConfig | 137 | 137 | 0 (no field changes) |
| GameState | 215 | 207 | -8 (remove u128, add u64) |
| PlayerState | 131 | 107 | -24 (remove u128, remove u64) |

### Error Codes

| Error | Change |
|-------|--------|
| `TimerExpired` | No longer returned by buy_keys (auto-end returns Ok instead) |
| `GameStillActive` | Now also returned by `claim` during active round |
| `PlayerAlreadyRegistered` | Repurposed: returned when existing player tries to register but current_round != 0 |

No new error codes needed.

### Events

- `RoundConcluded` — may want to emit this on auto-end. Or defer to when winner claims.
  - Recommendation: do NOT emit on auto-end (it's a state flag flip, not a round conclusion). Emit when winner claims or when start_new_round handles empty rounds.
- No other event changes needed.

### IDL Regeneration
- After all changes: `anchor build` regenerates IDL
- Copy updated IDL to `idl/fomolt3d.json` and `app/src/lib/idl.json`
- Regenerate TypeScript types in `app/src/lib/idl-types.ts`

---

## Implementation Order

Changes have dependencies — implement in this order:

### Phase A: State Structs (no instruction changes yet)
1. Update `GameState`: remove `dividends_per_key_accumulated`, add `total_dividend_pool`, update SPACE
2. Update `PlayerState`: remove `last_dividend_checkpoint`, remove `unclaimed_dividends_lamports`, update SPACE
3. Update `constants.rs`: remove `DIVIDEND_PRECISION`, update BPS defaults
4. Update `math.rs`: remove `calculate_dividend_increment`, `calculate_pending_dividends`, add `calculate_dividend_share`, change `validate_bps_sum` to 3 params, update all tests
5. Verify: `cargo test --lib` for math module tests

### Phase B: Fee Ordering (buy_keys rewrite)
1. Update `create_or_update_config.rs`: BPS validation to 3 params
2. Rewrite `buy_keys.rs` fee distribution:
   - House fee → protocol_wallet
   - Referral from after_fee → referrer_state
   - Pot splits from pot_contribution → game state
   - Remove accumulator logic
   - Remove dividend snapshot/checkpoint logic
   - Add auto-end check (Change 1)
3. Verify: `cargo build`

### Phase C: Round Lifecycle (remaining instructions)
1. Update `initialize_first_round.rs`: round = 1, remove accumulator init, add dividend_pool init
2. Update `start_new_round.rs`: remove accumulator init, add dividend_pool init
3. Update `register_player.rs`: `init_if_needed`, remove Anchor active constraint, add auto-end + manual active check, handle returning players (current_round == 0)
4. Rewrite `claim.rs`: auto-end check, require !active, proportional dividend share, winner payout, reset current_round to 0
5. Update `claim_referral_earnings.rs`: add auto-end check
6. Update `settle_round.rs`: proportional dividends from old round, handle current_round == 0 case, deduct from old_game.total_dividend_pool
7. Verify: `cargo build`

### Phase D: Tests
1. Update all unit tests in `math.rs` (already partly done in Phase A)
2. Update scenario tests: adapt to new round numbering (1-based), new fee structure, end-of-round-only claims
3. Add new test cases:
   - Auto-end: buy after timer expires → Ok() no-op
   - Auto-end: claim after timer expires → auto-ends then claims
   - Double-claim prevention: claim → claim again → PlayerNotInRound
   - Fee ordering: verify house_fee + referral + pot_splits == cost
   - Returning player: claim → register_player (init_if_needed) → buy in new round
   - settle_round after claim (current_round == 0) → joins new round without double-payout
4. Verify: `cargo test --workspace`

### Phase E: Build & IDL
1. `anchor build` — clean build
2. Export IDL, copy to app directories
3. Update TypeScript types

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `init_if_needed` re-init attack on PlayerState | Check: if account exists, require `current_round == 0` before allowing re-initialization |
| Rounding dust in `total_dividend_pool` | Negligible (< total_keys lamports per round). Stays in vault, carried over or trapped. |
| No mid-round dividend claims | Intentional simplification. "We can always solve this later." |
| Larger referral amount (9.8% vs 4.4% of cost) | Intentional. Referral is now a top-line deduction, making referrals more attractive. |
| Round 0 sentinel conflicts with existing data | No existing deployed data — program not yet on devnet. Clean slate. |
| settle_round complexity with two modes | Both modes are well-defined: current_round == old_round (claim + transition) vs current_round == 0 (transition only). |
| All 120+ tests need updating | Expected. State struct changes propagate everywhere. Tests are the bulk of the work. |

---

## Vault Accounting Invariant

After all changes, the vault for each round holds:

```
vault_balance = winner_pot
             + total_dividend_pool
             + next_round_pot
             + sum(unclaimed_referral_earnings across all players in this round)
             + rounding_dust
```

On each buy:
```
vault_receives = cost - house_fee
               = pot_contribution + referral (if applicable)
               = winner_amount + dividend_amount + next_round_amount + referral
```

This must balance at all times. The economic invariant test (Phase D) must verify this.
