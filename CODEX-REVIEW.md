# Codex Review Findings (Feb 6, 2026)

This file captures the latest audit findings for the FOMolt3D program and its LiteSVM test coverage.

## Finding 3
**File:** `programs/fomolt3d/src/instructions/buy_keys.rs:59`  
**Severity:** P1  
**Title:** `RoundConcluded` emitted before winner claims  
**Detail:** `buy_keys` emits `RoundConcluded` when the timer expires (auto-end), even though `winner_claimed` is still false. The same event can be emitted again on winner claim, and also from `start_new_round` and `claim_referral_earnings`. This creates misleading double/multiple “conclusion” events.  
**Codex Suggestion:** Emit `RoundConcluded` only when the winner is actually paid or when an empty round is definitively closed. Use a distinct “RoundExpired” event for auto-end if needed.
**Human comment:** `RoundConcluded` SHOULD be emitted when the timer expires for the first time and the status is changed. It should not be possible for it to be emitted again for the same round. Confirm this. If this is correct, then there is no need to wait for the winner to be paid, and no need for a second event.

## Finding 4
**File:** `programs/fomolt3d/src/instructions/claim.rs:117`  
**Severity:** P1  
**Title:** Referral earnings become unclaimable after claim  
**Detail:** `claim` sets `current_round = 0`, which blocks `claim_referral_earnings` (it requires `current_round == game.round`). This makes any pending referrals unclaimable unless the player claimed them *before* claiming dividends/winner.  
**Codex Suggestion:** Either pay referral earnings inside `claim`, relax the `claim_referral_earnings` round constraint for `current_round == 0`, or prevent claiming dividends if referral earnings are non‑zero.
**Human comment:** `claim_referral_earnings` should be possible regardless of the  `current_round` or `status`. Tracking to avoid double spend of the earnings only requires the player's earnings to be updated, which is agnostic to round. This value should NOT be reset as part of a `claim` for any given round.

## Finding 5
**File:** `programs/fomolt3d/src/instructions/buy_keys.rs:118`  
**Severity:** P1  
**Title:** Referral earnings can migrate across rounds and drain the wrong vault  
**Detail:** When a player re-enters a new round (current_round == 0), `buy_keys` does not clear `referral_earnings_lamports`. Later, `claim_referral_earnings` will pay from the *current* round’s vault even if those earnings were accrued in a prior round’s vault. This can fail or steal funds from a new round.  
**Codex Suggestion:** Track referral earnings per‑round, force a claim before re-entry, or pay referral earnings from the specific round’s vault.
**Human comment:** WRONG. Earnings are agnostic to round and can be carried across rounds and can accrue to a referral account which has `current_round` equal to ANY round.

## Finding 6
**File:** `programs/fomolt3d/src/instructions/start_new_round.rs:85`  
**Severity:** P1  
**Title:** Liveness risk: game can stall if winner disappears  
**Detail:** For non‑empty rounds, `start_new_round` requires `winner_claimed`, and only the winner can claim. If the winner disappears, the game is permanently stuck.  
**Suggestion:** Add a permissionless/admin fallback after a grace period (e.g., allow start_new_round after N slots with forfeiture).
**Human comment:** WRONG. The next round should be capable of being started without the winner claiming. Make sure this is the case. It shouldn't matter if the winner never claims for a past round.

## Finding 8
**File:** `programs/fomolt3d/src/instructions/create_or_update_config.rs:52`  
**Severity:** P2  
**Title:** Missing protocol_fee_bps upper bound  
**Detail:** `protocol_fee_bps` is not validated. Values > 10,000 underflow `after_fee` and brick buys.  
**Suggestion:** Enforce `protocol_fee_bps <= 10_000` (and ideally `<= 5_000` or other policy limit).
**Human comment:** Good idea.

## Finding 9
**File:** `programs/fomolt3d/src/instructions/buy_keys.rs:200`  
**Severity:** P2  
**Title:** Referrer can accrue while not in-round  
**Detail:** Referral earnings are credited without verifying the referrer is in the current round. If they never re-enter, those earnings become stuck or are paid from the wrong vault (see Finding 5).  
**Codex Suggestion:** Require `referrer_state.current_round == game.round` or document the intended claim flow with explicit tests.
**Human comment:** WRONG. Earnings are agnostic to round and can be carried across rounds and can accrue to a referral account which has `current_round` equal to ANY round.

## Finding 10
**File:** `programs/fomolt3d/tests/test_unclaimed_cross_round.rs:33`  
**Severity:** P2  
**Title:** Test expects referral claims after `current_round = 0`  
**Detail:** The test claims dividends (which sets `current_round = 0`) and then expects `claim_referral_earnings` to succeed for the old round. The program forbids this, so the test is inconsistent with current behavior.  
**Codex Suggestion:** Update the test to reflect the intended referral‑claim flow, or fix the program to allow referral claims after `current_round == 0` (see Finding 4).
**Human comment:** `claim_referral_earnings` should NOT be reset to 0 because of a `claim`. They should only ever be reduced for a `claim_referral_earnings`.

## Finding 11
**File:** `programs/fomolt3d/tests/test_lifecycle.rs:297`  
**Severity:** P2  
**Title:** Test contradicts no‑deduction dividend model  
**Detail:** This test asserts `total_dividend_pool == 0` after claim, but the program intentionally keeps the pool constant through claims (and other tests assume that).  
**Codex Suggestion:** Align the test to the actual model, or change the program to drain the pool on claim.
**Human comment:** Correct. The `total_dividend_pool` should not be reduced as part of the `claim` process.

