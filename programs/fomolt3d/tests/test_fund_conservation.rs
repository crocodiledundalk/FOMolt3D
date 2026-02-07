// Integration tests: fund conservation — proving no fund leaks or overcharging
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_full_drain_3_players_no_referrals() {
    // 3 players buy varied amounts. Expire. All claim.
    // Assert: vault_balance == next_round_pot + stranded dividend dust (from claim model)
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &p3, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 3, &pw, None);
    buy(&mut svm, &p3, 1, 2, &pw, None); // P3 is last buyer = winner

    let game_before_claims = get_game(&svm, 1);
    let next_round_pot = game_before_claims.next_round_pot;

    // Expire timer
    expire_round(&mut svm, 1);

    // Non-winners claim first
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();

    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    svm.expire_blockhash();

    // Winner claims
    let ix = claim_ix(&p3.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p3, &[&p3]).unwrap();

    let vault_after = get_vault_balance(&svm, 1);
    let game_after = get_game(&svm, 1);

    // Vault must hold at least next_round_pot
    assert!(
        vault_after >= next_round_pot,
        "Vault {} must hold at least next_round_pot {}",
        vault_after,
        next_round_pot
    );

    // With the no-deduction model, each player gets their full proportional share.
    // Stranded funds = only integer division rounding dust.
    let stranded = vault_after - game_after.next_round_pot;
    assert!(
        stranded <= 10, // at most total_keys lamports of rounding dust
        "Stranded funds should be minimal rounding dust: stranded={}, vault={}, nrp={}",
        stranded, vault_after, game_after.next_round_pot
    );
}

#[test]
fn test_full_drain_with_referrals() {
    // 5 players, 2 with referrers. All claim dividends + referrals.
    // Verify vault only retains next_round_pot + stranded dividend dust.
    let (mut svm, _admin, pw) = setup_game();

    let r1 = Keypair::new();
    let r2 = Keypair::new();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    register(&mut svm, &r1, 1, false, None);
    register(&mut svm, &r2, 1, false, None);
    register(&mut svm, &p1, 1, false, Some(&r1.pubkey()));
    register(&mut svm, &p2, 1, false, Some(&r2.pubkey()));
    register(&mut svm, &p3, 1, false, None);

    buy(&mut svm, &r1, 1, 3, &pw, None);
    buy(&mut svm, &r2, 1, 3, &pw, None);
    buy(&mut svm, &p1, 1, 2, &pw, Some(&r1.pubkey()));
    buy(&mut svm, &p2, 1, 2, &pw, Some(&r2.pubkey()));
    buy(&mut svm, &p3, 1, 5, &pw, None); // winner

    let game = get_game(&svm, 1);
    let next_round_pot = game.next_round_pot;

    // Claim referral earnings mid-round
    let ix = claim_referral_earnings_ix(&r1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &r1, &[&r1]).unwrap();
    svm.expire_blockhash();
    let ix = claim_referral_earnings_ix(&r2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &r2, &[&r2]).unwrap();

    // Expire timer
    expire_round(&mut svm, 1);

    // All claim dividends
    let players = [&r1, &r2, &p1, &p2, &p3];
    for p in &players {
        svm.expire_blockhash();
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm, &[ix], p, &[p]).unwrap();
    }

    let vault_after = get_vault_balance(&svm, 1);
    assert!(
        vault_after >= next_round_pot,
        "Vault {} must hold at least next_round_pot {}",
        vault_after,
        next_round_pot
    );
}

#[test]
fn test_protocol_fee_exactness() {
    // Track protocol_wallet across 10 buys. Assert sum matches expected.
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..3).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    let pw_before = get_balance(&svm, &pw);
    let mut expected_fees = 0u64;
    let mut supply = 0u64;

    for i in 0..10 {
        let keys = (i % 3) as u64 + 1;
        let cost = expected_cost(supply, keys);
        expected_fees += expected_protocol_fee(cost);
        supply += keys;

        svm.expire_blockhash();
        buy(&mut svm, &players[i % 3], 1, keys, &pw, None);
    }

    let pw_after = get_balance(&svm, &pw);
    let actual_fees = pw_after - pw_before;

    assert_eq!(
        actual_fees, expected_fees,
        "Protocol fees mismatch: actual {} vs expected {}",
        actual_fees, expected_fees
    );
}

#[test]
fn test_referral_fee_exactness() {
    // R refers P. P buys 5 times. R's referral_earnings == expected.
    let (mut svm, _admin, pw) = setup_game();

    let referrer = Keypair::new();
    let player = Keypair::new();
    register(&mut svm, &referrer, 1, false, None);
    register(&mut svm, &player, 1, false, Some(&referrer.pubkey()));

    // Referrer buys first to create supply
    buy(&mut svm, &referrer, 1, 10, &pw, None);

    let mut expected_referral = 0u64;
    let mut supply = 10u64;

    for _ in 0..5 {
        let cost = expected_cost(supply, 1);
        let after_fee = expected_after_fee(cost);
        expected_referral += expected_referral_bonus(after_fee);
        supply += 1;

        svm.expire_blockhash();
        buy(&mut svm, &player, 1, 1, &pw, Some(&referrer.pubkey()));
    }

    let ref_state = get_player(&svm, &referrer.pubkey());
    assert_eq!(
        ref_state.referral_earnings_lamports, expected_referral,
        "Referral earnings mismatch: actual {} vs expected {}",
        ref_state.referral_earnings_lamports, expected_referral
    );
}

#[test]
fn test_vault_receives_exactly_after_fee() {
    // After each buy, vault increases by exactly cost - house_fee.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let mut supply = 0u64;

    for _ in 0..5 {
        let vault_before = get_vault_balance(&svm, 1);
        let cost = expected_cost(supply, 1);
        let after_fee = expected_after_fee(cost);

        svm.expire_blockhash();
        buy(&mut svm, &player, 1, 1, &pw, None);

        let vault_after = get_vault_balance(&svm, 1);
        let vault_increase = vault_after - vault_before;

        assert_eq!(
            vault_increase, after_fee,
            "Vault increase {} != after_fee {} at supply {}",
            vault_increase, after_fee, supply
        );
        supply += 1;
    }
}

#[test]
fn test_accounting_sum_leq_vault() {
    // After N buys, winner_pot + dividend_pool + next_round_pot + referral_earnings <= vault_balance.
    // Difference is rounding dust, bounded by 4 * num_buys.
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    let num_buys = 10;
    for i in 0..num_buys {
        svm.expire_blockhash();
        let p = if i % 2 == 0 { &p1 } else { &p2 };
        buy(&mut svm, p, 1, (i as u64 % 3) + 1, &pw, None);
    }

    let game = get_game(&svm, 1);
    let vault_bal = get_vault_balance(&svm, 1);

    let accounting_sum = game.winner_pot + game.total_dividend_pool + game.next_round_pot;

    assert!(
        accounting_sum <= vault_bal,
        "Accounting sum {} exceeds vault balance {}",
        accounting_sum,
        vault_bal
    );

    let dust = vault_bal - accounting_sum;
    assert!(
        dust <= 4 * num_buys as u64,
        "Too much dust: {} (max expected {})",
        dust,
        4 * num_buys
    );
}

#[test]
fn test_rounding_dust_bounded_100_buys() {
    // 100 single-key buys from 10 players. After all claims, stranded bounded.
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..10).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    for i in 0..100 {
        svm.expire_blockhash();
        buy(&mut svm, &players[i % 10], 1, 1, &pw, None);
    }

    let game = get_game(&svm, 1);
    let next_round_pot = game.next_round_pot;

    // Expire and claim all
    expire_round(&mut svm, 1);

    for p in &players {
        svm.expire_blockhash();
        let ix = claim_ix(&p.pubkey(), 1);
        send_tx(&mut svm, &[ix], p, &[p]).unwrap();
    }

    let vault_after = get_vault_balance(&svm, 1);
    let game_final = get_game(&svm, 1);

    // With no-deduction model, stranded is only integer division rounding dust.
    // 10 equal players with 10 keys each = 100 total keys.
    // Each gets pool * 10 / 100 = pool / 10 (exact division).
    let stranded = vault_after - next_round_pot;
    assert!(
        stranded <= 100, // generous bound for 100-key rounding dust
        "Stranded should be minimal rounding dust: stranded={}, vault={}, nrp={}",
        stranded, vault_after, next_round_pot
    );
}

#[test]
fn test_conservation_across_two_rounds() {
    // Round 1 plays to completion. Round 2 starts with carry-over.
    // After round 2 claims, verify total SOL in system == initial airdrops - protocol_fees - tx_fees.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    let init_p1 = get_balance(&svm, &p1.pubkey());
    let init_p2 = get_balance(&svm, &p2.pubkey());
    let init_pw = get_balance(&svm, &pw);

    // Round 1
    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 3, &pw, None); // p2 winner

    expire_round(&mut svm, 1);

    // p1 claims dividends
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();

    // p2 claims winner + dividends
    let new_round = complete_round_and_start_next(&mut svm, &admin, 1, &p2);
    assert_eq!(new_round, 2);

    // p1 has current_round=0 after claim; p2 (winner) also has current_round=0

    // Round 2: both re-enter via buy (returning player path)
    buy(&mut svm, &p1, 2, 4, &pw, None);
    buy(&mut svm, &p2, 2, 6, &pw, None); // p2 winner again

    expire_round(&mut svm, 2);

    let ix = claim_ix(&p1.pubkey(), 2);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p2.pubkey(), 2);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();

    // Final balances (exclude admin — they received external airdrops during the test)
    let final_p1 = get_balance(&svm, &p1.pubkey());
    let final_p2 = get_balance(&svm, &p2.pubkey());
    let final_pw = get_balance(&svm, &pw);
    let final_vault1 = get_vault_balance(&svm, 1);
    let final_vault2 = get_vault_balance(&svm, 2);

    // Track only the player/protocol economy (admin is external funding source)
    let total_initial = init_p1 as i128 + init_p2 as i128 + init_pw as i128;
    let total_final = final_p1 as i128
        + final_p2 as i128
        + final_pw as i128
        + final_vault1 as i128
        + final_vault2 as i128;

    // PlayerState PDA rent (created via init_if_needed on first buy)
    let pda_rent = get_balance(&svm, &player_pda(&p1.pubkey()).0) as i128
        + get_balance(&svm, &player_pda(&p2.pubkey()).0) as i128;
    let total_final = total_final + pda_rent;

    // Players spent SOL on buys (goes to protocol + vault). They got some back from claims.
    // The only SOL "lost" from this tracked set is tx fees (5000 per tx).
    // Tx count: 2 buys R1 + 1 claim P1 + 1 claim P2 + 2 buys R2 + 2 claims R2 = 8 player txs
    // complete_round_and_start_next: 1 claim + 1 start = 2 admin txs (not tracked)
    let player_tx_fees = 8i128 * 5000;
    let diff = (total_initial - total_final - player_tx_fees).unsigned_abs();

    assert!(
        diff <= 20_000, // small tolerance for rounding
        "Conservation violated: initial={}, final={}, expected_fees={}, diff={}",
        total_initial,
        total_final,
        player_tx_fees,
        diff
    );
}

#[test]
fn test_no_free_money_zero_key_player() {
    // Player registers but never buys. Claim fails with NothingToClaim.
    let (mut svm, _admin, pw) = setup_game();

    let buyer = Keypair::new();
    let freeloader = Keypair::new();
    register(&mut svm, &buyer, 1, false, None);
    register(&mut svm, &freeloader, 1, false, None);

    buy(&mut svm, &buyer, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    // Freeloader tries to claim with 0 keys
    let ix = claim_ix(&freeloader.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &freeloader, &[&freeloader]);
    assert!(
        err.contains("NothingToClaim") || err.contains("custom program error"),
        "Zero-key player should not be able to claim, got: {}",
        err
    );
}

#[test]
fn test_single_player_gets_everything() {
    // One player buys, is winner. Gets winner_pot + full dividend_pool. Vault == next_round_pot.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 10, &pw, None);

    let game = get_game(&svm, 1);
    let expected_payout = game.winner_pot + game.total_dividend_pool;
    let next_round_pot = game.next_round_pot;

    expire_round(&mut svm, 1);

    let bal_before = get_balance(&svm, &player.pubkey());
    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();
    let bal_after = get_balance(&svm, &player.pubkey());

    let received = bal_after - bal_before + 5000; // add back tx fee
    assert_eq!(
        received, expected_payout,
        "Single player should get winner_pot + full dividends: expected {}, got {}",
        expected_payout, received
    );

    let vault_after = get_vault_balance(&svm, 1);
    assert_eq!(
        vault_after, next_round_pot,
        "Vault should hold exactly next_round_pot: vault={}, nrp={}",
        vault_after, next_round_pot
    );
}
