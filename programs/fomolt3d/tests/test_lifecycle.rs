// Integration test: full round lifecycle
// config -> init round 1 -> buys -> timer expires -> claims -> new round
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_full_round_lifecycle() {
    let (mut svm, admin, pw) = setup_game();

    // --- Phase 1: Players register and buy keys ---
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let p3 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);
    register(&mut svm, &p3, 1, false, None);

    buy(&mut svm, &p1, 1, 5, &pw, None);
    buy(&mut svm, &p2, 1, 3, &pw, None);
    buy(&mut svm, &p3, 1, 2, &pw, None); // P3 is the last buyer

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 10);
    assert!(pubkey_eq(&game.last_buyer, &p3.pubkey()));
    assert!(game.active);

    // --- Phase 2: Timer expires ---
    set_clock(&mut svm, game.timer_end + 1);

    // Non-winner claims dividends at round end
    let p1_bal_before = get_balance(&svm, &p1.pubkey());
    let ix = claim_ix(&p1.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p1, &[&p1]).unwrap();
    let p1_bal_after = get_balance(&svm, &p1.pubkey());
    assert!(p1_bal_after > p1_bal_before, "P1 should get dividends");

    // After claim, P1's current_round is 0
    let ps1 = get_player(&svm, &p1.pubkey());
    assert_eq!(ps1.current_round, 0);
    assert_eq!(ps1.keys, 0);

    // --- Phase 3: Winner (P3) claims ---
    svm.expire_blockhash();
    let p3_bal_before = get_balance(&svm, &p3.pubkey());
    let ix = claim_ix(&p3.pubkey(), 1);
    send_tx(&mut svm, &[ix], &p3, &[&p3]).unwrap();
    let p3_bal_after = get_balance(&svm, &p3.pubkey());

    let game = get_game(&svm, 1);
    assert!(game.winner_claimed);
    assert!(!game.active);

    // P3 should have received both winner prize and dividends
    assert!(
        p3_bal_after > p3_bal_before,
        "Winner should receive substantial payout"
    );

    // --- Phase 4: Start new round ---
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert_eq!(game2.round, 2);
    assert!(game2.active);
    assert_eq!(game2.total_keys, 0);
    assert!(pubkey_is_default(&game2.last_buyer));

    // Carry-over should match round 1's next_round_pot
    let game1 = get_game(&svm, 1);
    assert_eq!(game2.pot_lamports, game1.next_round_pot);
}

#[test]
fn test_winner_cannot_double_claim() {
    let (mut svm, _admin, pw) = setup_game();

    let winner = Keypair::new();
    register(&mut svm, &winner, 1, false, None);
    buy(&mut svm, &winner, 1, 1, &pw, None);

    // Expire timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // First claim: winner gets prize + dividends
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();

    // After claim: current_round = 0, so second claim will fail with PlayerNotInRound
    let ps = get_player(&svm, &winner.pubkey());
    assert_eq!(ps.current_round, 0);

    svm.expire_blockhash();

    // Second claim: should fail (player no longer in round 1)
    let ix = claim_ix(&winner.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &winner, &[&winner]);
    assert!(
        err.contains("PlayerNotInRound") || err.contains("NothingToClaim") || err.contains("custom program error"),
        "Second claim should fail, got: {}",
        err
    );
}

#[test]
fn test_start_new_round_succeeds_without_winner_claiming() {
    let (mut svm, admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 1, &pw, None);

    // Expire timer but don't claim
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // start_new_round succeeds — winner can claim from old round independently
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert_eq!(game2.round, 2);
    assert!(game2.active);
}

#[test]
fn test_empty_round_can_start_new_round() {
    let (mut svm, admin, _pw) = setup_game();

    // Nobody buys keys — timer expires
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // Should be able to start new round (empty round skips winner claim)
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert_eq!(game2.round, 2);
    assert!(game2.active);
}

#[test]
fn test_config_snapshot_immutability() {
    let (mut svm, admin, pw) = setup_game();

    let game1 = get_game(&svm, 1);
    let original_base_price = game1.base_price_lamports;

    // Update config with different values
    let new_params = ConfigParamsData {
        base_price_lamports: 99_000_000,
        protocol_wallet: pw,
        ..Default::default()
    };
    let ix = create_or_update_config_ix(&admin.pubkey(), &new_params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    // Round 1 still uses the original config
    let game1_after = get_game(&svm, 1);
    assert_eq!(
        game1_after.base_price_lamports, original_base_price,
        "In-progress round should not be affected by config changes"
    );
}

#[test]
fn test_start_round_while_active_fails() {
    let (mut svm, admin, _pw) = setup_game();

    // Round 1 is still active
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    let err = send_tx_expect_err(&mut svm, &[ix], &admin, &[&admin]);
    assert!(
        err.contains("GameStillActive") || err.contains("custom program error"),
        "Should not start new round while active, got: {}",
        err
    );
}

#[test]
fn test_auto_end_on_claim() {
    // If timer expired but game.active is still true, claim auto-ends the round
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    // Verify game is still active
    let game = get_game(&svm, 1);
    assert!(game.active);

    // Expire timer
    set_clock(&mut svm, game.timer_end + 1);

    // Claim should succeed (auto-ends the round first)
    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    // Game should now be inactive
    let game_after = get_game(&svm, 1);
    assert!(!game_after.active, "Claim should have auto-ended the round");
}

#[test]
fn test_auto_end_on_buy() {
    // If timer expired, buy_keys auto-ends the round and returns Ok (no-op)
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    // Expire timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // Buy should succeed (auto-end no-op)
    let ix = buy_keys_ix(&player.pubkey(), 1, 1, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let game_after = get_game(&svm, 1);
    assert!(!game_after.active, "Buy should have auto-ended the round");
    assert_eq!(game_after.total_keys, 0, "No keys should have been bought");
}

#[test]
fn test_new_round_without_non_winner_claims() {
    // Winner claims. Non-winners do NOT claim. Start new round succeeds.
    // Non-winners' dividends stay in old vault.
    let (mut svm, admin, pw) = setup_game();

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

    // Only winner claims
    let ix = claim_ix(&winner.pubkey(), 1);
    send_tx(&mut svm, &[ix], &winner, &[&winner]).unwrap();

    // Start new round — should succeed
    svm.expire_blockhash();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert!(game2.active);

    // Old vault retains unclaimed dividends
    let old_vault = get_vault_balance(&svm, 1);
    assert!(old_vault > 0, "Old vault should retain unclaimed dividends for p1, p2");
}

#[test]
fn test_single_player_winner_is_self() {
    // With only one player, that player is both the only key holder and the winner.
    // They get winner_pot + full dividend_pool.
    let (mut svm, _admin, pw) = setup_game();

    let sole_player = Keypair::new();
    register(&mut svm, &sole_player, 1, false, None);
    buy(&mut svm, &sole_player, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    assert!(pubkey_eq(&game.last_buyer, &sole_player.pubkey()));
    let total_payout = game.winner_pot + game.total_dividend_pool;

    expire_round(&mut svm, 1);

    let before = get_balance(&svm, &sole_player.pubkey());
    let ix = claim_ix(&sole_player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &sole_player, &[&sole_player]).unwrap();
    let after = get_balance(&svm, &sole_player.pubkey());

    let received = after + 5000 - before;
    assert_eq!(
        received, total_payout,
        "Sole player should get winner_pot + all dividends: received={}, expected={}",
        received, total_payout
    );

    let game_after = get_game(&svm, 1);
    assert!(game_after.winner_claimed);
    // With no-deduction model, pool stays constant (double-claim prevented by sentinel)
    assert!(game_after.total_dividend_pool > 0, "Pool should stay constant (no deduction on claim)");
}
