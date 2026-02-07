use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::FomoltError;
use crate::events::{RoundConcluded, RoundStarted};
use crate::state::*;

#[derive(Accounts)]
pub struct StartNewRound<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    /// Previous round's game state
    #[account(
        mut,
        seeds = [b"game", prev_game_state.round.to_le_bytes().as_ref()],
        bump = prev_game_state.bump,
    )]
    pub prev_game_state: Account<'info, GameState>,

    /// New round's game state PDA
    #[account(
        init,
        payer = payer,
        space = 8 + GameState::SPACE,
        seeds = [b"game", (prev_game_state.round + 1).to_le_bytes().as_ref()],
        bump,
    )]
    pub new_game_state: Account<'info, GameState>,

    /// Previous round's vault
    #[account(
        mut,
        seeds = [b"vault", prev_game_state.key().as_ref()],
        bump,
    )]
    pub prev_vault: SystemAccount<'info>,

    /// New round's vault
    /// CHECK: New vault PDA, validated by seeds
    #[account(
        mut,
        seeds = [b"vault", new_game_state.key().as_ref()],
        bump,
    )]
    pub new_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_start_new_round(ctx: Context<StartNewRound>) -> Result<()> {
    let prev_game_key = ctx.accounts.prev_game_state.key();
    let prev_vault_bump = ctx.bumps.prev_vault;
    let prev_game = &mut ctx.accounts.prev_game_state;
    let config = &ctx.accounts.config;
    let new_game = &mut ctx.accounts.new_game_state;
    let clock = Clock::get()?;

    // --- Validate round can overflow (seed already computed with +1 above) ---
    require!(prev_game.round < u64::MAX, FomoltError::Overflow);

    // --- Auto-end check: if timer expired, conclude the round ---
    if clock.unix_timestamp >= prev_game.timer_end && prev_game.active {
        prev_game.active = false;
        emit!(RoundConcluded {
            round: prev_game.round,
            winner: if prev_game.total_keys == 0 { Pubkey::default() } else { prev_game.last_buyer },
            winner_lamports: if prev_game.total_keys == 0 { 0 } else { prev_game.winner_pot },
            pot_lamports: prev_game.pot_lamports,
            total_keys: prev_game.total_keys,
            total_players: prev_game.total_players,
            next_round_pot: prev_game.next_round_pot,
            round_start: prev_game.round_start,
            round_end: prev_game.timer_end,
            timestamp: clock.unix_timestamp,
        });
    }

    // Previous round must be inactive
    require!(!prev_game.active, FomoltError::GameStillActive);

    // Mark empty rounds as concluded (no winner to claim)
    if prev_game.total_keys == 0 {
        prev_game.winner_claimed = true;
    }

    // For empty rounds (no buys), forward the entire prev vault balance
    // to prevent carry-over lamports from being permanently trapped.
    // For normal rounds, forward only next_round_pot (other vault funds
    // belong to players who haven't claimed yet).
    let carry_over = if prev_game.total_keys == 0 {
        ctx.accounts.prev_vault.lamports()
    } else {
        prev_game.next_round_pot
    };

    // --- Vault balance check before carry-over transfer ---
    if carry_over > 0 {
        require!(
            ctx.accounts.prev_vault.lamports() >= carry_over,
            FomoltError::InsufficientFunds
        );

        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", prev_game_key.as_ref(), &[prev_vault_bump]]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.prev_vault.to_account_info(),
                    to: ctx.accounts.new_vault.to_account_info(),
                },
                signer_seeds,
            ),
            carry_over,
        )?;
    }

    let new_round = prev_game
        .round
        .checked_add(1)
        .ok_or(FomoltError::Overflow)?;

    new_game.round = new_round;
    new_game.pot_lamports = carry_over;
    new_game.timer_end = clock
        .unix_timestamp
        .checked_add(config.max_timer_secs)
        .ok_or(FomoltError::Overflow)?;
    new_game.last_buyer = Pubkey::default();
    new_game.total_keys = 0;
    new_game.round_start = clock.unix_timestamp;
    new_game.active = true;
    new_game.winner_claimed = false;
    new_game.total_players = 0;
    new_game.total_dividend_pool = 0;
    new_game.next_round_pot = 0;
    // Seed winner_pot with carry-over so it's in a claimable bucket.
    // The first buyer wins these funds if the round has activity;
    // if the round is empty, the full vault forwards to the next round.
    new_game.winner_pot = carry_over;

    // Snapshot config parameters
    new_game.base_price_lamports = config.base_price_lamports;
    new_game.price_increment_lamports = config.price_increment_lamports;
    new_game.timer_extension_secs = config.timer_extension_secs;
    new_game.max_timer_secs = config.max_timer_secs;
    new_game.winner_bps = config.winner_bps;
    new_game.dividend_bps = config.dividend_bps;
    new_game.next_round_bps = config.next_round_bps;
    new_game.protocol_fee_bps = config.protocol_fee_bps;
    new_game.referral_bonus_bps = config.referral_bonus_bps;
    new_game.protocol_wallet = config.protocol_wallet;

    new_game.bump = ctx.bumps.new_game_state;

    emit!(RoundStarted {
        round: new_round,
        carry_over_lamports: carry_over,
        timer_end: new_game.timer_end,
        base_price_lamports: new_game.base_price_lamports,
        price_increment_lamports: new_game.price_increment_lamports,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
