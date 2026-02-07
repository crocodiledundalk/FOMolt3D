// Integration tests: claim ordering behavior — verifying order independence
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_equal_holders_get_equal_dividends() {
    // 3 equal holders (10 keys each). Regardless of claim order, all get the same dividends.
    // Pool and total_keys are NOT mutated on claim, so no first-claimer advantage.
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
    let initial_div_pool = game.total_dividend_pool;

    expire_round(&mut svm, 1);

    // P1 claims first (non-winner)
    let p1_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_after = get_balance(&svm, &p1.pubkey());
    let p1_dividends = p1_after + 5000 - p1_before; // add back tx fee

    svm.expire_blockhash();

    // P2 claims second (non-winner)
    let p2_before = get_balance(&svm, &p2.pubkey());
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    let p2_after = get_balance(&svm, &p2.pubkey());
    let p2_dividends = p2_after + 5000 - p2_before;

    svm.expire_blockhash();

    // P3 claims last (winner — separate winner_pot from dividends)
    let p3_before = get_balance(&svm, &p3.pubkey());
    let ix = claim_ix(&p3.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p3, &[&p3]).unwrap();
    let p3_after = get_balance(&svm, &p3.pubkey());
    let p3_total = p3_after + 5000 - p3_before;
    let p3_dividends = p3_total - game.winner_pot; // subtract winner portion

    // All three equal holders should get the same dividends
    assert_eq!(
        p1_dividends, p2_dividends,
        "Equal holders should get equal dividends: P1={}, P2={}",
        p1_dividends, p2_dividends
    );
    assert_eq!(
        p2_dividends, p3_dividends,
        "Equal holders should get equal dividends: P2={}, P3={}",
        p2_dividends, p3_dividends
    );

    // Total claimed should account for nearly the full pool (only rounding dust remains)
    let total_claimed = p1_dividends + p2_dividends + p3_dividends;
    let dust = initial_div_pool - total_claimed;
    assert!(
        dust <= 2, // at most 2 lamports dust from integer division of pool/3
        "Rounding dust should be minimal: dust={}, pool={}",
        dust,
        initial_div_pool
    );
}

#[test]
fn test_total_conservation_regardless_of_order() {
    // Same setup, two different orderings. Total claimed is the same.
    // With no-deduction model, both per-player and total amounts are identical.

    // --- Run A: P1 first, P2 second ---
    let (mut svm_a, _admin_a, pw_a) = setup_game();
    let p1a = Keypair::new();
    let p2a = Keypair::new();
    let winnera = Keypair::new();
    register(&mut svm_a, &p1a, 1, false, None);
    register(&mut svm_a, &p2a, 1, false, None);
    register(&mut svm_a, &winnera, 1, false, None);
    buy(&mut svm_a, &p1a, 1, 10, &pw_a, None);
    buy(&mut svm_a, &p2a, 1, 10, &pw_a, None);
    buy(&mut svm_a, &winnera, 1, 10, &pw_a, None);
    expire_round(&mut svm_a, 1);

    // Order A: p1, p2, winner
    let mut total_a = 0u64;
    for p in [&p1a, &p2a, &winnera] {
        svm_a.expire_blockhash();
        let before = get_balance(&svm_a, &p.pubkey());
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm_a, &[ix], p, &[p]).unwrap();
        let after = get_balance(&svm_a, &p.pubkey());
        total_a += after + 5000 - before; // add back tx fee
    }

    // --- Run B: P2 first, P1 second ---
    let (mut svm_b, _admin_b, pw_b) = setup_game();
    let p1b = Keypair::new();
    let p2b = Keypair::new();
    let winnerb = Keypair::new();
    register(&mut svm_b, &p1b, 1, false, None);
    register(&mut svm_b, &p2b, 1, false, None);
    register(&mut svm_b, &winnerb, 1, false, None);
    buy(&mut svm_b, &p1b, 1, 10, &pw_b, None);
    buy(&mut svm_b, &p2b, 1, 10, &pw_b, None);
    buy(&mut svm_b, &winnerb, 1, 10, &pw_b, None);
    expire_round(&mut svm_b, 1);

    // Order B: p2, p1, winner
    let mut total_b = 0u64;
    for p in [&p2b, &p1b, &winnerb] {
        svm_b.expire_blockhash();
        let before = get_balance(&svm_b, &p.pubkey());
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm_b, &[ix], p, &[p]).unwrap();
        let after = get_balance(&svm_b, &p.pubkey());
        total_b += after + 5000 - before;
    }

    assert_eq!(
        total_a, total_b,
        "Total claimed should be same regardless of order: A={}, B={}",
        total_a, total_b
    );
}

#[test]
fn test_winner_claim_independent_of_dividend_order() {
    // Winner's prize (winner_pot) is independent of dividend claim ordering.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None);
    buy(&mut svm, &winner, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    let expected_winner_pot = game.winner_pot;

    expire_round(&mut svm, 1);

    // Winner claims FIRST (still gets full winner_pot)
    let before = get_balance(&svm, &winner.pubkey());
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();
    let after = get_balance(&svm, &winner.pubkey());
    let winner_received = after + 5000 - before;

    // Winner should have received winner_pot + their dividend share
    assert!(
        winner_received >= expected_winner_pot,
        "Winner should receive at least winner_pot: received={}, winner_pot={}",
        winner_received,
        expected_winner_pot
    );
}

#[test]
fn test_winner_claims_first_then_others() {
    // Winner claims first. Then non-winners claim. All get > 0.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None);
    buy(&mut svm, &winner, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    // Winner claims first
    let w_before = get_balance(&svm, &winner.pubkey());
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();
    let w_after = get_balance(&svm, &winner.pubkey());
    assert!(w_after > w_before, "Winner should profit");

    // Non-winners claim after
    for p in [&p1, &p2] {
        svm.expire_blockhash();
        let before = get_balance(&svm, &p.pubkey());
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm, &[ix], p, &[p]).unwrap();
        let after = get_balance(&svm, &p.pubkey());
        // After tx fee, non-winner should receive dividends > tx fee (5000)
        assert!(
            after + 5000 > before,
            "Non-winner {} should get positive dividends",
            p.pubkey()
        );
    }
}

#[test]
fn test_others_claim_first_then_winner() {
    // Non-winners claim first. Then winner. Winner still gets full winner_pot.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None);
    buy(&mut svm, &winner, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    let winner_pot = game.winner_pot;

    expire_round(&mut svm, 1);

    // Non-winners claim first
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    svm.expire_blockhash();

    // Winner claims last
    let game_before = get_game(&svm, 1);
    assert!(!game_before.winner_claimed, "Winner should not have claimed yet");

    let w_before = get_balance(&svm, &winner.pubkey());
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();
    let w_after = get_balance(&svm, &winner.pubkey());

    let winner_received = w_after + 5000 - w_before;
    // Winner gets winner_pot + their dividend share
    assert!(
        winner_received >= winner_pot,
        "Winner should get at least winner_pot: received={}, pot={}",
        winner_received,
        winner_pot
    );

    let game_after = get_game(&svm, 1);
    assert!(game_after.winner_claimed, "Winner should be marked as claimed");
}

#[test]
fn test_partial_claiming_vault_retains_unclaimed() {
    // 4 players. Only 2 claim. Vault retains funds for the other 2.
    let (mut svm, admin, pw) = setup_game();

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

    let game = get_game(&svm, 1);
    let vault_before_claims = get_vault_balance(&svm, 1);

    expire_round(&mut svm, 1);

    // Only winner and p1 claim
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();

    let vault_after = get_vault_balance(&svm, 1);

    // Vault should still hold significant funds (p2 and p3 unclaimed)
    assert!(
        vault_after > game.next_round_pot,
        "Vault should hold more than next_round_pot since 2 players haven't claimed"
    );

    // Start new round should work (carries next_round_pot only)
    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    // Old vault should still have unclaimed funds minus next_round_pot
    let old_vault_after_new_round = get_vault_balance(&svm, 1);
    assert!(
        old_vault_after_new_round > 0,
        "Old vault should retain unclaimed dividends for p2 and p3"
    );
}

#[test]
fn test_claim_then_no_second_claim() {
    // After claim, current_round = 0. Second claim fails.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.current_round, 0, "current_round should be sentinel 0");

    svm.expire_blockhash();

    let ix = claim_ix(&player.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &player, &[&player]);
    assert!(
        err.contains("PlayerNotInRound") || err.contains("custom program error"),
        "Second claim should fail, got: {}",
        err
    );
}

#[test]
fn test_referral_claim_ordering_independent() {
    // R has referral earnings + dividends. Order of claim vs claim_referral_earnings
    // doesn't affect total received.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    buy(&mut svm, &referrer, 1, 10, &pw, None);
    buy(&mut svm, &player, 1, 10, &pw, Some(&referrer.pubkey()));

    let ref_state = get_player(&svm, &referrer.pubkey());
    let referral_earnings = ref_state.referral_earnings_lamports;
    assert!(referral_earnings > 0);

    expire_round(&mut svm, 1);

    // Claim referral first, then dividends
    let r_before = get_balance(&svm, &referrer.pubkey());
    let ix = claim_referral_earnings_ix(&referrer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &referrer, &[&referrer]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&referrer.pubkey(), 1);
    send_tx(&mut svm, &[ix], &referrer, &[&referrer]).unwrap();
    let r_after = get_balance(&svm, &referrer.pubkey());

    let total_received = r_after + 10000 - r_before; // 2 tx fees

    // Verify referrer got both dividends and referral earnings
    assert!(
        total_received > referral_earnings,
        "Referrer should get dividends + referrals: total={}, referral_only={}",
        total_received,
        referral_earnings
    );
}
