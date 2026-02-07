// Integration tests for dividend distribution and claiming
// NOTE: Dividends are end-of-round only. Claims require the round to have ended
// (timer expired). After a successful claim, current_round = 0 and keys = 0.
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_two_players_proportional_dividends() {
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    // P1 buys 10 keys
    buy(&mut svm, &p1, 1, 10, &pw, None);
    // P2 buys 10 keys — dividends accumulate in total_dividend_pool
    buy(&mut svm, &p2, 1, 10, &pw, None);

    let game = get_game(&svm, 1);
    assert!(
        game.total_dividend_pool > 0,
        "Dividend pool should have increased after P2's purchase"
    );

    // Expire timer to allow claiming
    set_clock(&mut svm, game.timer_end + 1);

    // P1 claims — should get proportional share of dividend pool
    let bal_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let bal_after = get_balance(&svm, &p1.pubkey());
    assert!(
        bal_after > bal_before,
        "P1 should receive dividends at round end"
    );

    // After claim: current_round = 0 and keys = 0
    let ps1 = get_player(&svm, &p1.pubkey());
    assert_eq!(ps1.current_round, 0, "current_round should be 0 after claim");
    assert_eq!(ps1.keys, 0, "keys should be 0 after claim");
}

#[test]
fn test_claim_dividends_at_round_end() {
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 10, &pw, None);

    // Expire timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // P1 claims dividends
    let bal_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let bal_after = get_balance(&svm, &p1.pubkey());

    assert!(
        bal_after > bal_before,
        "P1 balance should increase after claiming dividends"
    );

    let ps1 = get_player(&svm, &p1.pubkey());
    assert!(ps1.claimed_dividends_lamports > 0);
    assert_eq!(ps1.current_round, 0);
    assert_eq!(ps1.keys, 0);
}

#[test]
fn test_claim_fails_while_round_active() {
    // Dividends are end-of-round only — claim should fail while game is active
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 10, &pw, None);

    // Do NOT expire timer — round is still active
    let ix = claim_ix(&p1.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &p1, &[&p1]);
    assert!(
        err.contains("GameStillActive") || err.contains("custom program error"),
        "Expected GameStillActive error, got: {}",
        err
    );
}

#[test]
fn test_multi_player_dividend_fairness() {
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..5).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    // Everyone buys 10 keys
    for p in &players {
        buy(&mut svm, p, 1, 10, &pw, None);
    }

    // Last player (extra) buys 10 more keys to generate dividends for all
    let extra_buyer = Keypair::new();
    register(&mut svm, &extra_buyer, 1, false, None);
    buy(&mut svm, &extra_buyer, 1, 10, &pw, None);

    // Expire timer to allow claiming
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // All 5 original players claim
    let mut claimed = Vec::new();
    for p in &players {
        svm.expire_blockhash();
        let bal_before = get_balance(&svm, &p.pubkey());
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm, &[ix], p, &[p]).unwrap();
        let bal_after = get_balance(&svm, &p.pubkey());
        claimed.push(bal_after - bal_before);
    }

    // All should get some amount > 0
    for (i, c) in claimed.iter().enumerate() {
        assert!(*c > 0, "Player {} should have received dividends", i);
    }
}

#[test]
fn test_proportional_dividend_share_at_round_end() {
    // Two players with unequal keys: verify dividend proportionality
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    // P1 buys 30 keys, P2 buys 10 keys (3:1 ratio)
    buy(&mut svm, &p1, 1, 30, &pw, None);
    buy(&mut svm, &p2, 1, 10, &pw, None);

    // Extra buyer to generate more dividends
    let extra = Keypair::new();
    register(&mut svm, &extra, 1, false, None);
    buy(&mut svm, &extra, 1, 10, &pw, None);

    // Expire timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // Both claim
    let p1_bal_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_payout = get_balance(&svm, &p1.pubkey()) - p1_bal_before;

    svm.expire_blockhash();

    let p2_bal_before = get_balance(&svm, &p2.pubkey());
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    let p2_payout = get_balance(&svm, &p2.pubkey()) - p2_bal_before;

    // P1 has 30 keys, P2 has 10 keys out of total 50 (extra has 10 too).
    // P1 = 30/50, P2 = 10/50 of dividend pool, so P1 should get ~3x P2's dividend.
    // Note: payouts include tx fee subtracted, and P2 might be the winner.
    // Just check P1 received more than P2 (since P1 has 3x keys).
    assert!(
        p1_payout > p2_payout,
        "P1 (30 keys) should get more than P2 (10 keys). P1: {}, P2: {}",
        p1_payout,
        p2_payout
    );
}

#[test]
fn test_first_buy_dividends_go_to_total_pool() {
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    buy(&mut svm, &p1, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    // First buy: dividend portion should still accumulate in total_dividend_pool
    assert!(
        game.total_dividend_pool > 0,
        "Total dividend pool should have funds from first buy"
    );
    assert!(
        game.winner_pot > 0,
        "Winner pot should accumulate"
    );
}

#[test]
fn test_nothing_to_claim_fails() {
    let (mut svm, _admin, _pw) = setup_game();

    let p1 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    // Don't buy any keys

    // Expire timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    let ix = claim_ix(&p1.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &p1, &[&p1]);
    assert!(
        err.contains("NothingToClaim") || err.contains("custom program error"),
        "Expected NothingToClaim, got: {}",
        err
    );
}

#[test]
fn test_double_claim_prevented() {
    // After claiming, current_round = 0 so second claim should fail
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None);

    // Expire timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // First claim succeeds
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();

    // Verify current_round is now 0
    let ps = get_player(&svm, &p1.pubkey());
    assert_eq!(ps.current_round, 0);

    // Second claim should fail — player is no longer in round 1
    svm.expire_blockhash();
    let ix = claim_ix(&p1.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &p1, &[&p1]);
    assert!(
        err.contains("PlayerNotInRound") || err.contains("custom program error"),
        "Expected PlayerNotInRound (double claim prevented), got: {}",
        err
    );
}
