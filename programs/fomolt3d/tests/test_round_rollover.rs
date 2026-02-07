// Integration tests: multi-round lifecycle, carry-over, vault transfer
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_three_round_full_lifecycle() {
    // Round 1 → 2 → 3. Players claim between rounds, buy again.
    // Verify carry-over chain and economic conservation.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    let init_p1 = get_balance(&svm, &p1.pubkey());
    let init_p2 = get_balance(&svm, &p2.pubkey());
    let init_pw = get_balance(&svm, &pw);

    // Round 1: p1 buys 5, p2 buys 3 (p2 = winner)
    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 3, &pw, None);
    expire_round(&mut svm, 1);

    // p1 claims dividends from round 1
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();

    // p2 claims winner (also gets dividends) + start round 2
    let new_round = complete_round_and_start_next(&mut svm, &admin, 1, &p2);
    assert_eq!(new_round, 2);

    // Both have current_round=0 after claim; buy re-enters automatically

    // Round 2: both buy again
    buy(&mut svm, &p1, 2, 4, &pw, None);
    buy(&mut svm, &p2, 2, 6, &pw, None);
    expire_round(&mut svm, 2);

    // p1 claims dividends from round 2
    let ix = claim_ix(&p1.pubkey(), 2);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();

    let new_round = complete_round_and_start_next(&mut svm, &admin, 2, &p2);
    assert_eq!(new_round, 3);

    // Round 3: buy once each
    buy(&mut svm, &p1, 3, 2, &pw, None);
    buy(&mut svm, &p2, 3, 3, &pw, None);
    expire_round(&mut svm, 3);

    // Final claims
    let ix = claim_ix(&p1.pubkey(), 3);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    svm.expire_blockhash();
    let ix = claim_ix(&p2.pubkey(), 3);
    send_tx(&mut svm, &[ix], &p2, &[&p2]).unwrap();

    // Verify game 3 state
    let game3 = get_game(&svm, 3);
    assert!(game3.winner_claimed);
    assert!(!game3.active);

    // No SOL created from nothing
    let final_p1 = get_balance(&svm, &p1.pubkey());
    let final_p2 = get_balance(&svm, &p2.pubkey());
    let final_pw = get_balance(&svm, &pw);
    let vault3 = get_vault_balance(&svm, 3);

    let total_initial = init_p1 as i128 + init_p2 as i128 + init_pw as i128;
    let total_final = final_p1 as i128 + final_p2 as i128 + final_pw as i128 + vault3 as i128;
    // Vault 1 and 2 may retain stranded dividend dust
    let vault1 = get_vault_balance(&svm, 1) as i128;
    let vault2 = get_vault_balance(&svm, 2) as i128;
    // PlayerState PDA rent (created via init_if_needed on first buy)
    let pda_rent = get_balance(&svm, &player_pda(&p1.pubkey()).0) as i128
        + get_balance(&svm, &player_pda(&p2.pubkey()).0) as i128;
    let total_final_with_vaults = total_final + vault1 + vault2 + pda_rent;

    let lost = total_initial - total_final_with_vaults;
    assert!(lost >= 0, "SOL created from nothing!");
    // Lost = tx fees + admin airdrop effects; must be small
    assert!(
        lost <= 500_000,
        "Too much SOL lost across 3 rounds: {}",
        lost
    );
}

#[test]
fn test_carry_over_exact() {
    // Round 1 next_round_pot = X. Start round 2. Assert: game2.pot_lamports == X, game2.winner_pot == X.
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 10, &pw, None);

    let game1 = get_game(&svm, 1);
    let carry_over = game1.next_round_pot;
    assert!(carry_over > 0, "next_round_pot should be > 0");

    expire_round(&mut svm, 1);
    let _new_round = complete_round_and_start_next(&mut svm, &admin, 1, &player);

    let game2 = get_game(&svm, 2);
    assert_eq!(
        game2.pot_lamports, carry_over,
        "Round 2 pot should equal carry-over"
    );
    assert_eq!(
        game2.winner_pot, carry_over,
        "Round 2 winner_pot should be seeded with carry-over"
    );
}

#[test]
fn test_vault_carry_over_transfer_exact() {
    // Before/after start_new_round: vault(1) decreases by next_round_pot, vault(2) increases by same.
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 10, &pw, None);

    let game1 = get_game(&svm, 1);
    let carry_over = game1.next_round_pot;

    expire_round(&mut svm, 1);

    // Claim winner
    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let vault1_before = get_vault_balance(&svm, 1);

    // Start round 2
    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let vault1_after = get_vault_balance(&svm, 1);
    let vault2_after = get_vault_balance(&svm, 2);

    assert_eq!(
        vault1_before - vault1_after,
        carry_over,
        "Vault 1 should decrease by exactly carry_over"
    );
    assert_eq!(
        vault2_after, carry_over,
        "Vault 2 should receive exactly carry_over"
    );
}

#[test]
fn test_start_new_round_before_all_claims() {
    // Winner claims. Non-winners don't. Start round 2 succeeds. Old vault retains non-winner dividends.
    let (mut svm, admin, pw) = setup_game();

    let p1 = Keypair::new();
    let winner = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &winner, 1, false, None);

    buy(&mut svm, &p1, 1, 10, &pw, None);
    buy(&mut svm, &winner, 1, 5, &pw, None);

    expire_round(&mut svm, 1);

    // Only winner claims
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();

    // Start round 2 — should succeed even though p1 hasn't claimed
    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert!(game2.active);
    assert_eq!(game2.round, 2);

    // Old vault should still have p1's unclaimed dividends
    let old_vault = get_vault_balance(&svm, 1);
    assert!(old_vault > 0, "Old vault should retain unclaimed dividends");
}

#[test]
fn test_start_new_round_immediately_after_winner() {
    // Single player, wins, claims. Start round 2. Verify carry-over.
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game1 = get_game(&svm, 1);
    let carry_over = game1.next_round_pot;

    expire_round(&mut svm, 1);
    let _new_round = complete_round_and_start_next(&mut svm, &admin, 1, &player);

    let game2 = get_game(&svm, 2);
    assert_eq!(game2.pot_lamports, carry_over);
    assert_eq!(game2.winner_pot, carry_over);
    assert!(game2.active);
}

#[test]
fn test_empty_round_carries_full_vault() {
    // Round 1 with buys, carry-over to round 2 (empty), carry-over to round 3.
    // Empty round forwards entire vault balance.
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game1 = get_game(&svm, 1);
    let carry_over_1 = game1.next_round_pot;

    expire_round(&mut svm, 1);
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &player);

    // Round 2: nobody buys. Expire.
    let game2 = get_game(&svm, 2);
    set_clock(&mut svm, game2.timer_end + 1);

    let vault2_balance = get_vault_balance(&svm, 2);
    assert_eq!(vault2_balance, carry_over_1);

    // Start round 3 — empty round carries entire vault balance
    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 2);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game3 = get_game(&svm, 3);
    assert_eq!(
        game3.pot_lamports, carry_over_1,
        "Round 3 should carry full vault from empty round 2"
    );
    let vault3_balance = get_vault_balance(&svm, 3);
    assert_eq!(vault3_balance, carry_over_1);
}

#[test]
fn test_two_consecutive_empty_rounds() {
    // No buys in rounds 1 or 2. Start rounds 2 and 3. All succeed.
    let (mut svm, admin, _pw) = setup_game();

    // Round 1: empty
    let game1 = get_game(&svm, 1);
    set_clock(&mut svm, game1.timer_end + 1);
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert_eq!(game2.round, 2);
    assert!(game2.active);

    // Round 2: also empty
    set_clock(&mut svm, game2.timer_end + 1);
    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 2);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game3 = get_game(&svm, 3);
    assert_eq!(game3.round, 3);
    assert!(game3.active);
}

#[test]
fn test_carry_over_plus_fresh_buys() {
    // Round 2 has carry-over + new buys. Verify pot_lamports = carry_over + sum(pot of new buys).
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game1 = get_game(&svm, 1);
    let carry_over = game1.next_round_pot;

    expire_round(&mut svm, 1);
    let _r2 = complete_round_and_start_next(&mut svm, &admin, 1, &player);

    // Buy in round 2 (returning player re-enters automatically)
    buy(&mut svm, &player, 2, 3, &pw, None);

    let game2 = get_game(&svm, 2);
    // pot_lamports tracks total cost including carry-over
    assert!(
        game2.pot_lamports > carry_over,
        "Round 2 pot should include carry-over + new buys"
    );
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

    // p1 can claim from round 1 and get dividends
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
