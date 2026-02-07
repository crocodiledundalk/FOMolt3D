use anchor_lang::prelude::*;

#[error_code]
pub enum FomoltError {
    /// Buying keys when round is inactive
    #[msg("Game round is not active")]
    GameNotActive,

    /// Starting new round when current is still active
    #[msg("Game round is still active")]
    GameStillActive,

    /// Buying keys after timer has ended
    #[msg("Timer has expired")]
    TimerExpired,

    /// Claiming winner before timer ends
    #[msg("Timer has not expired yet")]
    TimerNotExpired,

    /// Buyer doesn't have enough SOL
    #[msg("Insufficient funds for purchase")]
    InsufficientFunds,

    /// keys_to_buy == 0
    #[msg("Must buy at least one key")]
    NoKeysToBuy,

    /// Calling claim with zero dividends AND not the winner
    #[msg("Nothing to claim")]
    NothingToClaim,

    /// Non-last-buyer trying to claim winner prize
    #[msg("Only the last buyer can claim the winner prize")]
    NotWinner,

    /// Double-claiming winner prize
    #[msg("Winner prize has already been claimed")]
    WinnerAlreadyClaimed,

    /// Starting new round before winner has claimed
    #[msg("Winner has not claimed prize yet")]
    WinnerNotClaimed,

    /// Referrer == player
    #[msg("Cannot refer yourself")]
    CannotReferSelf,

    /// Passed referrer doesn't match stored referrer on PlayerState
    #[msg("Referrer does not match stored referrer")]
    ReferrerMismatch,

    /// Referrer has no PlayerState in this round
    #[msg("Referrer is not registered in this round")]
    ReferrerNotRegistered,

    /// Claiming referral earnings with zero balance
    #[msg("No referral earnings to claim")]
    NoReferralEarnings,

    /// Non-admin calling admin-only instruction
    #[msg("Unauthorized: admin only")]
    Unauthorized,

    /// BPS values don't sum to 10000, or invalid parameter values
    #[msg("Invalid configuration parameters")]
    InvalidConfig,

    /// Arithmetic overflow in any calculation
    #[msg("Arithmetic overflow")]
    Overflow,

    /// Calling register_player when PlayerState already exists
    #[msg("Player is already registered in this round")]
    PlayerAlreadyRegistered,

    /// Player must claim previous round before joining a new one
    #[msg("Must claim previous round before joining a new one")]
    MustClaimPreviousRound,

    /// Player is not in this round
    #[msg("Player is not in this round")]
    PlayerNotInRound,
}
