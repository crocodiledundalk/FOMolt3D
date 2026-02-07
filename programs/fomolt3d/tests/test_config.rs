// Integration tests for create_or_update_config and initialize_first_round
mod helpers;

use helpers::*;
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer};

#[test]
fn test_create_config_with_valid_params() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);

    let protocol_wallet = Pubkey::new_unique();
    let params = ConfigParamsData {
        protocol_wallet,
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let config = get_config(&svm);
    assert!(pubkey_eq(&config.admin, &admin.pubkey()));
    assert_eq!(config.base_price_lamports, 10_000_000);
    assert_eq!(config.price_increment_lamports, 1_000_000);
    assert_eq!(config.timer_extension_secs, 30);
    assert_eq!(config.max_timer_secs, 86_400);
    assert_eq!(config.winner_bps, 4800);
    assert_eq!(config.dividend_bps, 4500);
    assert_eq!(config.next_round_bps, 700);
    assert_eq!(config.protocol_fee_bps, 200);
    assert_eq!(config.referral_bonus_bps, 1000);
    assert!(pubkey_eq(&config.protocol_wallet, &protocol_wallet));
}

#[test]
fn test_update_config_by_admin() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);

    let protocol_wallet = Pubkey::new_unique();
    let params = ConfigParamsData {
        protocol_wallet,
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    // Update with new values (winner + dividend + next_round must = 10000)
    let new_params = ConfigParamsData {
        base_price_lamports: 20_000_000,
        price_increment_lamports: 2_000_000,
        timer_extension_secs: 60,
        max_timer_secs: 172_800,
        winner_bps: 5000,
        dividend_bps: 4500,
        next_round_bps: 500,
        protocol_fee_bps: 500,
        referral_bonus_bps: 500,
        protocol_wallet,
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &new_params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let config = get_config(&svm);
    assert_eq!(config.base_price_lamports, 20_000_000);
    assert_eq!(config.winner_bps, 5000);
    assert_eq!(config.dividend_bps, 4500);
    assert_eq!(config.next_round_bps, 500);
    assert_eq!(config.protocol_fee_bps, 500);
}

#[test]
fn test_non_admin_cannot_update_config() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    let attacker = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    airdrop(&mut svm, &attacker.pubkey(), 10_000_000_000);

    let protocol_wallet = Pubkey::new_unique();
    let params = ConfigParamsData {
        protocol_wallet,
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let ix = create_or_update_config_ix(&attacker.pubkey(), &params);
    let err = send_tx_expect_err(&mut svm, &[ix], &attacker, &[&attacker]);
    assert!(
        err.contains("Unauthorized") || err.contains("custom program error"),
        "Expected Unauthorized error, got: {}",
        err
    );
}

#[test]
fn test_invalid_bps_sum_rejected() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);

    // winner + dividend + next_round must = 10000 (protocol_fee_bps is separate)
    let params = ConfigParamsData {
        winner_bps: 4800,
        dividend_bps: 4500,
        next_round_bps: 600, // 4800 + 4500 + 600 = 9900, not 10000
        protocol_fee_bps: 200,
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    let err = send_tx_expect_err(&mut svm, &[ix], &admin, &[&admin]);
    assert!(
        err.contains("InvalidConfig") || err.contains("custom program error"),
        "Expected InvalidConfig error, got: {}",
        err
    );
}

#[test]
fn test_zero_base_price_rejected() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);

    let params = ConfigParamsData {
        base_price_lamports: 0,
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    let err = send_tx_expect_err(&mut svm, &[ix], &admin, &[&admin]);
    assert!(
        err.contains("InvalidConfig") || err.contains("custom program error"),
        "Expected InvalidConfig error, got: {}",
        err
    );
}

#[test]
fn test_default_protocol_wallet_rejected() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);

    let params = ConfigParamsData {
        protocol_wallet: Pubkey::default(),
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    let err = send_tx_expect_err(&mut svm, &[ix], &admin, &[&admin]);
    assert!(
        err.contains("InvalidConfig") || err.contains("custom program error"),
        "Expected InvalidConfig error, got: {}",
        err
    );
}

#[test]
fn test_initialize_first_round() {
    let (svm, _admin, _) = setup_game();

    let game = get_game(&svm, 1);
    assert_eq!(game.round, 1);
    assert!(game.active);
    assert!(!game.winner_claimed);
    assert_eq!(game.total_keys, 0);
    assert_eq!(game.pot_lamports, 0);
    assert!(pubkey_is_default(&game.last_buyer));
    assert_eq!(game.next_round_pot, 0);
    assert_eq!(game.winner_pot, 0);
    assert_eq!(game.total_players, 0);

    // Verify config snapshot
    let config = get_config(&svm);
    assert_eq!(game.base_price_lamports, config.base_price_lamports);
    assert_eq!(game.price_increment_lamports, config.price_increment_lamports);
    assert_eq!(game.timer_extension_secs, config.timer_extension_secs);
    assert_eq!(game.max_timer_secs, config.max_timer_secs);
    assert_eq!(game.winner_bps, config.winner_bps);
    assert_eq!(game.dividend_bps, config.dividend_bps);
    assert_eq!(game.next_round_bps, config.next_round_bps);
    assert_eq!(game.protocol_fee_bps, config.protocol_fee_bps);
    assert_eq!(game.referral_bonus_bps, config.referral_bonus_bps);
    assert_eq!(game.protocol_wallet, config.protocol_wallet);

    let clock = get_clock(&svm);
    assert_eq!(game.timer_end, clock.unix_timestamp + config.max_timer_secs);
    assert_eq!(game.round_start, clock.unix_timestamp);
}

#[test]
fn test_non_admin_cannot_initialize_round() {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    let attacker = Keypair::new();
    airdrop(&mut svm, &admin.pubkey(), 10_000_000_000);
    airdrop(&mut svm, &attacker.pubkey(), 10_000_000_000);

    let protocol_wallet = Pubkey::new_unique();
    let params = ConfigParamsData {
        protocol_wallet,
        ..Default::default()
    };

    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    let ix = initialize_first_round_ix(&attacker.pubkey());
    let err = send_tx_expect_err(&mut svm, &[ix], &attacker, &[&attacker]);
    assert!(
        err.contains("Unauthorized") || err.contains("ConstraintRaw") || err.contains("custom program error"),
        "Expected auth error, got: {}",
        err
    );
}
