use anchor_lang::prelude::*;

use crate::errors::FomoltError;
use crate::events::RoundStarted;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeFirstRound<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ FomoltError::Unauthorized,
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + GameState::SPACE,
        seeds = [b"game", 1u64.to_le_bytes().as_ref()],
        bump,
    )]
    pub game_state: Account<'info, GameState>,

    /// Game vault PDA that holds SOL
    /// CHECK: This is a PDA used only as a SOL vault, validated by seeds
    #[account(
        mut,
        seeds = [b"vault", game_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_first_round(ctx: Context<InitializeFirstRound>) -> Result<()> {
    let config = &ctx.accounts.config;
    let game = &mut ctx.accounts.game_state;
    let clock = Clock::get()?;

    game.round = 1;
    game.pot_lamports = 0;
    game.timer_end = clock
        .unix_timestamp
        .checked_add(config.max_timer_secs)
        .ok_or(FomoltError::Overflow)?;
    game.last_buyer = Pubkey::default();
    game.total_keys = 0;
    game.round_start = clock.unix_timestamp;
    game.active = true;
    game.winner_claimed = false;
    game.total_players = 0;
    game.total_dividend_pool = 0;
    game.next_round_pot = 0;
    game.winner_pot = 0;

    // Snapshot config parameters
    game.base_price_lamports = config.base_price_lamports;
    game.price_increment_lamports = config.price_increment_lamports;
    game.timer_extension_secs = config.timer_extension_secs;
    game.max_timer_secs = config.max_timer_secs;
    game.winner_bps = config.winner_bps;
    game.dividend_bps = config.dividend_bps;
    game.next_round_bps = config.next_round_bps;
    game.protocol_fee_bps = config.protocol_fee_bps;
    game.referral_bonus_bps = config.referral_bonus_bps;
    game.protocol_wallet = config.protocol_wallet;

    game.bump = ctx.bumps.game_state;

    emit!(RoundStarted {
        round: 1,
        carry_over_lamports: 0,
        timer_end: game.timer_end,
        base_price_lamports: game.base_price_lamports,
        price_increment_lamports: game.price_increment_lamports,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
