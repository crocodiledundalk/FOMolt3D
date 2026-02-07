// Integration tests: cross-round state transitions (claim-based flow)
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_claim_pays_dividends_and_resets() {
    // P1 in round 1 with unclaimed dividends. Claim pays dividends, resets current_round to 0.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &winner, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    let game = get_game(&svm, 1);
    let p1_state = get_player(&svm, &p1.pubkey());
    let expected_div = expected_dividend_share(p1_state.keys, game.total_dividend_pool, game.total_keys);

    // p1 claims from round 1
    let p1_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_after = get_balance(&svm, &p1.pubkey());

    let received = p1_after + 5000 - p1_before; // add back tx fee
    assert_eq!(
        received, expected_div,
        "Claim should pay dividends: received={}, expected={}",
        received, expected_div
    );

    let ps = get_player(&svm, &p1.pubkey());
    assert_eq!(ps.keys, 0, "Keys should be reset");
    assert_eq!(ps.current_round, 0, "Should be sentinel 0 after claim");
}

#[test]
fn test_claim_with_referral_earnings_preserved() {
    // P1 has referral earnings from round 1. Claim pays ONLY dividends; referrals preserved.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    buy(&mut svm, &referrer, 1, 10, &pw, None);
    buy(&mut svm, &player, 1, 5, &pw, Some(&referrer.pubkey()));

    let ref_state_before = get_player(&svm, &referrer.pubkey());
    let referral_earnings = ref_state_before.referral_earnings_lamports;
    assert!(referral_earnings > 0, "Referrer should have earnings");

    expire_round(&mut svm, 1);

    // Referrer claims dividends (referrals stay untouched)
    let r_before = get_balance(&svm, &referrer.pubkey());
    let ix = claim_ix(&referrer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &referrer, &[&referrer]).unwrap();
    let r_after = get_balance(&svm, &referrer.pubkey());
    assert!(r_after > r_before, "Referrer should receive dividends");

    let ref_state_after = get_player(&svm, &referrer.pubkey());
    assert_eq!(
        ref_state_after.referral_earnings_lamports, referral_earnings,
        "Claim should NOT touch referral earnings"
    );
    assert_eq!(ref_state_after.current_round, 0);

    // Referrer claims referral earnings separately from old round's vault
    svm.expire_blockhash();
    let ix = claim_referral_earnings_ix(&referrer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &referrer, &[&referrer]).unwrap();

    let ref_state_final = get_player(&svm, &referrer.pubkey());
    assert_eq!(ref_state_final.referral_earnings_lamports, 0, "Referral earnings zeroed after claim");
    assert!(ref_state_final.claimed_referral_earnings_lamports > 0);
}

#[test]
fn test_buy_directly_after_claim() {
    // After claim (current_round = 0), player buys directly in round 2 (no settle needed).
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    // Buy directly in round 2 (returning player path)
    buy(&mut svm, &player, 2, 3, &pw, None);

    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.current_round, 2);
    assert_eq!(ps.keys, 3);
}

#[test]
fn test_cannot_buy_without_claiming() {
    // P1 in round 1. Round 2 starts. P1 tries to buy in round 2 without claiming. Fails.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &winner, 1, 3, &pw, None);

    expire_round(&mut svm, 1);
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &winner);

    // p1 tries to buy in round 2 without claiming — should fail
    let ix = buy_keys_ix(&p1.pubkey(), 2, 1, false, &pw, None);
    let err = send_tx_expect_err(&mut svm, &[ix], &p1, &[&p1]);
    assert!(
        err.contains("MustClaimPreviousRound") || err.contains("custom program error"),
        "Should fail without claiming, got: {}",
        err
    );
}

#[test]
fn test_claim_then_buy_in_new_round() {
    // Claim in round 1, buy keys in round 2. Verify keys accumulate correctly.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &winner, 1, 3, &pw, None);

    expire_round(&mut svm, 1);
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &winner);

    // p1 claims from round 1 (gets dividends, current_round → 0)
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();

    // Buy in round 2 (returning player path: current_round == 0 → re-enter)
    buy(&mut svm, &p1, 2, 7, &pw, None);

    let ps = get_player(&svm, &p1.pubkey());
    assert_eq!(ps.keys, 7, "Should have 7 keys in round 2");
    assert_eq!(ps.current_round, 2);
}

#[test]
fn test_multiple_players_claim_different_times() {
    // 3 players from round 1. P1 claims immediately, P2 claims later, P3 never claims.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &p3, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None);
    buy(&mut svm, &p3, 1, 5, &pw, None);
    buy(&mut svm, &winner, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    // P1 claims immediately (not winner — winner is last buyer)
    let p1_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_after = get_balance(&svm, &p1.pubkey());
    let p1_received = p1_after + 5000 - p1_before;
    assert!(p1_received > 0, "P1 should receive dividends");

    svm.expire_blockhash();

    // P2 claims later
    let p2_before = get_balance(&svm, &p2.pubkey());
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    let p2_after = get_balance(&svm, &p2.pubkey());
    let p2_received = p2_after + 5000 - p2_before;
    assert!(p2_received > 0, "P2 should receive dividends");

    // With no-deduction model, equal keys = equal dividends regardless of claim order
    assert_eq!(
        p1_received, p2_received,
        "Equal holders should get equal dividends regardless of claim order: P1={}, P2={}",
        p1_received,
        p2_received
    );

    // P3 doesn't claim — their dividends remain in old vault
    let ps3 = get_player(&svm, &p3.pubkey());
    assert_eq!(ps3.current_round, 1, "P3 should still be in round 1");

    let old_vault = get_vault_balance(&svm, 1);
    assert!(old_vault > 0, "Old vault should retain P3's unclaimed dividends");
}

#[test]
fn test_old_vault_retains_unclaimed_after_new_round() {
    // Start round 2. Old vault(1) still has unclaimed dividends.
    // Players can still claim from round 1 after round 2 starts.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None); // p2 = winner

    expire_round(&mut svm, 1);
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &p2);

    // Old vault should have p1's unclaimed dividends
    let old_vault = get_vault_balance(&svm, 1);
    assert!(old_vault > 0, "Old vault should retain unclaimed dividends for p1");

    // p1 claims from round 1 and gets dividends
    let p1_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_after = get_balance(&svm, &p1.pubkey());

    assert!(
        p1_after > p1_before,
        "p1 should receive dividends via claim"
    );

    let ps = get_player(&svm, &p1.pubkey());
    assert_eq!(ps.current_round, 0);
}
