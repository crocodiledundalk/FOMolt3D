use anchor_lang::prelude::*;

#[account]
pub struct GameState {
    /// Round number (0-indexed)
    pub round: u64,
    /// Total SOL deposited this round (lamports) — informational, tracks gross spend
    pub pot_lamports: u64,
    /// Unix timestamp when timer expires
    pub timer_end: i64,
    /// Address of most recent key buyer (potential winner)
    pub last_buyer: Pubkey,
    /// Total keys sold this round
    pub total_keys: u64,
    /// Unix timestamp of round start
    pub round_start: i64,
    /// Whether round is active
    pub active: bool,
    /// Whether winner has claimed prize
    pub winner_claimed: bool,
    /// Number of unique players in this round
    pub total_players: u32,
    /// Total lamports allocated to dividends this round (claimed proportionally at round end)
    pub total_dividend_pool: u64,
    /// Accumulated carry for next round (lamports)
    pub next_round_pot: u64,
    /// Accumulated winner share (lamports) — paid out on claim
    pub winner_pot: u64,
    // --- Config snapshot fields (copied from GlobalConfig at round init) ---
    /// Snapshot: base price per key in lamports
    pub base_price_lamports: u64,
    /// Snapshot: price increment per key
    pub price_increment_lamports: u64,
    /// Snapshot: seconds added to timer per buy
    pub timer_extension_secs: i64,
    /// Snapshot: maximum timer duration in seconds
    pub max_timer_secs: i64,
    /// Snapshot: winner share in basis points
    pub winner_bps: u64,
    /// Snapshot: dividend share in basis points
    pub dividend_bps: u64,
    /// Snapshot: next round carry share in basis points
    pub next_round_bps: u64,
    /// Snapshot: protocol fee in basis points
    pub protocol_fee_bps: u64,
    /// Snapshot: referral bonus as BPS of dividend portion
    pub referral_bonus_bps: u64,
    /// Snapshot: wallet that receives protocol fees
    pub protocol_wallet: Pubkey,
    /// PDA bump seed
    pub bump: u8,
}

impl GameState {
    // round(8) + pot(8) + timer_end(8) + last_buyer(32) + total_keys(8) + round_start(8)
    // + active(1) + winner_claimed(1) + total_players(4) + total_dividend_pool(8) + next_round_pot(8) + winner_pot(8)
    // + base_price(8) + price_inc(8) + timer_ext(8) + max_timer(8)
    // + winner_bps(8) + dividend_bps(8) + next_round_bps(8) + protocol_fee_bps(8) + referral_bps(8)
    // + protocol_wallet(32) + bump(1) = 207
    pub const SPACE: usize = 8 + 8 + 8 + 32 + 8 + 8 + 1 + 1 + 4 + 8 + 8 + 8
        + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8
        + 32 + 1;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn game_state_space() {
        assert_eq!(GameState::SPACE, 207);
    }
}
