// Integration tests for buy_keys and basic game mechanics
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_first_buy_creates_player_state() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    airdrop(&mut svm, &player.pubkey(), 100_000_000_000);

    // 0-key buy = registration only
    buy(&mut svm, &player, 1, 0, &pw, None);

    let ps = get_player(&svm, &player.pubkey());
    assert!(pubkey_eq(&ps.player, &player.pubkey()));
    assert_eq!(ps.keys, 0);
    assert_eq!(ps.current_round, 1);
    assert!(!ps.is_agent);
    assert!(ps.referrer.is_none());
}

#[test]
fn test_buy_sets_agent_flag() {
    let (mut svm, _admin, pw) = setup_game();
    let agent = Keypair::new();
    airdrop(&mut svm, &agent.pubkey(), 100_000_000_000);

    // 0-key buy with is_agent = true
    let ix = buy_keys_ix(&agent.pubkey(), 1, 0, true, &pw, None);
    send_tx(&mut svm, &[ix], &agent, &[&agent]).unwrap();

    let ps = get_player(&svm, &agent.pubkey());
    assert!(ps.is_agent);
}

#[test]
fn test_buy_single_key() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let balance_before = get_balance(&svm, &player.pubkey());
    buy(&mut svm, &player, 1, 1, &pw, None);

    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.keys, 1);

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 1);
    assert!(game.pot_lamports > 0);
    assert!(pubkey_eq(&game.last_buyer, &player.pubkey()));

    // Player balance should have decreased
    let balance_after = get_balance(&svm, &player.pubkey());
    assert!(balance_after < balance_before);
}

#[test]
fn test_buy_multiple_keys() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 10, &pw, None);

    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.keys, 10);

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 10);
}

#[test]
fn test_bonding_curve_cost_increases() {
    let (mut svm, _admin, pw) = setup_game();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    let bal_p1_before = get_balance(&svm, &p1.pubkey());
    buy(&mut svm, &p1, 1, 10, &pw, None);
    let cost_first = bal_p1_before - get_balance(&svm, &p1.pubkey());

    let bal_p2_before = get_balance(&svm, &p2.pubkey());
    buy(&mut svm, &p2, 1, 10, &pw, None);
    let cost_second = bal_p2_before - get_balance(&svm, &p2.pubkey());

    // Second batch should cost more due to bonding curve
    assert!(
        cost_second > cost_first,
        "Second batch ({}) should cost more than first ({})",
        cost_second,
        cost_first
    );
}

#[test]
fn test_protocol_fee_transferred() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let pw_bal_before = get_balance(&svm, &pw);
    buy(&mut svm, &player, 1, 5, &pw, None);
    let pw_bal_after = get_balance(&svm, &pw);

    // Protocol wallet should have received fees (2% of cost)
    assert!(
        pw_bal_after > pw_bal_before,
        "Protocol wallet should receive fee"
    );
}

#[test]
fn test_winner_pot_accumulates() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    assert!(game.winner_pot > 0, "Winner pot should accumulate");
}

#[test]
fn test_next_round_pot_accumulates() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    assert!(game.next_round_pot > 0, "Next round pot should accumulate");
}

#[test]
fn test_total_dividend_pool_accumulates() {
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    assert!(game.total_dividend_pool > 0, "Total dividend pool should accumulate");
}

#[test]
fn test_timer_extends_on_buy() {
    let (mut svm, _admin, pw) = setup_game();
    let game_before = get_game(&svm, 1);

    // Advance clock so timer extension is meaningful
    set_clock(&mut svm, game_before.timer_end - 100);

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 1, &pw, None);

    let game_after = get_game(&svm, 1);
    assert!(
        game_after.timer_end >= game_before.timer_end,
        "Timer should not decrease after buy"
    );
}

#[test]
fn test_zero_key_buy_is_registration_only() {
    // 0-key buy should succeed (registration only), not error
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    airdrop(&mut svm, &player.pubkey(), 100_000_000_000);

    let ix = buy_keys_ix(&player.pubkey(), 1, 0, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.keys, 0, "No keys should be bought");
    assert_eq!(ps.current_round, 1, "Should be registered in round 1");

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 0, "No keys in game");
    assert_eq!(game.total_players, 1, "Player count incremented");
}

#[test]
fn test_buy_after_timer_expired_is_noop() {
    // After timer expires, buy_keys auto-ends the round and returns Ok (no-op)
    let (mut svm, _admin, pw) = setup_game();
    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 1, &pw, None);

    // Warp past timer
    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    // Buy should succeed (auto-end no-op) but not actually buy keys
    svm.expire_blockhash();
    let ix = buy_keys_ix(&player.pubkey(), 1, 1, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    // Verify game is now inactive
    let game_after = get_game(&svm, 1);
    assert!(!game_after.active, "Game should be auto-ended");

    // Player should still have 1 key from before (no-op)
    let ps = get_player(&svm, &player.pubkey());
    assert_eq!(ps.keys, 1, "No additional keys should have been bought");
}

#[test]
fn test_total_players_increments() {
    let (mut svm, _admin, pw) = setup_game();

    let p1 = Keypair::new();
    let p2 = Keypair::new();
    register(&mut svm, &p1, 1, false, None);
    register(&mut svm, &p2, 1, false, None);

    // total_players increments on first buy (registration), not on airdrop
    let game_before = get_game(&svm, 1);
    assert_eq!(game_before.total_players, 0, "No players until first buy");

    buy(&mut svm, &p1, 1, 1, &pw, None);
    let game = get_game(&svm, 1);
    assert_eq!(game.total_players, 1);

    buy(&mut svm, &p2, 1, 1, &pw, None);
    let game = get_game(&svm, 1);
    assert_eq!(game.total_players, 2);
}
