#![allow(dead_code)]
// LiteSVM integration test helpers for FOMolt3D
//
// NOTE: anchor-lang uses solana crate v2.x types while solana-sdk v3.0 uses v3.x types.
// We handle this by:
// - Using solana-sdk v3.0 types for transaction building (Pubkey, Keypair, etc.)
// - Deserializing account state from raw bytes (avoiding borsh version conflicts)
// - Converting between Pubkey versions via to_bytes()/from()

use litesvm::LiteSVM;
use solana_sdk::{
    clock::Clock,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    transaction::Transaction,
};
use std::path::Path;

/// System program ID
pub const SYSTEM_PROGRAM_ID: Pubkey = solana_sdk::pubkey!("11111111111111111111111111111111");

/// Program ID matching declare_id! in lib.rs
pub const PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw");

/// Anchor discriminator: sha256("global:<name>")[..8]
fn anchor_discriminator(name: &str) -> [u8; 8] {
    use sha2::Digest;
    let hash = sha2::Sha256::digest(format!("global:{}", name).as_bytes());
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&hash[..8]);
    disc
}

// ====== Account data structs (manual deserialization from raw bytes) ======
// These avoid borsh version conflicts by reading fields directly.

/// Parsed GlobalConfig (137 bytes after 8-byte discriminator)
#[derive(Debug)]
pub struct GlobalConfigData {
    pub admin: [u8; 32],
    pub base_price_lamports: u64,
    pub price_increment_lamports: u64,
    pub timer_extension_secs: i64,
    pub max_timer_secs: i64,
    pub winner_bps: u64,
    pub dividend_bps: u64,
    pub next_round_bps: u64,
    pub protocol_fee_bps: u64,
    pub referral_bonus_bps: u64,
    pub protocol_wallet: [u8; 32],
    pub bump: u8,
}

/// Parsed GameState (207 bytes after 8-byte discriminator)
#[derive(Debug)]
pub struct GameStateData {
    pub round: u64,
    pub pot_lamports: u64,
    pub timer_end: i64,
    pub last_buyer: [u8; 32],
    pub total_keys: u64,
    pub round_start: i64,
    pub active: bool,
    pub winner_claimed: bool,
    pub total_players: u32,
    pub total_dividend_pool: u64,
    pub next_round_pot: u64,
    pub winner_pot: u64,
    pub base_price_lamports: u64,
    pub price_increment_lamports: u64,
    pub timer_extension_secs: i64,
    pub max_timer_secs: i64,
    pub winner_bps: u64,
    pub dividend_bps: u64,
    pub next_round_bps: u64,
    pub protocol_fee_bps: u64,
    pub referral_bonus_bps: u64,
    pub protocol_wallet: [u8; 32],
    pub bump: u8,
}

/// Parsed PlayerState (107 bytes after 8-byte discriminator)
#[derive(Debug)]
pub struct PlayerStateData {
    pub player: [u8; 32],
    pub keys: u64,
    pub current_round: u64,
    pub claimed_dividends_lamports: u64,
    pub referrer: Option<[u8; 32]>,
    pub referral_earnings_lamports: u64,
    pub claimed_referral_earnings_lamports: u64,
    pub is_agent: bool,
    pub bump: u8,
}

fn read_u64(data: &[u8], offset: &mut usize) -> u64 {
    let val = u64::from_le_bytes(data[*offset..*offset + 8].try_into().unwrap());
    *offset += 8;
    val
}

fn read_i64(data: &[u8], offset: &mut usize) -> i64 {
    let val = i64::from_le_bytes(data[*offset..*offset + 8].try_into().unwrap());
    *offset += 8;
    val
}

fn read_u128(data: &[u8], offset: &mut usize) -> u128 {
    let val = u128::from_le_bytes(data[*offset..*offset + 16].try_into().unwrap());
    *offset += 16;
    val
}

fn read_u32(data: &[u8], offset: &mut usize) -> u32 {
    let val = u32::from_le_bytes(data[*offset..*offset + 4].try_into().unwrap());
    *offset += 4;
    val
}

fn read_bool(data: &[u8], offset: &mut usize) -> bool {
    let val = data[*offset] != 0;
    *offset += 1;
    val
}

fn read_u8(data: &[u8], offset: &mut usize) -> u8 {
    let val = data[*offset];
    *offset += 1;
    val
}

fn read_pubkey(data: &[u8], offset: &mut usize) -> [u8; 32] {
    let mut pk = [0u8; 32];
    pk.copy_from_slice(&data[*offset..*offset + 32]);
    *offset += 32;
    pk
}

fn read_option_pubkey(data: &[u8], offset: &mut usize) -> Option<[u8; 32]> {
    let tag = read_u8(data, offset);
    if tag == 0 {
        // Borsh Option is variable-length: None = 1 byte tag only (no padding)
        None
    } else {
        Some(read_pubkey(data, offset))
    }
}

impl GlobalConfigData {
    pub fn from_account_data(data: &[u8]) -> Self {
        let mut o = 8; // skip discriminator
        Self {
            admin: read_pubkey(data, &mut o),
            base_price_lamports: read_u64(data, &mut o),
            price_increment_lamports: read_u64(data, &mut o),
            timer_extension_secs: read_i64(data, &mut o),
            max_timer_secs: read_i64(data, &mut o),
            winner_bps: read_u64(data, &mut o),
            dividend_bps: read_u64(data, &mut o),
            next_round_bps: read_u64(data, &mut o),
            protocol_fee_bps: read_u64(data, &mut o),
            referral_bonus_bps: read_u64(data, &mut o),
            protocol_wallet: read_pubkey(data, &mut o),
            bump: read_u8(data, &mut o),
        }
    }

    pub fn admin_pubkey(&self) -> Pubkey {
        Pubkey::from(self.admin)
    }

    pub fn protocol_wallet_pubkey(&self) -> Pubkey {
        Pubkey::from(self.protocol_wallet)
    }
}

impl GameStateData {
    pub fn from_account_data(data: &[u8]) -> Self {
        let mut o = 8; // skip discriminator
        Self {
            round: read_u64(data, &mut o),
            pot_lamports: read_u64(data, &mut o),
            timer_end: read_i64(data, &mut o),
            last_buyer: read_pubkey(data, &mut o),
            total_keys: read_u64(data, &mut o),
            round_start: read_i64(data, &mut o),
            active: read_bool(data, &mut o),
            winner_claimed: read_bool(data, &mut o),
            total_players: read_u32(data, &mut o),
            total_dividend_pool: read_u64(data, &mut o),
            next_round_pot: read_u64(data, &mut o),
            winner_pot: read_u64(data, &mut o),
            base_price_lamports: read_u64(data, &mut o),
            price_increment_lamports: read_u64(data, &mut o),
            timer_extension_secs: read_i64(data, &mut o),
            max_timer_secs: read_i64(data, &mut o),
            winner_bps: read_u64(data, &mut o),
            dividend_bps: read_u64(data, &mut o),
            next_round_bps: read_u64(data, &mut o),
            protocol_fee_bps: read_u64(data, &mut o),
            referral_bonus_bps: read_u64(data, &mut o),
            protocol_wallet: read_pubkey(data, &mut o),
            bump: read_u8(data, &mut o),
        }
    }

    pub fn last_buyer_pubkey(&self) -> Pubkey {
        Pubkey::from(self.last_buyer)
    }

    pub fn protocol_wallet_pubkey(&self) -> Pubkey {
        Pubkey::from(self.protocol_wallet)
    }
}

impl PlayerStateData {
    pub fn from_account_data(data: &[u8]) -> Self {
        let mut o = 8; // skip discriminator
        Self {
            player: read_pubkey(data, &mut o),
            keys: read_u64(data, &mut o),
            current_round: read_u64(data, &mut o),
            claimed_dividends_lamports: read_u64(data, &mut o),
            referrer: read_option_pubkey(data, &mut o),
            referral_earnings_lamports: read_u64(data, &mut o),
            claimed_referral_earnings_lamports: read_u64(data, &mut o),
            is_agent: read_bool(data, &mut o),
            bump: read_u8(data, &mut o),
        }
    }

    pub fn player_pubkey(&self) -> Pubkey {
        Pubkey::from(self.player)
    }

    pub fn referrer_pubkey(&self) -> Option<Pubkey> {
        self.referrer.map(Pubkey::from)
    }
}

// --- PDA derivation ---

pub fn config_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"config"], &PROGRAM_ID)
}

pub fn game_pda(round: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"game", &round.to_le_bytes()], &PROGRAM_ID)
}

pub fn vault_pda(game_state_key: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"vault", game_state_key.as_ref()], &PROGRAM_ID)
}

pub fn player_pda(player: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"player", player.as_ref()], &PROGRAM_ID)
}

// --- LiteSVM setup ---

pub fn setup_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();

    let so_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("target/deploy/fomolt3d.so");

    let program_bytes = std::fs::read(&so_path).unwrap_or_else(|e| {
        panic!(
            "Failed to read program .so at {:?}: {}. Run `anchor build` first.",
            so_path, e
        )
    });

    let _ = svm.add_program(PROGRAM_ID, &program_bytes);
    svm
}

pub fn airdrop(svm: &mut LiteSVM, pubkey: &Pubkey, lamports: u64) {
    svm.airdrop(pubkey, lamports).unwrap();
}

// --- Account reading ---

pub fn get_config(svm: &LiteSVM) -> GlobalConfigData {
    let (pda, _) = config_pda();
    let account = svm.get_account(&pda).expect("GlobalConfig not found");
    GlobalConfigData::from_account_data(&account.data)
}

pub fn get_game(svm: &LiteSVM, round: u64) -> GameStateData {
    let (pda, _) = game_pda(round);
    let account = svm.get_account(&pda).expect("GameState not found");
    GameStateData::from_account_data(&account.data)
}

pub fn get_player(svm: &LiteSVM, player: &Pubkey) -> PlayerStateData {
    let (pda, _) = player_pda(player);
    let account = svm.get_account(&pda).expect("PlayerState not found");
    PlayerStateData::from_account_data(&account.data)
}

pub fn get_balance(svm: &LiteSVM, pubkey: &Pubkey) -> u64 {
    svm.get_account(pubkey).map(|a| a.lamports).unwrap_or(0)
}

pub fn get_vault_balance(svm: &LiteSVM, round: u64) -> u64 {
    let (game_key, _) = game_pda(round);
    let (vault_key, _) = vault_pda(&game_key);
    get_balance(svm, &vault_key)
}

// --- Clock manipulation ---

pub fn get_clock(svm: &LiteSVM) -> Clock {
    svm.get_sysvar::<Clock>()
}

pub fn set_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar::<Clock>(&clock);
}

pub fn advance_clock(svm: &mut LiteSVM, seconds: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp += seconds;
    svm.set_sysvar::<Clock>(&clock);
}

// --- Borsh serialization helpers (using raw bytes to avoid version conflicts) ---

fn write_u64(buf: &mut Vec<u8>, val: u64) {
    buf.extend_from_slice(&val.to_le_bytes());
}

fn write_i64(buf: &mut Vec<u8>, val: i64) {
    buf.extend_from_slice(&val.to_le_bytes());
}

fn write_bool(buf: &mut Vec<u8>, val: bool) {
    buf.push(if val { 1 } else { 0 });
}

fn write_pubkey(buf: &mut Vec<u8>, pk: &Pubkey) {
    buf.extend_from_slice(pk.as_ref());
}

// --- ConfigParams data ---

pub struct ConfigParamsData {
    pub base_price_lamports: u64,
    pub price_increment_lamports: u64,
    pub timer_extension_secs: i64,
    pub max_timer_secs: i64,
    pub winner_bps: u64,
    pub dividend_bps: u64,
    pub next_round_bps: u64,
    pub protocol_fee_bps: u64,
    pub referral_bonus_bps: u64,
    pub protocol_wallet: Pubkey,
}

impl Default for ConfigParamsData {
    fn default() -> Self {
        Self {
            base_price_lamports: 10_000_000,
            price_increment_lamports: 1_000_000,
            timer_extension_secs: 30,
            max_timer_secs: 86_400,
            winner_bps: 4800,
            dividend_bps: 4500,
            next_round_bps: 700,
            protocol_fee_bps: 200,
            referral_bonus_bps: 1000,
            protocol_wallet: Pubkey::new_unique(),
        }
    }
}

impl ConfigParamsData {
    fn serialize(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        write_u64(&mut buf, self.base_price_lamports);
        write_u64(&mut buf, self.price_increment_lamports);
        write_i64(&mut buf, self.timer_extension_secs);
        write_i64(&mut buf, self.max_timer_secs);
        write_u64(&mut buf, self.winner_bps);
        write_u64(&mut buf, self.dividend_bps);
        write_u64(&mut buf, self.next_round_bps);
        write_u64(&mut buf, self.protocol_fee_bps);
        write_u64(&mut buf, self.referral_bonus_bps);
        write_pubkey(&mut buf, &self.protocol_wallet);
        buf
    }
}

// --- Instruction builders ---

pub fn create_or_update_config_ix(admin: &Pubkey, params: &ConfigParamsData) -> Instruction {
    let (config_key, _) = config_pda();

    let mut data = anchor_discriminator("create_or_update_config").to_vec();
    data.extend_from_slice(&params.serialize());

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*admin, true),
            AccountMeta::new(config_key, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data,
    }
}

pub fn initialize_first_round_ix(admin: &Pubkey) -> Instruction {
    let (config_key, _) = config_pda();
    let (game_key, _) = game_pda(1);
    let (vault_key, _) = vault_pda(&game_key);

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*admin, true),
            AccountMeta::new_readonly(config_key, false),
            AccountMeta::new(game_key, false),
            AccountMeta::new(vault_key, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: anchor_discriminator("initialize_first_round").to_vec(),
    }
}

pub fn start_new_round_ix(payer: &Pubkey, prev_round: u64) -> Instruction {
    let (config_key, _) = config_pda();
    let (prev_game_key, _) = game_pda(prev_round);
    let new_round = prev_round + 1;
    let (new_game_key, _) = game_pda(new_round);
    let (prev_vault_key, _) = vault_pda(&prev_game_key);
    let (new_vault_key, _) = vault_pda(&new_game_key);

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new_readonly(config_key, false),
            AccountMeta::new(prev_game_key, false),
            AccountMeta::new(new_game_key, false),
            AccountMeta::new(prev_vault_key, false),
            AccountMeta::new(new_vault_key, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: anchor_discriminator("start_new_round").to_vec(),
    }
}


pub fn buy_keys_ix(
    buyer: &Pubkey,
    round: u64,
    keys_to_buy: u64,
    is_agent: bool,
    protocol_wallet: &Pubkey,
    referrer: Option<&Pubkey>,
) -> Instruction {
    let (game_key, _) = game_pda(round);
    let (player_state_key, _) = player_pda(buyer);
    let (vault_key, _) = vault_pda(&game_key);

    let mut data = anchor_discriminator("buy_keys").to_vec();
    write_u64(&mut data, keys_to_buy);
    write_bool(&mut data, is_agent);

    let mut accounts = vec![
        AccountMeta::new(*buyer, true),
        AccountMeta::new(game_key, false),
        AccountMeta::new(player_state_key, false),
        AccountMeta::new(vault_key, false),
        AccountMeta::new(*protocol_wallet, false),
    ];

    if let Some(referrer_key) = referrer {
        let (referrer_pda, _) = player_pda(referrer_key);
        accounts.push(AccountMeta::new(referrer_pda, false));
    } else {
        // Anchor Option<Account> sentinel: program ID = None
        accounts.push(AccountMeta::new_readonly(PROGRAM_ID, false));
    }

    accounts.push(AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false));

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn claim_ix(player: &Pubkey, round: u64) -> Instruction {
    let (game_key, _) = game_pda(round);
    let (player_state_key, _) = player_pda(player);
    let (vault_key, _) = vault_pda(&game_key);

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*player, true),
            AccountMeta::new(game_key, false),
            AccountMeta::new(player_state_key, false),
            AccountMeta::new(vault_key, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: anchor_discriminator("claim").to_vec(),
    }
}

pub fn claim_referral_earnings_ix(player: &Pubkey, round: u64) -> Instruction {
    let (game_key, _) = game_pda(round);
    let (player_state_key, _) = player_pda(player);
    let (vault_key, _) = vault_pda(&game_key);

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*player, true),
            AccountMeta::new(game_key, false),
            AccountMeta::new(player_state_key, false),
            AccountMeta::new(vault_key, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: anchor_discriminator("claim_referral_earnings").to_vec(),
    }
}

// --- Transaction sending helpers ---

pub fn send_tx(
    svm: &mut LiteSVM,
    instructions: &[Instruction],
    payer: &Keypair,
    signers: &[&Keypair],
) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(instructions, Some(&payer.pubkey()), signers, blockhash);
    match svm.send_transaction(tx) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("{:?}", e)),
    }
}

pub fn send_tx_expect_err(
    svm: &mut LiteSVM,
    instructions: &[Instruction],
    payer: &Keypair,
    signers: &[&Keypair],
) -> String {
    let blockhash = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(instructions, Some(&payer.pubkey()), signers, blockhash);
    match svm.send_transaction(tx) {
        Ok(_) => panic!("Expected transaction to fail, but it succeeded"),
        Err(e) => format!("{:?}", e),
    }
}

// --- High-level convenience helpers ---

/// Set up a fresh SVM with config created and round 1 initialized.
/// Returns (svm, admin_keypair, protocol_wallet_pubkey).
pub fn setup_game() -> (LiteSVM, Keypair, Pubkey) {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    let protocol_wallet = Pubkey::new_unique();
    airdrop(&mut svm, &admin.pubkey(), 100_000_000_000);

    let params = ConfigParamsData {
        protocol_wallet,
        ..Default::default()
    };

    // Create config
    let ix = create_or_update_config_ix(&admin.pubkey(), &params);
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    // Initialize first round
    let ix = initialize_first_round_ix(&admin.pubkey());
    send_tx(&mut svm, &[ix], &admin, &[&admin]).unwrap();

    (svm, admin, protocol_wallet)
}

/// Fund a player with SOL. PlayerState is created on first buy_keys call.
/// The round, is_agent, and referrer params are kept for backward compat but ignored —
/// registration now happens inside buy_keys (pass 0 keys for registration-only).
pub fn register(
    svm: &mut LiteSVM,
    player: &Keypair,
    _round: u64,
    _is_agent: bool,
    _referrer: Option<&Pubkey>,
) {
    airdrop(svm, &player.pubkey(), 100_000_000_000);
}

/// Buy keys for a registered player.
pub fn buy(
    svm: &mut LiteSVM,
    buyer: &Keypair,
    round: u64,
    keys: u64,
    protocol_wallet: &Pubkey,
    referrer: Option<&Pubkey>,
) {
    let ix = buy_keys_ix(
        &buyer.pubkey(),
        round,
        keys,
        false,
        protocol_wallet,
        referrer,
    );
    send_tx(svm, &[ix], buyer, &[buyer]).unwrap();
}

/// Pubkey comparison helper (bytes-based)
pub fn pubkey_eq(pk: &[u8; 32], other: &Pubkey) -> bool {
    pk == other.as_ref()
}

pub fn pubkey_is_default(pk: &[u8; 32]) -> bool {
    *pk == [0u8; 32]
}

// ====== Calculation helpers (mirror program math for test assertions) ======

/// Calculate expected cost using bonding curve formula.
/// cost = n * base_price + price_increment * n * (2k + n - 1) / 2
pub fn expected_cost(supply: u64, keys: u64) -> u64 {
    let n = keys as u128;
    let k = supply as u128;
    let base = 10_000_000u128; // DEFAULT_BASE_PRICE_LAMPORTS
    let inc = 1_000_000u128; // DEFAULT_PRICE_INCREMENT_LAMPORTS
    let base_cost = n * base;
    let series = inc * n * (2 * k + n - 1) / 2;
    (base_cost + series) as u64
}

/// Protocol fee = cost * 200 / 10_000 (2%)
pub fn expected_protocol_fee(cost: u64) -> u64 {
    ((cost as u128) * 200 / 10_000) as u64
}

/// After fee = cost - protocol_fee
pub fn expected_after_fee(cost: u64) -> u64 {
    cost - expected_protocol_fee(cost)
}

/// Referral bonus = after_fee * 1000 / 10_000 (10% of after-fee)
pub fn expected_referral_bonus(after_fee: u64) -> u64 {
    ((after_fee as u128) * 1000 / 10_000) as u64
}

/// Pot contribution = after_fee - referral (if has_referrer), else after_fee
pub fn expected_pot_contribution(after_fee: u64, has_referrer: bool) -> u64 {
    if has_referrer {
        after_fee - expected_referral_bonus(after_fee)
    } else {
        after_fee
    }
}

/// Winner amount = pot_contribution * 4800 / 10_000
pub fn expected_winner_amount(pot_contribution: u64) -> u64 {
    ((pot_contribution as u128) * 4800 / 10_000) as u64
}

/// Dividend amount = pot_contribution * 4500 / 10_000
pub fn expected_dividend_amount(pot_contribution: u64) -> u64 {
    ((pot_contribution as u128) * 4500 / 10_000) as u64
}

/// Next round amount = pot_contribution * 700 / 10_000
pub fn expected_next_round_amount(pot_contribution: u64) -> u64 {
    ((pot_contribution as u128) * 700 / 10_000) as u64
}

/// Expire the round timer and return the game state.
pub fn expire_round(svm: &mut LiteSVM, round: u64) -> GameStateData {
    let game = get_game(svm, round);
    set_clock(svm, game.timer_end + 1);
    get_game(svm, round)
}

/// Complete a round: have winner claim, start new round, return new round number.
/// Assumes the round timer is already expired and buys are done.
pub fn complete_round_and_start_next(
    svm: &mut LiteSVM,
    admin: &Keypair,
    round: u64,
    winner: &Keypair,
) -> u64 {
    // Winner claims
    let ix = claim_ix(&winner.pubkey(), round);
    send_tx(svm, &[ix], winner, &[winner]).unwrap();

    svm.expire_blockhash();

    // Start new round
    airdrop(svm, &admin.pubkey(), 10_000_000_000);
    let ix = start_new_round_ix(&admin.pubkey(), round);
    send_tx(svm, &[ix], admin, &[admin]).unwrap();

    round + 1
}

/// Calculate the dividend share for a player given keys, pool, total_keys.
/// Mirrors the program's calculate_dividend_share.
pub fn expected_dividend_share(player_keys: u64, total_dividend_pool: u64, total_keys: u64) -> u64 {
    if total_keys == 0 || player_keys == 0 {
        return 0;
    }
    ((player_keys as u128) * (total_dividend_pool as u128) / (total_keys as u128)) as u64
}
