// Integration tests for referral system
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_first_buy_sets_referrer() {
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, None);

    // Referrer registers via 0-key buy
    buy(&mut svm, &referrer, 1, 0, &pw, None);

    // Player's first buy with referrer sets the referrer
    buy(&mut svm, &player, 1, 1, &pw, Some(&referrer.pubkey()));

    let ps = get_player(&svm, &player.pubkey());
    assert!(ps.referrer.is_some());
    assert!(pubkey_eq(&ps.referrer.unwrap(), &referrer.pubkey()));
}

#[test]
fn test_self_referral_fails() {
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    airdrop(&mut svm, &player.pubkey(), 100_000_000_000);

    // Try to buy with self as referrer — should fail
    let ix = buy_keys_ix(&player.pubkey(), 1, 0, false, &pw, Some(&player.pubkey()));
    let err = send_tx_expect_err(&mut svm, &[ix], &player, &[&player]);
    assert!(
        err.contains("CannotReferSelf") || err.contains("custom program error"),
        "Expected CannotReferSelf, got: {}",
        err
    );
}

#[test]
fn test_referral_earnings_accumulate() {
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    // Referrer buys first so there are existing keys for dividend distribution
    buy(&mut svm, &referrer, 1, 10, &pw, None);

    // Player buys with referrer — referrer should earn bonus
    buy(&mut svm, &player, 1, 5, &pw, Some(&referrer.pubkey()));

    let ref_state = get_player(&svm, &referrer.pubkey());
    assert!(
        ref_state.referral_earnings_lamports > 0,
        "Referrer should have earned referral bonus"
    );
}

#[test]
fn test_claim_referral_earnings() {
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    buy(&mut svm, &referrer, 1, 10, &pw, None);
    buy(&mut svm, &player, 1, 5, &pw, Some(&referrer.pubkey()));

    let bal_before = get_balance(&svm, &referrer.pubkey());
    let ix = claim_referral_earnings_ix(&referrer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &referrer, &[&referrer]).unwrap();
    let bal_after = get_balance(&svm, &referrer.pubkey());

    assert!(bal_after > bal_before, "Referrer should receive earnings");

    let ref_state = get_player(&svm, &referrer.pubkey());
    assert_eq!(ref_state.referral_earnings_lamports, 0, "Earnings should be zeroed");
    assert!(ref_state.claimed_referral_earnings_lamports > 0);
}

#[test]
fn test_claim_zero_referral_earnings_fails() {
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    // 0-key buy to create PlayerState (no referral earnings)
    buy(&mut svm, &player, 1, 0, &pw, None);

    let ix = claim_referral_earnings_ix(&player.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &player, &[&player]);
    assert!(
        err.contains("NoReferralEarnings") || err.contains("custom program error"),
        "Expected NoReferralEarnings, got: {}",
        err
    );
}

#[test]
fn test_referrer_mismatch_fails() {
    let (mut svm, _admin, pw) = setup_game();

    let referrer1 = Keypair::new();
    let referrer2 = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer1, 1, false, None);
    register(&mut svm, &referrer2, 1, false, None);
    register(&mut svm, &player, 1, false, None);

    // Both referrers need PlayerState accounts
    buy(&mut svm, &referrer1, 1, 10, &pw, None);
    buy(&mut svm, &referrer2, 1, 0, &pw, None);

    // Player's first buy sets referrer1
    buy(&mut svm, &player, 1, 1, &pw, Some(&referrer1.pubkey()));

    // Try to buy with wrong referrer — should fail with ReferrerMismatch
    svm.expire_blockhash();
    let ix = buy_keys_ix(
        &player.pubkey(),
        1,
        1,
        false,
        &pw,
        Some(&referrer2.pubkey()),
    );
    let err = send_tx_expect_err(&mut svm, &[ix], &player, &[&player]);
    assert!(
        err.contains("ReferrerMismatch") || err.contains("custom program error"),
        "Expected ReferrerMismatch, got: {}",
        err
    );
}

#[test]
fn test_referral_carved_from_after_fee() {
    // Referral bonus is 10% of after-fee amount (not from dividend portion).
    // With a referral, the total_dividend_pool should be lower because pot_contribution
    // is reduced by the referral amount.
    let (mut svm, _admin, pw) = setup_game();

    // Setup without referral
    let p1 = Keypair::new();
    let p2_no_ref = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2_no_ref, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2_no_ref, 1, 10, &pw, None);

    let game_without_ref = get_game(&svm, 1);
    let divs_without_ref = game_without_ref.total_dividend_pool;

    // Setup fresh game with referral
    let mut svm2 = setup_svm();
    let admin2 = Keypair::new();
    airdrop(&mut svm2, &admin2.pubkey(), 100_000_000_000);
    let params = ConfigParamsData {
        protocol_wallet: pw,
        ..Default::default()
    };
    let ix = create_or_update_config_ix(&admin2.pubkey(), &params);
    send_tx(&mut svm2, &[ix], &admin2, &[&admin2]).unwrap();
    let ix = initialize_first_round_ix(&admin2.pubkey());
    send_tx(&mut svm2, &[ix], &admin2, &[&admin2]).unwrap();

    let r1 = Keypair::new();
    let p2_with_ref = Keypair::new();
    register(&mut svm2, &r1, 1, false, None);
    register(&mut svm2, &p2_with_ref, 1, false, Some(&r1.pubkey()));

    buy(&mut svm2, &r1, 1, 10, &pw, None);
    buy(&mut svm2, &p2_with_ref, 1, 10, &pw, Some(&r1.pubkey()));

    let game_with_ref = get_game(&svm2, 1);
    let divs_with_ref = game_with_ref.total_dividend_pool;

    // With referral, less dividend goes to the pool (pot_contribution is reduced)
    assert!(
        divs_with_ref < divs_without_ref,
        "Referral should reduce dividend pool. Without: {}, With: {}",
        divs_without_ref,
        divs_with_ref
    );
}

#[test]
fn test_referrer_bonus_from_multiple_referees() {
    // One referrer, two referees. Referrer accumulates from both.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let ref1 = Keypair::new();
    let ref2 = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &ref1, 1, false, Some(&referrer.pubkey()));
    register(&mut svm, &ref2, 1, false, Some(&referrer.pubkey()));

    buy(&mut svm, &referrer, 1, 10, &pw, None);
    buy(&mut svm, &ref1, 1, 5, &pw, Some(&referrer.pubkey()));

    let ref_state_1 = get_player(&svm, &referrer.pubkey());
    let after_first = ref_state_1.referral_earnings_lamports;
    assert!(after_first > 0);

    buy(&mut svm, &ref2, 1, 5, &pw, Some(&referrer.pubkey()));

    let ref_state_2 = get_player(&svm, &referrer.pubkey());
    assert!(
        ref_state_2.referral_earnings_lamports > after_first,
        "Referrer should accumulate from multiple referees"
    );
}

#[test]
fn test_referrer_claims_mid_round_then_more_buys() {
    // Referrer claims referral earnings mid-round. More buys happen. Earnings re-accumulate.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    buy(&mut svm, &referrer, 1, 10, &pw, None);
    buy(&mut svm, &player, 1, 5, &pw, Some(&referrer.pubkey()));

    let ref_state = get_player(&svm, &referrer.pubkey());
    let first_earnings = ref_state.referral_earnings_lamports;
    assert!(first_earnings > 0);

    // Claim mid-round
    let ix = claim_referral_earnings_ix(&referrer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &referrer, &[&referrer]).unwrap();

    let ref_state = get_player(&svm, &referrer.pubkey());
    assert_eq!(ref_state.referral_earnings_lamports, 0, "Should be zero after claim");
    assert_eq!(ref_state.claimed_referral_earnings_lamports, first_earnings);

    // Player buys more — referral should re-accumulate
    svm.expire_blockhash();
    buy(&mut svm, &player, 1, 3, &pw, Some(&referrer.pubkey()));

    let ref_state = get_player(&svm, &referrer.pubkey());
    assert!(
        ref_state.referral_earnings_lamports > 0,
        "Referral earnings should re-accumulate after claim"
    );
}

#[test]
fn test_referrer_zero_keys_gets_referral() {
    // A referrer who has 0 keys (registered via 0-key buy) still receives referral earnings.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, None);

    // Referrer registers via 0-key buy (creates PlayerState, 0 keys)
    buy(&mut svm, &referrer, 1, 0, &pw, None);

    // Only the player buys real keys — referrer has 0 keys
    buy(&mut svm, &player, 1, 5, &pw, Some(&referrer.pubkey()));

    let ref_state = get_player(&svm, &referrer.pubkey());
    assert_eq!(ref_state.keys, 0, "Referrer should have 0 keys");
    assert!(
        ref_state.referral_earnings_lamports > 0,
        "Zero-key referrer should still earn referral bonus"
    );
}

#[test]
fn test_referral_plus_dividend_independent() {
    // Referral earnings and dividend share are independent calculations.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    buy(&mut svm, &referrer, 1, 10, &pw, None);
    buy(&mut svm, &player, 1, 10, &pw, Some(&referrer.pubkey()));

    let game = get_game(&svm, 1);
    let ref_state = get_player(&svm, &referrer.pubkey());

    let expected_div = expected_dividend_share(ref_state.keys, game.total_dividend_pool, game.total_keys);
    let referral_earnings = ref_state.referral_earnings_lamports;

    // Both should be > 0
    assert!(expected_div > 0, "Referrer should get dividends from keys");
    assert!(referral_earnings > 0, "Referrer should get referral earnings");

    // They are independent
    assert_ne!(
        expected_div, referral_earnings,
        "Dividend and referral should be different values"
    );
}
