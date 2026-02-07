use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::FomoltError;
use crate::events::{GameUpdated, KeysPurchased, ProtocolFeeCollected, ReferralEarned, RoundConcluded};
use crate::math;
use crate::state::*;

#[derive(Accounts)]
pub struct BuyKeys<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", game_state.round.to_le_bytes().as_ref()],
        bump = game_state.bump,
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + PlayerState::SPACE,
        seeds = [b"player", buyer.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    /// Game vault PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault", game_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Protocol fee recipient wallet
    /// CHECK: Validated against game_state.protocol_wallet
    #[account(
        mut,
        constraint = protocol_wallet.key() == game_state.protocol_wallet @ FomoltError::InvalidConfig,
    )]
    pub protocol_wallet: UncheckedAccount<'info>,

    /// Optional referrer's PlayerState — must be writable for referral credit.
    /// CHECK: Validated manually in handler (PDA derivation + referrer match)
    #[account(mut)]
    pub referrer_state: Option<Account<'info, PlayerState>>,

    pub system_program: Program<'info, System>,
}

pub fn handle_buy_keys(ctx: Context<BuyKeys>, keys_to_buy: u64, is_agent: bool) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let player = &mut ctx.accounts.player_state;
    let clock = Clock::get()?;

    // --- Auto-end check: if timer expired, end the round and return Ok (no-op) ---
    if clock.unix_timestamp >= game.timer_end {
        if game.active {
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
        return Ok(());
    }
    require!(game.active, FomoltError::GameNotActive);

    // --- Handle player registration / round entry ---
    let is_new_player = player.player == Pubkey::default();

    if is_new_player {
        // First-time player initialization
        player.player = ctx.accounts.buyer.key();
        player.bump = ctx.bumps.player_state;
        player.claimed_dividends_lamports = 0;
        player.claimed_referral_earnings_lamports = 0;
        player.referral_earnings_lamports = 0;
        player.keys = 0;
        player.current_round = game.round;

        // Set referrer if provided
        if let Some(referrer_state) = &ctx.accounts.referrer_state {
            require!(
                referrer_state.player != ctx.accounts.buyer.key(),
                FomoltError::CannotReferSelf
            );

            let (expected_pda, _) = Pubkey::find_program_address(
                &[b"player", referrer_state.player.as_ref()],
                ctx.program_id,
            );
            require!(
                referrer_state.key() == expected_pda,
                FomoltError::ReferrerNotRegistered
            );

            player.referrer = Some(referrer_state.player);
        } else {
            player.referrer = None;
        }

        game.total_players = game
            .total_players
            .checked_add(1)
            .ok_or(FomoltError::Overflow)?;
    } else if player.current_round == 0 {
        // Returning player (claimed from previous round)
        require!(
            player.player == ctx.accounts.buyer.key(),
            FomoltError::Unauthorized
        );
        player.keys = 0;
        player.current_round = game.round;
        // Existing referrer preserved

        game.total_players = game
            .total_players
            .checked_add(1)
            .ok_or(FomoltError::Overflow)?;
    } else if player.current_round == game.round {
        // Already in this round — continue buying
        require!(
            player.player == ctx.accounts.buyer.key(),
            FomoltError::Unauthorized
        );
    } else {
        // In a different round — must claim first
        return err!(FomoltError::MustClaimPreviousRound);
    }

    // Update is_agent flag
    player.is_agent = is_agent;

    // --- 0-key buy = registration only, skip core buy logic ---
    if keys_to_buy == 0 {
        return Ok(());
    }

    // --- Calculate cost using game state config snapshot ---
    let cost = math::calculate_cost(
        game.total_keys,
        keys_to_buy,
        game.base_price_lamports,
        game.price_increment_lamports,
    )?;

    // === Fee Ordering: house fee → referral → pot splits ===

    // Step 1: House fee off the top
    let house_fee = math::calculate_bps_split(cost, game.protocol_fee_bps)?;
    let after_fee = cost
        .checked_sub(house_fee)
        .ok_or(FomoltError::Overflow)?;

    // Step 2: Referral from remainder (if applicable)
    let mut referral_bonus_paid = 0u64;
    let mut pot_contribution = after_fee;

    // If the player has a referrer, the referrer_state account MUST be provided
    if player.referrer.is_some() {
        require!(
            ctx.accounts.referrer_state.is_some(),
            FomoltError::ReferrerMismatch
        );
    }

    if let Some(referrer_state) = &mut ctx.accounts.referrer_state {
        if let Some(existing_referrer) = player.referrer {
            require!(
                referrer_state.player == existing_referrer,
                FomoltError::ReferrerMismatch
            );

            // Verify PDA derivation
            let (expected_pda, _) = Pubkey::find_program_address(
                &[b"player", referrer_state.player.as_ref()],
                ctx.program_id,
            );
            require!(
                referrer_state.key() == expected_pda,
                FomoltError::ReferrerNotRegistered
            );

            // Calculate referral: 10% of after-fee amount
            let referral_bonus =
                math::calculate_bps_split(after_fee, game.referral_bonus_bps)?;

            if referral_bonus > 0 {
                // Credit referrer's pending earnings (round-agnostic — no round check)
                referrer_state.referral_earnings_lamports = referrer_state
                    .referral_earnings_lamports
                    .checked_add(referral_bonus)
                    .ok_or(FomoltError::Overflow)?;
                referral_bonus_paid = referral_bonus;
                pot_contribution = after_fee
                    .checked_sub(referral_bonus)
                    .ok_or(FomoltError::Overflow)?;
            }
        }
    }

    // --- Transfer SOL: house fee from buyer to protocol wallet ---
    if house_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.protocol_wallet.to_account_info(),
                },
            ),
            house_fee,
        )?;

        emit!(ProtocolFeeCollected {
            round: game.round,
            lamports: house_fee,
            recipient: ctx.accounts.protocol_wallet.key(),
            timestamp: clock.unix_timestamp,
        });
    }

    // --- Transfer SOL: after_fee from buyer to vault (includes referral portion) ---
    if after_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            after_fee,
        )?;
    }

    // Step 3: Pot splits from pot_contribution
    let winner_amount = math::calculate_bps_split(pot_contribution, game.winner_bps)?;
    let dividend_amount = math::calculate_bps_split(pot_contribution, game.dividend_bps)?;
    let next_round_amount = math::calculate_bps_split(pot_contribution, game.next_round_bps)?;

    // --- Update game state ---
    game.winner_pot = game
        .winner_pot
        .checked_add(winner_amount)
        .ok_or(FomoltError::Overflow)?;
    game.total_dividend_pool = game
        .total_dividend_pool
        .checked_add(dividend_amount)
        .ok_or(FomoltError::Overflow)?;
    game.next_round_pot = game
        .next_round_pot
        .checked_add(next_round_amount)
        .ok_or(FomoltError::Overflow)?;

    // --- Add keys to player and game ---
    player.keys = player
        .keys
        .checked_add(keys_to_buy)
        .ok_or(FomoltError::Overflow)?;
    game.total_keys = game
        .total_keys
        .checked_add(keys_to_buy)
        .ok_or(FomoltError::Overflow)?;
    game.pot_lamports = game
        .pot_lamports
        .checked_add(cost)
        .ok_or(FomoltError::Overflow)?;
    game.last_buyer = ctx.accounts.buyer.key();

    // --- Extend timer (can only increase, never decrease) ---
    game.timer_end = math::calculate_timer_extension(
        clock.unix_timestamp,
        game.timer_extension_secs,
        game.timer_end,
        game.round_start,
        game.max_timer_secs,
    )?;

    // --- Emit events ---
    emit!(KeysPurchased {
        round: game.round,
        player: ctx.accounts.buyer.key(),
        is_agent: player.is_agent,
        keys_bought: keys_to_buy,
        total_player_keys: player.keys,
        lamports_spent: cost,
        pot_contribution,
        timestamp: clock.unix_timestamp,
    });

    if referral_bonus_paid > 0 {
        if let Some(referrer) = player.referrer {
            emit!(ReferralEarned {
                round: game.round,
                player: ctx.accounts.buyer.key(),
                referrer,
                keys_bought: keys_to_buy,
                lamports_spent: cost,
                referrer_lamports: referral_bonus_paid,
                timestamp: clock.unix_timestamp,
            });
        }
    }

    // Calculate next key price for the event
    let next_key_price = math::calculate_cost(
        game.total_keys,
        1,
        game.base_price_lamports,
        game.price_increment_lamports,
    )
    .unwrap_or(u64::MAX);

    emit!(GameUpdated {
        round: game.round,
        pot_lamports: game.pot_lamports,
        total_keys: game.total_keys,
        next_key_price,
        last_buyer: game.last_buyer,
        timer_end: game.timer_end,
        winner_pot: game.winner_pot,
        next_round_pot: game.next_round_pot,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
