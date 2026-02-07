use anchor_lang::prelude::*;

use crate::errors::FomoltError;

/// Calculate total cost for buying `n` keys starting from supply `k`.
/// Uses the closed-form arithmetic series formula with u128 intermediates.
/// cost = n * base_price + price_increment * n * (2k + n - 1) / 2
pub fn calculate_cost(
    current_supply: u64,
    keys_to_buy: u64,
    base_price: u64,
    price_increment: u64,
) -> Result<u64> {
    let n = keys_to_buy as u128;
    let k = current_supply as u128;
    let base = base_price as u128;
    let inc = price_increment as u128;

    let base_cost = n.checked_mul(base).ok_or(FomoltError::Overflow)?;

    let series_numerator = n
        .checked_mul(
            k.checked_mul(2)
                .ok_or(FomoltError::Overflow)?
                .checked_add(n)
                .ok_or(FomoltError::Overflow)?
                .checked_sub(1)
                .ok_or(FomoltError::Overflow)?,
        )
        .ok_or(FomoltError::Overflow)?;

    let series_cost = inc
        .checked_mul(series_numerator)
        .ok_or(FomoltError::Overflow)?
        .checked_div(2)
        .ok_or(FomoltError::Overflow)?;

    let total = base_cost
        .checked_add(series_cost)
        .ok_or(FomoltError::Overflow)?;

    u64::try_from(total).map_err(|_| FomoltError::Overflow.into())
}

/// Calculate a BPS-based revenue split: amount * bps / 10_000
pub fn calculate_bps_split(amount: u64, bps: u64) -> Result<u64> {
    u64::try_from(
        (amount as u128)
            .checked_mul(bps as u128)
            .ok_or(FomoltError::Overflow)?
            .checked_div(10_000)
            .ok_or(FomoltError::Overflow)?,
    )
    .map_err(|_| FomoltError::Overflow.into())
}

/// Calculate a player's proportional dividend share at round end.
/// Returns: (player_keys * total_dividend_pool) / total_keys
pub fn calculate_dividend_share(
    player_keys: u64,
    total_dividend_pool: u64,
    total_keys: u64,
) -> Result<u64> {
    if total_keys == 0 || player_keys == 0 {
        return Ok(0);
    }
    u64::try_from(
        (player_keys as u128)
            .checked_mul(total_dividend_pool as u128)
            .ok_or(FomoltError::Overflow)?
            .checked_div(total_keys as u128)
            .ok_or(FomoltError::Overflow)?,
    )
    .map_err(|_| FomoltError::Overflow.into())
}

/// Calculate the new timer_end after a key purchase.
/// Timer can only increase (monotonic), capped at round_start + max_timer_secs.
pub fn calculate_timer_extension(
    current_time: i64,
    extension_secs: i64,
    current_timer_end: i64,
    round_start: i64,
    max_timer_secs: i64,
) -> Result<i64> {
    let new_timer = current_time
        .checked_add(extension_secs)
        .ok_or(FomoltError::Overflow)?;
    let max_timer = round_start
        .checked_add(max_timer_secs)
        .ok_or(FomoltError::Overflow)?;
    Ok(new_timer.max(current_timer_end).min(max_timer))
}

/// Validate that pot-split BPS values sum to 10_000.
/// Protocol fee and referral bonus are separate — not included in this sum.
pub fn validate_bps_sum(
    winner_bps: u64,
    dividend_bps: u64,
    next_round_bps: u64,
) -> Result<()> {
    let sum = winner_bps
        .checked_add(dividend_bps)
        .ok_or(FomoltError::Overflow)?
        .checked_add(next_round_bps)
        .ok_or(FomoltError::Overflow)?;
    require!(sum == 10_000, FomoltError::InvalidConfig);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== calculate_cost tests =====

    #[test]
    fn cost_first_key() {
        let cost = calculate_cost(0, 1, 10_000_000, 1_000_000).unwrap();
        // cost = 1 * 10M + 1M * 1 * (0 + 1 - 1) / 2 = 10M + 0 = 10M
        assert_eq!(cost, 10_000_000);
    }

    #[test]
    fn cost_second_key() {
        let cost = calculate_cost(1, 1, 10_000_000, 1_000_000).unwrap();
        // cost = 1 * 10M + 1M * 1 * (2 + 1 - 1) / 2 = 10M + 1M = 11M
        assert_eq!(cost, 11_000_000);
    }

    #[test]
    fn cost_batch_of_10_from_zero() {
        let cost = calculate_cost(0, 10, 10_000_000, 1_000_000).unwrap();
        // cost = 10 * 10M + 1M * 10 * (0 + 10 - 1) / 2
        //      = 100M + 1M * 10 * 9 / 2 = 100M + 45M = 145M
        assert_eq!(cost, 145_000_000);
    }

    #[test]
    fn cost_batch_of_5_from_supply_100() {
        let cost = calculate_cost(100, 5, 10_000_000, 1_000_000).unwrap();
        // cost = 5 * 10M + 1M * 5 * (200 + 5 - 1) / 2
        //      = 50M + 1M * 5 * 204 / 2 = 50M + 510M = 560M
        assert_eq!(cost, 560_000_000);
    }

    #[test]
    fn cost_at_high_supply() {
        let cost = calculate_cost(1000, 1, 10_000_000, 1_000_000).unwrap();
        // cost = 1 * 10M + 1M * 1 * (2000 + 1 - 1) / 2 = 10M + 1000M = 1.01B
        assert_eq!(cost, 1_010_000_000);
    }

    #[test]
    fn cost_no_overflow_at_100k_supply() {
        let result = calculate_cost(100_000, 1, 10_000_000, 1_000_000);
        assert!(result.is_ok());
    }

    #[test]
    fn cost_custom_params() {
        let cost = calculate_cost(0, 1, 5_000_000, 500_000).unwrap();
        assert_eq!(cost, 5_000_000);
    }

    #[test]
    fn cost_sum_matches_individual() {
        // Buying 5 keys at once should cost the same as buying them one at a time
        let batch_cost = calculate_cost(10, 5, 10_000_000, 1_000_000).unwrap();
        let mut individual_total = 0u64;
        for i in 0..5u64 {
            individual_total += calculate_cost(10 + i, 1, 10_000_000, 1_000_000).unwrap();
        }
        assert_eq!(batch_cost, individual_total);
    }

    #[test]
    fn cost_zero_keys_underflows() {
        // n=0 causes (2k + 0 - 1) to underflow when k=0
        let result = calculate_cost(0, 0, 10_000_000, 1_000_000);
        assert!(result.is_err());
    }

    #[test]
    fn cost_zero_base_price() {
        let cost = calculate_cost(0, 1, 0, 1_000_000).unwrap();
        // cost = 0 + 1M * 1 * (0) / 2 = 0
        assert_eq!(cost, 0);
    }

    #[test]
    fn cost_zero_increment() {
        let cost = calculate_cost(100, 5, 10_000_000, 0).unwrap();
        // cost = 5 * 10M + 0 = 50M — flat price regardless of supply
        assert_eq!(cost, 50_000_000);
    }

    #[test]
    fn cost_large_batch() {
        // 1000 keys from supply 0
        let cost = calculate_cost(0, 1000, 10_000_000, 1_000_000).unwrap();
        // cost = 1000 * 10M + 1M * 1000 * 999 / 2 = 10B + 499.5B = ~509.5B
        let expected = 10_000_000_000u64 + 499_500_000_000u64;
        assert_eq!(cost, expected);
    }

    // ===== calculate_bps_split tests =====

    #[test]
    fn bps_split_standard_winner() {
        // 48% of 1 SOL
        let result = calculate_bps_split(1_000_000_000, 4800).unwrap();
        assert_eq!(result, 480_000_000);
    }

    #[test]
    fn bps_split_standard_dividend() {
        // 45% of 1 SOL
        let result = calculate_bps_split(1_000_000_000, 4500).unwrap();
        assert_eq!(result, 450_000_000);
    }

    #[test]
    fn bps_split_standard_next_round() {
        // 7% of 1 SOL
        let result = calculate_bps_split(1_000_000_000, 700).unwrap();
        assert_eq!(result, 70_000_000);
    }

    #[test]
    fn bps_splits_sum_equals_total() {
        let cost = 1_000_000_000u64; // 1 SOL
        let winner = calculate_bps_split(cost, 4800).unwrap();
        let dividend = calculate_bps_split(cost, 4500).unwrap();
        let next_round = calculate_bps_split(cost, 700).unwrap();
        assert_eq!(winner + dividend + next_round, cost);
    }

    #[test]
    fn bps_split_zero_amount() {
        let result = calculate_bps_split(0, 4800).unwrap();
        assert_eq!(result, 0);
    }

    #[test]
    fn bps_split_zero_bps() {
        let result = calculate_bps_split(1_000_000_000, 0).unwrap();
        assert_eq!(result, 0);
    }

    #[test]
    fn bps_split_full_10000() {
        let result = calculate_bps_split(1_000_000_000, 10_000).unwrap();
        assert_eq!(result, 1_000_000_000);
    }

    #[test]
    fn bps_split_small_amount_precision() {
        // 100 lamports * 4500 bps = 45 lamports (integer division)
        let result = calculate_bps_split(100, 4500).unwrap();
        assert_eq!(result, 45);
    }

    #[test]
    fn bps_split_rounding() {
        // 99 lamports * 4800 bps / 10000 = 47.52 → truncated to 47
        let result = calculate_bps_split(99, 4800).unwrap();
        assert_eq!(result, 47);
    }

    #[test]
    fn bps_referral_bonus_from_after_fee() {
        // Referral bonus is 10% (1000 bps) of after-fee amount
        let cost = 1_000_000_000u64;
        let house_fee = calculate_bps_split(cost, 200).unwrap(); // 2%
        let after_fee = cost - house_fee; // 980M
        let referral = calculate_bps_split(after_fee, 1000).unwrap();
        assert_eq!(referral, 98_000_000); // 9.8% of gross cost
    }

    // ===== calculate_dividend_share tests =====

    #[test]
    fn dividend_share_single_holder() {
        // Only holder gets entire pool
        let share = calculate_dividend_share(10, 1_000_000_000, 10).unwrap();
        assert_eq!(share, 1_000_000_000);
    }

    #[test]
    fn dividend_share_equal_holders() {
        // Two equal holders split evenly
        let share = calculate_dividend_share(50, 1_000_000_000, 100).unwrap();
        assert_eq!(share, 500_000_000);
    }

    #[test]
    fn dividend_share_proportional() {
        let pool = 1_000_000_000u64;
        let total = 100u64;

        let share_30 = calculate_dividend_share(30, pool, total).unwrap();
        let share_70 = calculate_dividend_share(70, pool, total).unwrap();

        assert_eq!(share_30, 300_000_000); // 30%
        assert_eq!(share_70, 700_000_000); // 70%
        assert_eq!(share_30 + share_70, pool); // conserved
    }

    #[test]
    fn dividend_share_zero_keys() {
        let share = calculate_dividend_share(0, 1_000_000_000, 100).unwrap();
        assert_eq!(share, 0);
    }

    #[test]
    fn dividend_share_zero_pool() {
        let share = calculate_dividend_share(50, 0, 100).unwrap();
        assert_eq!(share, 0);
    }

    #[test]
    fn dividend_share_zero_total_keys() {
        let share = calculate_dividend_share(50, 1_000_000_000, 0).unwrap();
        assert_eq!(share, 0);
    }

    #[test]
    fn dividend_share_rounding_dust() {
        // 3 holders with 1 key each, pool = 100 lamports
        // Each gets 33, total claimed = 99, dust = 1
        let s1 = calculate_dividend_share(1, 100, 3).unwrap();
        let s2 = calculate_dividend_share(1, 100, 3).unwrap();
        let s3 = calculate_dividend_share(1, 100, 3).unwrap();
        assert_eq!(s1, 33);
        assert_eq!(s2, 33);
        assert_eq!(s3, 33);
        assert_eq!(s1 + s2 + s3, 99); // 1 lamport dust
    }

    #[test]
    fn dividend_share_large_pool() {
        // 100k keys, 1000 SOL pool
        let pool = 1_000_000_000_000u64; // 1000 SOL
        let share = calculate_dividend_share(1000, pool, 100_000).unwrap();
        assert_eq!(share, 10_000_000_000); // 1% of 1000 SOL = 10 SOL
    }

    #[test]
    fn dividend_share_all_keys() {
        // Player holds all keys
        let share = calculate_dividend_share(100, 500_000_000, 100).unwrap();
        assert_eq!(share, 500_000_000);
    }

    // ===== calculate_timer_extension tests =====

    #[test]
    fn timer_extension_basic() {
        let result = calculate_timer_extension(
            1000, // current_time
            30,   // extension_secs
            1020, // current_timer_end
            0,    // round_start
            86400, // max_timer_secs
        )
        .unwrap();
        // new_timer = 1030, max = 86400
        // max(1030, 1020) = 1030, min(1030, 86400) = 1030
        assert_eq!(result, 1030);
    }

    #[test]
    fn timer_cannot_decrease() {
        let result = calculate_timer_extension(
            500,  // current_time (early)
            30,   // extension_secs
            1000, // current_timer_end (already far ahead)
            0,
            86400,
        )
        .unwrap();
        // new_timer = 530, but current is 1000
        // max(530, 1000) = 1000 (timer doesn't decrease)
        assert_eq!(result, 1000);
    }

    #[test]
    fn timer_capped_at_max() {
        let result = calculate_timer_extension(
            86390, // current_time (near max)
            30,    // extension
            86400, // current_timer_end
            0,     // round_start
            86400, // max_timer_secs
        )
        .unwrap();
        // new_timer = 86420, max = 86400
        // max(86420, 86400) = 86420, min(86420, 86400) = 86400
        assert_eq!(result, 86400);
    }

    #[test]
    fn timer_exactly_at_max() {
        let result = calculate_timer_extension(
            86370,
            30,
            86300,
            0,
            86400,
        )
        .unwrap();
        assert_eq!(result, 86400);
    }

    #[test]
    fn timer_with_nonzero_round_start() {
        let round_start = 1_000_000i64;
        let result = calculate_timer_extension(
            1_086_370,
            30,
            1_086_300,
            round_start,
            86_400,
        )
        .unwrap();
        assert_eq!(result, 1_086_400);
    }

    #[test]
    fn timer_sequential_purchases_monotonic() {
        let round_start = 0i64;
        let max_timer = 86_400i64;
        let extension = 30i64;

        let mut timer_end = max_timer;

        for i in 0..100 {
            let current_time = i * 100;
            let new_end = calculate_timer_extension(
                current_time,
                extension,
                timer_end,
                round_start,
                max_timer,
            )
            .unwrap();
            assert!(new_end >= timer_end, "Timer decreased at purchase {}", i);
            timer_end = new_end;
        }
    }

    // ===== validate_bps_sum tests =====

    #[test]
    fn bps_sum_valid_default() {
        // 4800 + 4500 + 700 = 10000
        let result = validate_bps_sum(4800, 4500, 700);
        assert!(result.is_ok());
    }

    #[test]
    fn bps_sum_valid_equal_split() {
        // Not exactly equal but sums to 10000
        let result = validate_bps_sum(3334, 3333, 3333);
        assert!(result.is_ok());
    }

    #[test]
    fn bps_sum_invalid_under() {
        let result = validate_bps_sum(4800, 4500, 600);
        assert!(result.is_err());
    }

    #[test]
    fn bps_sum_invalid_over() {
        let result = validate_bps_sum(5000, 4500, 700);
        assert!(result.is_err());
    }

    #[test]
    fn bps_sum_all_winner() {
        let result = validate_bps_sum(10_000, 0, 0);
        assert!(result.is_ok());
    }

    #[test]
    fn bps_sum_zero_all() {
        let result = validate_bps_sum(0, 0, 0);
        assert!(result.is_err());
    }

    // ===== Economic invariant tests =====

    #[test]
    fn fee_ordering_conserves_funds() {
        let cost = 1_000_000_000u64; // 1 SOL

        // Step 1: House fee off the top
        let house_fee = calculate_bps_split(cost, 200).unwrap(); // 2%
        let after_fee = cost - house_fee;

        // Step 2: Referral from remainder
        let referral = calculate_bps_split(after_fee, 1000).unwrap(); // 10% of 98%
        let pot_contribution = after_fee - referral;

        // Step 3: Pot splits
        let winner = calculate_bps_split(pot_contribution, 4800).unwrap();
        let dividend = calculate_bps_split(pot_contribution, 4500).unwrap();
        let next_round = calculate_bps_split(pot_contribution, 700).unwrap();

        // All pieces should sum to original cost
        let total = house_fee + referral + winner + dividend + next_round;
        assert_eq!(total, cost);
    }

    #[test]
    fn fee_ordering_no_referrer_conserves_funds() {
        let cost = 1_000_000_000u64; // 1 SOL

        let house_fee = calculate_bps_split(cost, 200).unwrap();
        let pot_contribution = cost - house_fee; // full after_fee goes to pot

        let winner = calculate_bps_split(pot_contribution, 4800).unwrap();
        let dividend = calculate_bps_split(pot_contribution, 4500).unwrap();
        let next_round = calculate_bps_split(pot_contribution, 700).unwrap();

        let total = house_fee + winner + dividend + next_round;
        assert_eq!(total, cost);
    }

    #[test]
    fn fee_ordering_various_costs() {
        let costs = [1u64, 100, 999, 10_000_000, 1_000_000_000, 10_000_000_000];
        for cost in costs {
            let house_fee = calculate_bps_split(cost, 200).unwrap();
            let after_fee = cost - house_fee;
            let referral = calculate_bps_split(after_fee, 1000).unwrap();
            let pot = after_fee - referral;

            let winner = calculate_bps_split(pot, 4800).unwrap();
            let dividend = calculate_bps_split(pot, 4500).unwrap();
            let next_round = calculate_bps_split(pot, 700).unwrap();

            let accounted = house_fee + referral + winner + dividend + next_round;
            // With rounding, accounted should be <= cost
            assert!(
                accounted <= cost,
                "Overcount at cost {}: accounted {}",
                cost,
                accounted
            );
            // Rounding loss should be tiny (< 3 lamports from 3 division steps)
            assert!(
                cost - accounted <= 3,
                "Too much dust at cost {}: lost {}",
                cost,
                cost - accounted
            );
        }
    }

    #[test]
    fn dividend_distribution_fair_share() {
        // With N equal key holders, each gets 1/N of dividends
        let total_keys = 5u64;
        let dividend_pool = 1_000_000_000u64; // 1 SOL

        let per_holder = calculate_dividend_share(1, dividend_pool, total_keys).unwrap();
        assert_eq!(per_holder, 200_000_000);

        let total_claimed = calculate_dividend_share(total_keys, dividend_pool, total_keys).unwrap();
        assert_eq!(total_claimed, dividend_pool);
    }

    #[test]
    fn cost_increases_with_supply() {
        let base_price = 10_000_000u64;
        let increment = 1_000_000u64;

        let cost_at_0 = calculate_cost(0, 1, base_price, increment).unwrap();
        let cost_at_100 = calculate_cost(100, 1, base_price, increment).unwrap();
        let cost_at_1000 = calculate_cost(1000, 1, base_price, increment).unwrap();

        assert!(cost_at_0 < cost_at_100);
        assert!(cost_at_100 < cost_at_1000);
    }
}
