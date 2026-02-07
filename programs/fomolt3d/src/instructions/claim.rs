use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::FomoltError;
use crate::events::{Claimed, RoundConcluded};
use crate::math;
use crate::state::*;


#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", game_state.round.to_le_bytes().as_ref()],
        bump = game_state.bump,
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump = player_state.bump,
        has_one = player,
        constraint = player_state.current_round == game_state.round @ FomoltError::PlayerNotInRound,
    )]
    pub player_state: Account<'info, PlayerState>,

    /// Game vault PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault", game_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_claim(ctx: Context<Claim>) -> Result<()> {
    let game_key = ctx.accounts.game_state.key();
    let vault_bump = ctx.bumps.vault;
    let game = &mut ctx.accounts.game_state;
    let player = &mut ctx.accounts.player_state;
    let clock = Clock::get()?;

    // --- Auto-end check ---
    if clock.unix_timestamp >= game.timer_end && game.active {
        game.active = false;
        emit!(RoundConcluded {
            round: game.round,
            winner: game.last_buyer,
            winner_lamports: game.winner_pot,
            pot_lamports: game.pot_lamports,
            total_keys: game.total_keys,
            total_players: game.total_players,
            next_round_pot: game.next_round_pot,
            round_start: game.round_start,
            round_end: game.timer_end,
            timestamp: clock.unix_timestamp,
        });
    }

    // Dividends are only claimable after the round ends
    require!(!game.active, FomoltError::GameStillActive);

    // --- Calculate proportional dividend share ---
    let dividend_share = math::calculate_dividend_share(
        player.keys,
        game.total_dividend_pool,
        game.total_keys,
    )?;

    // --- Check if player is the winner ---
    let is_winner = ctx.accounts.player.key() == game.last_buyer
        && !game.winner_claimed;

    let winner_payout = if is_winner { game.winner_pot } else { 0 };

    let total_payout = dividend_share
        .checked_add(winner_payout)
        .ok_or(FomoltError::Overflow)?;

    require!(total_payout > 0, FomoltError::NothingToClaim);

    // --- Vault balance check ---
    require!(
        ctx.accounts.vault.lamports() >= total_payout,
        FomoltError::InsufficientFunds
    );

    // --- Transfer from vault to player via CPI (vault is system-owned PDA) ---
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault", game_key.as_ref(), &[vault_bump]]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.player.to_account_info(),
            },
            signer_seeds,
        ),
        total_payout,
    )?;

    // --- Update game state ---
    // Note: total_dividend_pool and total_keys stay constant through claims.
    // Double-claim is prevented by resetting player.current_round = 0 below.

    if is_winner {
        game.winner_claimed = true;
    }

    // --- Update player state: reset to prevent double-claim ---
    player.claimed_dividends_lamports = player
        .claimed_dividends_lamports
        .checked_add(dividend_share)
        .ok_or(FomoltError::Overflow)?;
    player.keys = 0;
    player.current_round = 0; // sentinel — prevents re-claim

    emit!(Claimed {
        round: game.round,
        player: ctx.accounts.player.key(),
        dividend_lamports: dividend_share,
        winner_lamports: winner_payout,
        total_lamports: total_payout,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
