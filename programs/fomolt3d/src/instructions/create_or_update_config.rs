use anchor_lang::prelude::*;

use crate::errors::FomoltError;
use crate::math;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConfigParams {
    pub base_price_lamports: u64,
    pub price_increment_lamports: u64,
    pub timer_extension_secs: i64,
    pub max_timer_secs: i64,
    pub winner_bps: u64,
    pub dividend_bps: u64,
    pub next_round_bps: u64,
    pub protocol_fee_bps: u64,
    pub referral_bonus_bps: u64,
    pub protocol_wallet: Pubkey,
}

#[derive(Accounts)]
pub struct CreateOrUpdateConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + GlobalConfig::SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handle_create_or_update_config(
    ctx: Context<CreateOrUpdateConfig>,
    params: ConfigParams,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // If config already has an admin set (i.e. update), verify signer matches
    if config.admin != Pubkey::default() {
        require!(
            ctx.accounts.admin.key() == config.admin,
            FomoltError::Unauthorized
        );
    }

    // Validate pot-split BPS values sum to 10000 (protocol_fee_bps is separate)
    math::validate_bps_sum(
        params.winner_bps,
        params.dividend_bps,
        params.next_round_bps,
    )?;

    // Validate positive values
    require!(params.base_price_lamports > 0, FomoltError::InvalidConfig);
    require!(
        params.price_increment_lamports > 0,
        FomoltError::InvalidConfig
    );
    require!(params.timer_extension_secs > 0, FomoltError::InvalidConfig);
    require!(params.max_timer_secs > 0, FomoltError::InvalidConfig);
    require!(params.protocol_fee_bps <= 10_000, FomoltError::InvalidConfig);
    require!(params.referral_bonus_bps <= 10_000, FomoltError::InvalidConfig);
    require!(
        params.protocol_wallet != Pubkey::default(),
        FomoltError::InvalidConfig
    );

    config.admin = ctx.accounts.admin.key();
    config.base_price_lamports = params.base_price_lamports;
    config.price_increment_lamports = params.price_increment_lamports;
    config.timer_extension_secs = params.timer_extension_secs;
    config.max_timer_secs = params.max_timer_secs;
    config.winner_bps = params.winner_bps;
    config.dividend_bps = params.dividend_bps;
    config.next_round_bps = params.next_round_bps;
    config.protocol_fee_bps = params.protocol_fee_bps;
    config.referral_bonus_bps = params.referral_bonus_bps;
    config.protocol_wallet = params.protocol_wallet;
    config.bump = ctx.bumps.config;

    Ok(())
}
