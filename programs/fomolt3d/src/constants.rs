// --- Default values for GlobalConfig initialization ---

/// Default base price per key in lamports (0.01 SOL)
pub const DEFAULT_BASE_PRICE_LAMPORTS: u64 = 10_000_000;

/// Default price increment per key already sold, in lamports (0.001 SOL)
pub const DEFAULT_PRICE_INCREMENT_LAMPORTS: u64 = 1_000_000;

/// Default seconds added to timer per key purchase
pub const DEFAULT_TIMER_EXTENSION_SECS: i64 = 30;

/// Default maximum timer duration in seconds (24 hours)
pub const DEFAULT_MAX_TIMER_SECS: i64 = 86_400;

/// Default winner share in basis points (48% of pot contribution)
pub const DEFAULT_WINNER_BPS: u64 = 4800;

/// Default dividend share in basis points (45% of pot contribution)
pub const DEFAULT_DIVIDEND_BPS: u64 = 4500;

/// Default next round carry share in basis points (7% of pot contribution)
pub const DEFAULT_NEXT_ROUND_BPS: u64 = 700;

/// Default protocol fee in basis points (2% of gross cost — separate from pot BPS sum)
pub const DEFAULT_PROTOCOL_FEE_BPS: u64 = 200;

/// Default referral bonus in basis points (10% of after-fee amount — separate from pot BPS sum)
pub const DEFAULT_REFERRAL_BONUS_BPS: u64 = 1000;
