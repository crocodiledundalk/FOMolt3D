// Integration tests: dividend proportionality, precision, edge cases
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_single_holder_gets_full_pool() {
    // P1 holds all keys. Claims full total_dividend_pool.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 10, &pw, None);

    let game = get_game(&svm, 1);
    let div_pool = game.total_dividend_pool;
    assert!(div_pool > 0, "Dividend pool should be > 0");

    expire_round(&mut svm, 1);

    let bal_before = get_balance(&svm, &player.pubkey());
    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();
    let bal_after = get_balance(&svm, &player.pubkey());

    let received = bal_after + 5000 - bal_before; // add back tx fee
    let expected = game.winner_pot + div_pool;

    assert_eq!(
        received, expected,
        "Single holder should get winner_pot + full dividend pool: received={}, expected={}",
        received, expected
    );

    // With no-deduction model, pool value stays constant in game state
    // (double-claim prevented by current_round = 0 sentinel, not by pool deduction)
    let game_after = get_game(&svm, 1);
    assert_eq!(
        game_after.total_dividend_pool, div_pool,
        "Pool should stay constant (no deduction on claim)"
    );
}

#[test]
fn test_unequal_holdings_proportional() {
    // P1 = 1 key, P2 = 99 keys. P1 claims first. P2 gets much more.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    buy(&mut svm, &p1, 1, 1, &pw, None);
    buy(&mut svm, &p2, 1, 99, &pw, None); // p2 = winner, has 99 keys

    let game = get_game(&svm, 1);
    let total_keys = game.total_keys;
    assert_eq!(total_keys, 100);

    expire_round(&mut svm, 1);

    // P1 claims first (non-winner, 1 key out of 100)
    let p1_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_after = get_balance(&svm, &p1.pubkey());
    let p1_dividends = p1_after + 5000 - p1_before;

    svm.expire_blockhash();

    // P2 claims (winner, 99 keys)
    let game_before_p2 = get_game(&svm, 1);
    let p2_before = get_balance(&svm, &p2.pubkey());
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    let p2_after = get_balance(&svm, &p2.pubkey());
    let p2_total = p2_after + 5000 - p2_before;
    let p2_dividends = p2_total - game_before_p2.winner_pot;

    // P2's dividend share should be exactly 99x P1's (no first-claimer advantage)
    // P1 = 1/100 of pool, P2 = 99/100 of pool
    assert_eq!(
        p2_dividends, p1_dividends * 99,
        "P2 (99 keys) should get exactly 99x P1 (1 key): P1={}, P2={}",
        p1_dividends,
        p2_dividends
    );
}

#[test]
fn test_first_buy_dividend_to_pool() {
    // First buyer's dividend goes to total_dividend_pool.
    // First buyer can reclaim it at round end.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let game_before = get_game(&svm, 1);
    assert_eq!(game_before.total_dividend_pool, 0);

    buy(&mut svm, &player, 1, 1, &pw, None);

    let game_after = get_game(&svm, 1);
    assert!(
        game_after.total_dividend_pool > 0,
        "First buy should add to dividend pool even with no other holders"
    );

    // Player can reclaim at round end
    expire_round(&mut svm, 1);

    let bal_before = get_balance(&svm, &player.pubkey());
    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();
    let bal_after = get_balance(&svm, &player.pubkey());

    // Player should get dividends back + winner_pot
    assert!(
        bal_after + 5000 > bal_before,
        "First buyer should reclaim their own dividends"
    );
}

#[test]
fn test_50_buys_accumulation_correct() {
    // 50 sequential buys. Verify total_dividend_pool == sum(dividend_amount) across all buys.
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..5).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    let mut expected_total_dividends = 0u64;
    let mut supply = 0u64;

    for i in 0..50 {
        let cost = expected_cost(supply, 1);
        let after_fee = expected_after_fee(cost);
        let pot_contribution = expected_pot_contribution(after_fee, false);
        let dividend = expected_dividend_amount(pot_contribution);
        expected_total_dividends += dividend;
        supply += 1;

        svm.expire_blockhash();
        buy(&mut svm, &players[i % 5], 1, 1, &pw, None);
    }

    let game = get_game(&svm, 1);
    assert_eq!(
        game.total_dividend_pool, expected_total_dividends,
        "Dividend pool mismatch after 50 buys: actual={}, expected={}",
        game.total_dividend_pool, expected_total_dividends
    );
}

#[test]
fn test_late_joiner_shares_full_pool() {
    // The dividend model is pool-based. All holders share the entire pool proportionally
    // at claim time, regardless of when they joined.
    let (mut svm, _admin, pw) = setup_game();

    let early_buyer = Keypair::new();
    let late_joiner = Keypair::new();
    register(&mut svm, &early_buyer, 1, false, None);
    register(&mut svm, &late_joiner, 1, false, None);

    // Early buyer generates a large dividend pool
    buy(&mut svm, &early_buyer, 1, 20, &pw, None);

    let pool_before_late = get_game(&svm, 1).total_dividend_pool;
    assert!(pool_before_late > 0);

    // Late joiner buys same amount of keys
    buy(&mut svm, &late_joiner, 1, 20, &pw, None); // late_joiner = winner

    let game = get_game(&svm, 1);
    // Both have 20 keys each out of 40 total = 50% each
    assert_eq!(game.total_keys, 40);

    expire_round(&mut svm, 1);

    // Early buyer claims first
    let e_before = get_balance(&svm, &early_buyer.pubkey());
    let ix = claim_ix(&early_buyer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &early_buyer, &[&early_buyer]).unwrap();
    let e_after = get_balance(&svm, &early_buyer.pubkey());
    let early_dividends = e_after + 5000 - e_before;

    // Late joiner also gets a proportional share of the ENTIRE pool
    // (even dividends accumulated before they joined)
    assert!(
        early_dividends > 0,
        "Early buyer should get dividends"
    );

    // With no deduction, equal keys = equal dividends = exactly 50% of pool
    let expected_half = game.total_dividend_pool / 2;
    assert!(
        early_dividends >= expected_half - 1 && early_dividends <= expected_half + 1,
        "Early buyer with 50% keys should get exactly 50% of pool: got={}, expected={}",
        early_dividends,
        expected_half
    );
}

#[test]
fn test_3_way_equal_split_rounding() {
    // 3 players with equal keys. dividend_pool / 3 has remainder. Verify dust ≤ 2.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &p3, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 10, &pw, None);
    buy(&mut svm, &p3, 1, 10, &pw, None); // p3 = winner

    let game = get_game(&svm, 1);
    let initial_pool = game.total_dividend_pool;

    expire_round(&mut svm, 1);

    // All 3 claim
    let mut total_div_claimed = 0u64;
    let winner_pot = game.winner_pot;

    for (i, p) in [&p1, &p2, &p3].iter().enumerate() {
        svm.expire_blockhash();
        let before = get_balance(&svm, &p.pubkey());
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm, &[ix], p, &[p]).unwrap();
        let after = get_balance(&svm, &p.pubkey());
        let received = after + 5000 - before;
        if i == 2 {
            // Winner: subtract winner_pot
            total_div_claimed += received - winner_pot;
        } else {
            total_div_claimed += received;
        }
    }

    // With no-deduction model, all 3 get equal shares. Total claimed ≈ pool.
    // Only integer division rounding dust remains.
    let dust = initial_pool - total_div_claimed;
    assert!(
        dust <= 2, // at most 2 lamports from pool / 3 integer division
        "Rounding dust should be minimal: dust={}, pool={}",
        dust,
        initial_pool
    );
}

#[test]
fn test_zero_key_player_gets_nothing() {
    // Player with 0 keys after buying nothing. dividend_share = 0, claim fails.
    let (mut svm, _admin, pw) = setup_game();

    let buyer = Keypair::new();
    let freeloader = Keypair::new();
    register(&mut svm, &buyer, 1, false, None);
    register(&mut svm, &freeloader, 1, false, None);

    buy(&mut svm, &buyer, 1, 10, &pw, None);

    expire_round(&mut svm, 1);

    let ix = claim_ix(&freeloader.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &freeloader, &[&freeloader]);
    assert!(
        err.contains("NothingToClaim") || err.contains("custom program error"),
        "Zero-key player claim should fail, got: {}",
        err
    );
}

#[test]
fn test_winner_pot_includes_carry_over() {
    // Round 2 starts with winner_pot = carry_over. First buyer's purchase adds to winner_pot.
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game1 = get_game(&svm, 1);
    let carry_over = game1.next_round_pot;
    assert!(carry_over > 0);

    expire_round(&mut svm, 1);
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &player);

    // Round 2 starts with winner_pot = carry_over
    let game2 = get_game(&svm, 2);
    assert_eq!(game2.winner_pot, carry_over);

    // New player buys — winner_pot should increase
    let new_player = Keypair::new();
    register(&mut svm, &new_player, 2, false, None);
    buy(&mut svm, &new_player, 2, 1, &pw, None);

    let game2_after = get_game(&svm, 2);
    assert!(
        game2_after.winner_pot > carry_over,
        "Winner pot should grow: before={}, after={}",
        carry_over,
        game2_after.winner_pot
    );
}
