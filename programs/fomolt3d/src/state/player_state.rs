use anchor_lang::prelude::*;

#[account]
pub struct PlayerState {
    /// Player's wallet address
    pub player: Pubkey,
    /// Keys held in this round
    pub keys: u64,
    /// Current round this player is participating in
    pub current_round: u64,
    /// Total dividends already withdrawn (lamports)
    pub claimed_dividends_lamports: u64,
    /// Who referred this player (set once, immutable after)
    pub referrer: Option<Pubkey>,
    /// Accumulated earnings from being someone's referrer (not yet claimed)
    pub referral_earnings_lamports: u64,
    /// Total referral earnings already claimed
    pub claimed_referral_earnings_lamports: u64,
    /// Whether this player is an AI agent (vs human)
    pub is_agent: bool,
    /// PDA bump seed
    pub bump: u8,
}

impl PlayerState {
    // 32 + 8 + 8 + 8 + (1+32) + 8 + 8 + 1 + 1 = 107
    pub const SPACE: usize = 32 + 8 + 8 + 8 + (1 + 32) + 8 + 8 + 1 + 1;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn player_state_space() {
        assert_eq!(PlayerState::SPACE, 107);
    }
}
