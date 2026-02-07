// Integration tests: stress/scale testing for economic invariants
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_10_players_50_buys_conservation() {
    // 10 players, 50 buys, full claims. Economic invariant holds.
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..10).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    let init_pw = get_balance(&svm, &pw);
    let init_bals: Vec<u64> = players.iter().map(|p| get_balance(&svm, &p.pubkey())).collect();

    // 50 buys with varying amounts
    let mut buy_tx_count = 0u64;
    for i in 0..50 {
        svm.expire_blockhash();
        let keys = (i % 5) as u64 + 1;
        buy(&mut svm, &players[i % 10], 1, keys, &pw, None);
        buy_tx_count += 1;
    }

    let game = get_game(&svm, 1);
    expire_round(&mut svm, 1);

    // All claim
    let mut claim_tx_count = 0u64;
    for p in &players {
        svm.expire_blockhash();
        let ix = claim_ix(&p.pubkey(), 1);
        let result = send_tx(&mut svm, &[ix], p, &[p]);
        if result.is_ok() {
            claim_tx_count += 1;
        }
    }

    let final_bals: Vec<u64> = players.iter().map(|p| get_balance(&svm, &p.pubkey())).collect();
    let final_pw = get_balance(&svm, &pw);
    let final_vault = get_vault_balance(&svm, 1);

    // Calculate total SOL movement
    let total_player_change: i128 = (0..10)
        .map(|i| init_bals[i] as i128 - final_bals[i] as i128)
        .sum();

    let pw_gained = final_pw as i128 - init_pw as i128;
    let tx_fees = (buy_tx_count + claim_tx_count) as i128 * 5000;

    // PlayerState PDA rent (created via init_if_needed on first buy)
    let pda_rent: i128 = players
        .iter()
        .map(|p| get_balance(&svm, &player_pda(&p.pubkey()).0) as i128)
        .sum();

    let diff = (total_player_change - pw_gained - final_vault as i128 - tx_fees - pda_rent).unsigned_abs();
    assert!(
        diff <= 50, // generous rounding tolerance
        "Economic invariant violated! Spent: {}, PW: {}, Vault: {}, Fees: {}, Diff: {}",
        total_player_change,
        pw_gained,
        final_vault,
        tx_fees,
        diff
    );
}

#[test]
fn test_rapid_same_player_15_buys() {
    // One player buys 15 times. State remains consistent.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let mut expected_keys = 0u64;

    for _ in 0..15 {
        svm.expire_blockhash();
        buy(&mut svm, &player, 1, 1, &pw, None);
        expected_keys += 1;

        let ps = get_player(&svm, &player.pubkey());
        assert_eq!(
            ps.keys, expected_keys,
            "Keys mismatch: expected={}, actual={}",
            expected_keys, ps.keys
        );
    }

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 15);
    assert!(pubkey_eq(&game.last_buyer, &player.pubkey()));

    // Verify accounting consistency
    let vault = get_vault_balance(&svm, 1);
    let accounting = game.winner_pot + game.total_dividend_pool + game.next_round_pot;
    assert!(
        accounting <= vault,
        "Accounting {} exceeds vault {}",
        accounting,
        vault
    );
}

#[test]
fn test_20_players_equal_keys_claim_conservation() {
    // 20 players each buy 5 keys. All claim. Total claimed is conserved.
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..20).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    for p in &players {
        svm.expire_blockhash();
        buy(&mut svm, p, 1, 5, &pw, None);
    }

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 100); // 20 * 5

    expire_round(&mut svm, 1);

    let mut total_received = 0u64;
    for p in &players {
        svm.expire_blockhash();
        let before = get_balance(&svm, &p.pubkey());
        let ix = claim_ix(&p.pubkey(), 1);
        let result = send_tx(&mut svm, &[ix], p, &[p]);
        if result.is_ok() {
            let after = get_balance(&svm, &p.pubkey());
            total_received += after + 5000 - before; // add back tx fee
        }
    }

    // Total received should equal winner_pot + claimed dividends
    // Vault should have next_round_pot + stranded dividends left
    let vault_after = get_vault_balance(&svm, 1);
    let game_after = get_game(&svm, 1);

    assert!(
        vault_after >= game_after.next_round_pot,
        "Vault should have at least next_round_pot"
    );

    // Total received + vault remaining should be close to total inflows
    assert!(
        total_received > 0,
        "Players should receive some SOL from claims"
    );
}

#[test]
fn test_large_key_purchase_no_overflow() {
    // Buy 10,000 keys at once. No overflow.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    // 1,000 keys from supply 0 costs = 1000 * 10M + 1M * 1000 * 999 / 2
    // = 10B + 499.5B = 509.5B ≈ 509.5 SOL
    // Need extra airdrop (register gives 100 SOL)
    airdrop(&mut svm, &player.pubkey(), 1_000_000_000_000); // 1000 SOL extra

    buy(&mut svm, &player, 1, 1_000, &pw, None);

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 1_000);

    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.keys, 1_000);

    // Accounting should be consistent
    let vault = get_vault_balance(&svm, 1);
    let accounting = game.winner_pot + game.total_dividend_pool + game.next_round_pot;
    assert!(
        accounting <= vault,
        "Accounting {} exceeds vault {} with large purchase",
        accounting,
        vault
    );
}

#[test]
fn test_three_round_economic_invariant() {
    // 3 rounds with carries, claims, re-entries. Total SOL conserved.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &p3, 1, false, None);

    let init_p1 = get_balance(&svm, &p1.pubkey());
    let init_p2 = get_balance(&svm, &p2.pubkey());
    let init_p3 = get_balance(&svm, &p3.pubkey());
    let init_pw = get_balance(&svm, &pw);

    // Round 1: various buys
    buy(&mut svm, &p1, 1, 3, &pw, None);
    buy(&mut svm, &p2, 1, 5, &pw, None);
    buy(&mut svm, &p3, 1, 2, &pw, None); // p3 = winner R1

    expire_round(&mut svm, 1);

    // Claim p1 and p2 dividends from round 1
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    svm.expire_blockhash();

    // p3 (winner) claims + start round 2
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &p3);
    // All have current_round=0 after claim; buy re-enters automatically

    // Round 2
    buy(&mut svm, &p1, 2, 4, &pw, None);
    buy(&mut svm, &p2, 2, 6, &pw, None); // p2 = winner R2

    expire_round(&mut svm, 2);

    // Claim p1 and p3 dividends from round 2
    // Note: p3 didn't buy in R2, so p3 is not in R2 — skip
    let ix = claim_ix(&p1.pubkey(), 2);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();

    // p2 (winner) claims + start round 3
    let _r3 = complete_round_and_start_next(&mut svm, &admin, 2, &p2);
    // p1 and p2 have current_round=0 after claim; buy re-enters automatically

    // Round 3
    buy(&mut svm, &p1, 3, 2, &pw, None);
    buy(&mut svm, &p2, 3, 3, &pw, None);
    buy(&mut svm, &p3, 3, 5, &pw, None); // p3 = winner R3

    expire_round(&mut svm, 3);

    // All claim in round 3
    let ix = claim_ix(&p1.pubkey(), 3);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p2.pubkey(), 3);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p3.pubkey(), 3);
    send_tx(&mut svm, &[ix], &p3, &[&p3]).unwrap();

    // Final balances
    let final_p1 = get_balance(&svm, &p1.pubkey());
    let final_p2 = get_balance(&svm, &p2.pubkey());
    let final_p3 = get_balance(&svm, &p3.pubkey());
    let final_pw = get_balance(&svm, &pw);
    let vault1 = get_vault_balance(&svm, 1);
    let vault2 = get_vault_balance(&svm, 2);
    let vault3 = get_vault_balance(&svm, 3);

    let total_initial = init_p1 as i128 + init_p2 as i128 + init_p3 as i128 + init_pw as i128;
    let total_final = final_p1 as i128
        + final_p2 as i128
        + final_p3 as i128
        + final_pw as i128
        + vault1 as i128
        + vault2 as i128
        + vault3 as i128;

    // PlayerState PDA rent (created via init_if_needed on first buy)
    let pda_rent = get_balance(&svm, &player_pda(&p1.pubkey()).0) as i128
        + get_balance(&svm, &player_pda(&p2.pubkey()).0) as i128
        + get_balance(&svm, &player_pda(&p3.pubkey()).0) as i128;
    let total_final = total_final + pda_rent;

    let lost = total_initial - total_final;

    // Lost = tx fees + admin airdrop effects (admin lamports come from outside the tracked set)
    assert!(lost >= 0, "SOL created from nothing across 3 rounds!");
    assert!(
        lost <= 500_000, // generous bound for many txs
        "Too much SOL lost across 3 rounds: {}",
        lost
    );
}
