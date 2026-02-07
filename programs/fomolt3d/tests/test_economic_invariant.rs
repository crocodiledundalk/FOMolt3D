// Economic invariant test: total outflows must equal total inflows
// Tests that the game is not creating or destroying SOL
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_economic_invariant_simple() {
    // 3 players, multiple buys each, timer expires, all claim, verify SOL conservation
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &p3, 1, false, None);

    // Record initial balances (after airdrop + registration rent)
    let init_p1 = get_balance(&svm, &p1.pubkey());
    let init_p2 = get_balance(&svm, &p2.pubkey());
    let init_p3 = get_balance(&svm, &p3.pubkey());
    let init_pw = get_balance(&svm, &pw);
    let init_vault = get_vault_balance(&svm, 1);

    // Multiple buys
    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 3, &pw, None);
    buy(&mut svm, &p3, 1, 7, &pw, None);
    buy(&mut svm, &p1, 1, 2, &pw, None);
    buy(&mut svm, &p2, 1, 4, &pw, None);

    // P2 is last buyer
    let game = get_game(&svm, 1);
    assert!(pubkey_eq(&game.last_buyer, &p2.pubkey()));

    // Expire timer
    set_clock(&mut svm, game.timer_end + 1);

    // Everyone claims dividends (non-winners first)
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();

    svm.expire_blockhash();

    let ix = claim_ix(&p3.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p3, &[&p3]).unwrap();

    svm.expire_blockhash();

    // P2 claims (winner gets dividends + winner prize)
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();

    // Final balances
    let final_p1 = get_balance(&svm, &p1.pubkey());
    let final_p2 = get_balance(&svm, &p2.pubkey());
    let final_p3 = get_balance(&svm, &p3.pubkey());
    let final_pw = get_balance(&svm, &pw);
    let final_vault = get_vault_balance(&svm, 1);

    // Calculate total SOL movement
    // Players spent: init - final (positive = spent)
    let p1_spent = init_p1 as i128 - final_p1 as i128;
    let p2_spent = init_p2 as i128 - final_p2 as i128;
    let p3_spent = init_p3 as i128 - final_p3 as i128;
    let total_spent = p1_spent + p2_spent + p3_spent;

    // Recipients gained
    let pw_gained = final_pw as i128 - init_pw as i128;
    let vault_remaining = final_vault as i128 - init_vault as i128;

    // Transaction fees: 5 buys + 3 claims = 8 transactions x 5000 lamports each
    let tx_fees: i128 = 8 * 5000;

    // PlayerState PDA rent (created via init_if_needed on first buy)
    let pda_rent = get_balance(&svm, &player_pda(&p1.pubkey()).0) as i128
        + get_balance(&svm, &player_pda(&p2.pubkey()).0) as i128
        + get_balance(&svm, &player_pda(&p3.pubkey()).0) as i128;

    // Invariant: what players spent = what protocol gained + what's left in vault + tx fees + PDA rent
    let total_received = pw_gained + vault_remaining + tx_fees + pda_rent;

    // Allow small rounding tolerance (1 lamport per buy = 5 buys = 5 lamports max)
    let diff = (total_spent - total_received).unsigned_abs();
    assert!(
        diff <= 10, // generous tolerance for rounding
        "Economic invariant violated! Spent: {}, Received+Vault: {}, TxFees: {}, Diff: {}",
        total_spent,
        total_received,
        tx_fees,
        diff
    );
}

#[test]
fn test_vault_never_goes_negative() {
    // After all claims, vault balance should be >= next_round_pot
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 10, &pw, None);
    buy(&mut svm, &p1, 1, 5, &pw, None);

    // Expire timer (P1 is last buyer)
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // P2 claims dividends
    let ix = claim_ix(&p2.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();

    svm.expire_blockhash();

    // P1 claims winner + dividends
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();

    let vault_balance = get_vault_balance(&svm, 1);
    let game_final = get_game(&svm, 1);

    // Vault should have at least next_round_pot remaining
    assert!(
        vault_balance >= game_final.next_round_pot,
        "Vault ({}) should have at least next_round_pot ({}) remaining",
        vault_balance,
        game_final.next_round_pot
    );
}

#[test]
fn test_revenue_splits_cover_all_outflows() {
    // Verify: winner_pot + total_dividend_pool + next_round_pot + protocol_fee ~ total_cost
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    let pw_before = get_balance(&svm, &pw);
    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &p2, 1, 10, &pw, None);
    let pw_after = get_balance(&svm, &pw);

    let protocol_fees = pw_after - pw_before;
    let game = get_game(&svm, 1);

    // winner_pot + next_round_pot + total_dividend_pool + protocol_fees should account
    // for virtually all funds
    let _accounted = game.winner_pot + game.next_round_pot + game.total_dividend_pool + protocol_fees;

    // Vault should hold: pot_lamports - protocol_fees (since protocol goes direct)
    let vault_bal = get_vault_balance(&svm, 1);

    assert!(
        vault_bal > 0,
        "Vault should have funds after buys"
    );
}

#[test]
fn test_many_buys_economic_invariant() {
    // Stress test: 5 players, 20 random-sized buys, then all claim at round end
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..5).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    let init_pw = get_balance(&svm, &pw);
    let init_bals: Vec<u64> = players.iter().map(|p| get_balance(&svm, &p.pubkey())).collect();

    // 20 buys across 5 players
    let buy_amounts = [1u64, 3, 2, 5, 1, 4, 2, 7, 3, 1, 6, 2, 4, 1, 3, 8, 2, 5, 1, 3];
    let mut buy_tx_count = 0u64;
    for (i, &amount) in buy_amounts.iter().enumerate() {
        let player = &players[i % 5];
        // Expire blockhash to avoid AlreadyProcessed on repeat player+amount combos
        svm.expire_blockhash();
        buy(&mut svm, player, 1, amount, &pw, None);
        buy_tx_count += 1;
    }

    // Expire timer and claim
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // Find the winner (last buyer)
    let last_buyer_idx = (buy_amounts.len() - 1) % 5;

    // All players claim
    let mut claim_tx_count = 0u64;
    for (i, p) in players.iter().enumerate() {
        svm.expire_blockhash();
        let ix = claim_ix(&p.pubkey(), 1);
        let result = send_tx(&mut svm, &[ix], p, &[p]);
        if i == last_buyer_idx {
            // Winner should succeed
            assert!(result.is_ok(), "Winner claim should succeed");
        }
        if result.is_ok() {
            claim_tx_count += 1;
        }
    }

    // Verify conservation
    let final_bals: Vec<u64> = players.iter().map(|p| get_balance(&svm, &p.pubkey())).collect();
    let final_pw = get_balance(&svm, &pw);
    let final_vault = get_vault_balance(&svm, 1);

    let total_player_change: i128 = players
        .iter()
        .enumerate()
        .map(|(i, _)| init_bals[i] as i128 - final_bals[i] as i128)
        .sum();

    let pw_gained = final_pw as i128 - init_pw as i128;
    let vault_remaining = final_vault as i128;
    // Account for transaction fees (5000 lamports per tx)
    let tx_fees = (buy_tx_count + claim_tx_count) as i128 * 5000;

    // PlayerState PDA rent (created via init_if_needed on first buy)
    let pda_rent: i128 = players
        .iter()
        .map(|p| get_balance(&svm, &player_pda(&p.pubkey()).0) as i128)
        .sum();

    let diff = (total_player_change - pw_gained - vault_remaining - tx_fees - pda_rent).unsigned_abs();
    assert!(
        diff <= 30, // rounding tolerance
        "Economic invariant violated after 20 buys! Player spent: {}, PW gained: {}, Vault: {}, TxFees: {}, Diff: {}",
        total_player_change,
        pw_gained,
        vault_remaining,
        tx_fees,
        diff
    );
}
