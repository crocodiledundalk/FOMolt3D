use anchor_lang::prelude::*;

/// Emitted on every key purchase
#[event]
pub struct KeysPurchased {
    pub round: u64,
    pub player: Pubkey,
    pub is_agent: bool,
    pub keys_bought: u64,
    pub total_player_keys: u64,
    pub lamports_spent: u64,
    pub pot_contribution: u64,
    pub timestamp: i64,
}

/// Emitted when a referral bonus is earned
#[event]
pub struct ReferralEarned {
    pub round: u64,
    pub player: Pubkey,
    pub referrer: Pubkey,
    pub keys_bought: u64,
    pub lamports_spent: u64,
    pub referrer_lamports: u64,
    pub timestamp: i64,
}

/// Emitted after every key purchase with high-level game state
#[event]
pub struct GameUpdated {
    pub round: u64,
    pub pot_lamports: u64,
    pub total_keys: u64,
    pub next_key_price: u64,
    pub last_buyer: Pubkey,
    pub timer_end: i64,
    pub winner_pot: u64,
    pub next_round_pot: u64,
    pub timestamp: i64,
}

/// Emitted when a player claims dividends and/or winner prize
#[event]
pub struct Claimed {
    pub round: u64,
    pub player: Pubkey,
    pub dividend_lamports: u64,
    pub winner_lamports: u64,
    pub total_lamports: u64,
    pub timestamp: i64,
}

/// Emitted when referral earnings are claimed
#[event]
pub struct ReferralClaimed {
    pub round: u64,
    pub player: Pubkey,
    pub lamports: u64,
    pub timestamp: i64,
}

/// Emitted when a new round starts
#[event]
pub struct RoundStarted {
    pub round: u64,
    pub carry_over_lamports: u64,
    pub timer_end: i64,
    pub base_price_lamports: u64,
    pub price_increment_lamports: u64,
    pub timestamp: i64,
}

/// Emitted when protocol fees are collected
#[event]
pub struct ProtocolFeeCollected {
    pub round: u64,
    pub lamports: u64,
    pub recipient: Pubkey,
    pub timestamp: i64,
}

/// Emitted when a round concludes (winner claims or empty round closes)
#[event]
pub struct RoundConcluded {
    pub round: u64,
    pub winner: Pubkey,
    pub winner_lamports: u64,
    pub pot_lamports: u64,
    pub total_keys: u64,
    pub total_players: u32,
    pub next_round_pot: u64,
    pub round_start: i64,
    pub round_end: i64,
    pub timestamp: i64,
}
