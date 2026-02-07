// Integration tests: timer boundaries, auto-end, monotonicity
mod helpers;

use helpers::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[test]
fn test_buy_at_exact_timer_end_auto_ends() {
    // Clock = timer_end. Buy triggers auto-end (no-op return). Game becomes inactive.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end); // exactly at timer_end

    let ix = buy_keys_ix(&player.pubkey(), 1, 1, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let game_after = get_game(&svm, 1);
    assert!(!game_after.active, "Game should be inactive at exact timer_end");
    assert_eq!(game_after.total_keys, 0, "No keys should have been bought");
}

#[test]
fn test_buy_one_second_before_succeeds() {
    // Clock = timer_end - 1. Buy succeeds. Timer extends.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end - 1); // one second before

    let ix = buy_keys_ix(&player.pubkey(), 1, 1, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let game_after = get_game(&svm, 1);
    assert!(game_after.active, "Game should still be active");
    assert_eq!(game_after.total_keys, 1, "1 key should have been bought");
    assert!(
        game_after.timer_end >= game.timer_end,
        "Timer should not decrease: before={}, after={}",
        game.timer_end,
        game_after.timer_end
    );
}

#[test]
fn test_buy_after_timer_end_auto_ends() {
    // Clock = timer_end + 1. Buy auto-ends. Game inactive.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let game = get_game(&svm, 1);
    set_clock(&mut svm, game.timer_end + 1);

    let ix = buy_keys_ix(&player.pubkey(), 1, 1, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let game_after = get_game(&svm, 1);
    assert!(!game_after.active, "Game should auto-end after timer_end");
    assert_eq!(game_after.total_keys, 0, "No keys bought on auto-end");
}

#[test]
fn test_timer_extension_capped_at_max() {
    // Buy when extension would exceed round_start + max_timer_secs. Timer capped.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);

    let game = get_game(&svm, 1);
    let max_end = game.round_start + game.max_timer_secs;

    // Set clock to near max so extension would exceed
    set_clock(&mut svm, max_end - 10);

    let ix = buy_keys_ix(&player.pubkey(), 1, 1, false, &pw, None);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let game_after = get_game(&svm, 1);
    assert!(game_after.active);
    // timer_end should be capped at max_end
    assert!(
        game_after.timer_end <= max_end,
        "Timer should be capped at max: timer_end={}, max={}",
        game_after.timer_end,
        max_end
    );
}

#[test]
fn test_timer_monotonicity_20_buys() {
    // 20 consecutive buys. Assert timer_end never decreases.
    let (mut svm, _admin, pw) = setup_game();

    let players: Vec<Keypair> = (0..4).map(|_| Keypair::new()).collect();
    for p in &players {
        register(&mut svm, p, 1, false, None);
    }

    let mut prev_timer_end = get_game(&svm, 1).timer_end;

    for i in 0..20 {
        // Advance clock slightly to simulate passage of time
        advance_clock(&mut svm, 5);
        svm.expire_blockhash();
        buy(&mut svm, &players[i % 4], 1, 1, &pw, None);

        let game = get_game(&svm, 1);
        assert!(
            game.timer_end >= prev_timer_end,
            "Timer decreased at buy {}: prev={}, now={}",
            i,
            prev_timer_end,
            game.timer_end
        );
        prev_timer_end = game.timer_end;
    }
}

#[test]
fn test_empty_round_expiry_allows_new_round() {
    // Round with 0 buys. Expire. Start new round.
    let (mut svm, admin, _pw) = setup_game();

    let game = get_game(&svm, 1);
    assert_eq!(game.total_keys, 0);

    set_clock(&mut svm, game.timer_end + 1);

    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), 1);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let game2 = get_game(&svm, 2);
    assert!(game2.active);
    assert_eq!(game2.total_keys, 0);
}

#[test]
fn test_claim_auto_ends_round() {
    // Timer expired but game still marked active (from SVM perspective — no tx to trigger auto-end).
    // Claim triggers auto-end and proceeds.
    let (mut svm, _admin, pw) = setup_game();

    let player = Keypair::new();
    register(&mut svm, &player, 1, false, None);
    buy(&mut svm, &player, 1, 5, &pw, None);

    let game = get_game(&svm, 1);
    assert!(game.active);

    // Expire timer but don't send any tx — game.active stays true in state
    set_clock(&mut svm, game.timer_end + 100);

    // Verify game is still marked active in the account
    let game_before_claim = get_game(&svm, 1);
    assert!(game_before_claim.active, "Game should still be marked active before claim");

    // Claim auto-ends then proceeds
    let ix = claim_ix(&player.pubkey(), 1);
    send_tx(&mut svm, &[ix], &player, &[&player]).unwrap();

    let game_after = get_game(&svm, 1);
    assert!(!game_after.active, "Claim should auto-end the round");
    assert!(game_after.winner_claimed, "Winner should be marked as claimed");
}
