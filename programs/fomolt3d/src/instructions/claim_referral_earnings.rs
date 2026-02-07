use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::FomoltError;
use crate::events::{ReferralClaimed, RoundConcluded};
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimReferralEarnings<'info> {
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

pub fn handle_claim_referral_earnings(ctx: Context<ClaimReferralEarnings>) -> Result<()> {
    let game_key = ctx.accounts.game_state.key();
    let player = &mut ctx.accounts.player_state;
    let game = &mut ctx.accounts.game_state;
    let clock_for_auto = Clock::get()?;

    // --- Auto-end check ---
    if clock_for_auto.unix_timestamp >= game.timer_end && game.active {
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
            timestamp: clock_for_auto.unix_timestamp,
        });
    }

    let amount = player.referral_earnings_lamports;
    require!(amount > 0, FomoltError::NoReferralEarnings);

    // --- Vault balance check ---
    require!(
        ctx.accounts.vault.lamports() >= amount,
        FomoltError::InsufficientFunds
    );

    // --- Transfer from vault to player via CPI (vault is system-owned PDA) ---
    let vault_bump = ctx.bumps.vault;
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
        amount,
    )?;

    // --- Update state ---
    player.claimed_referral_earnings_lamports = player
        .claimed_referral_earnings_lamports
        .checked_add(amount)
        .ok_or(FomoltError::Overflow)?;
    player.referral_earnings_lamports = 0;

    let clock = Clock::get()?;
    emit!(ReferralClaimed {
        round: game.round,
        player: ctx.accounts.player.key(),
        lamports: amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
