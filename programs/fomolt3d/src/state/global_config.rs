use anchor_lang::prelude::*;

#[account]
pub struct GlobalConfig {
    /// Admin authority — only this signer can update config or start round 1
    pub admin: Pubkey,
    /// Base price per key in lamports
    pub base_price_lamports: u64,
    /// Price increment per key already sold
    pub price_increment_lamports: u64,
    /// Seconds added to timer per buy
    pub timer_extension_secs: i64,
    /// Maximum timer duration in seconds
    pub max_timer_secs: i64,
    /// Winner share in basis points
    pub winner_bps: u64,
    /// Dividend share in basis points
    pub dividend_bps: u64,
    /// Next round carry share in basis points
    pub next_round_bps: u64,
    /// Protocol fee in basis points
    pub protocol_fee_bps: u64,
    /// Referral bonus as BPS of after-fee amount
    pub referral_bonus_bps: u64,
    /// Wallet that receives protocol fees
    pub protocol_wallet: Pubkey,
    /// PDA bump seed
    pub bump: u8,
}

impl GlobalConfig {
    // admin(32) + 9 x u64/i64(72) + protocol_wallet(32) + bump(1) = 137
    pub const SPACE: usize = 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 32 + 1;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn global_config_space() {
        assert_eq!(GlobalConfig::SPACE, 137);
    }
}
