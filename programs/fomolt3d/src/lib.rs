use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;
#[cfg(test)]
mod test_scenarios;

use instructions::*;

declare_id!("EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw");

#[program]
pub mod fomolt3d {
    use super::*;

    pub fn create_or_update_config(
        ctx: Context<CreateOrUpdateConfig>,
        params: ConfigParams,
    ) -> Result<()> {
        instructions::create_or_update_config::handle_create_or_update_config(ctx, params)
    }

    pub fn initialize_first_round(ctx: Context<InitializeFirstRound>) -> Result<()> {
        instructions::initialize_first_round::handle_initialize_first_round(ctx)
    }

    pub fn start_new_round(ctx: Context<StartNewRound>) -> Result<()> {
        instructions::start_new_round::handle_start_new_round(ctx)
    }

    pub fn buy_keys(ctx: Context<BuyKeys>, keys_to_buy: u64, is_agent: bool) -> Result<()> {
        instructions::buy_keys::handle_buy_keys(ctx, keys_to_buy, is_agent)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handle_claim(ctx)
    }

    pub fn claim_referral_earnings(ctx: Context<ClaimReferralEarnings>) -> Result<()> {
        instructions::claim_referral_earnings::handle_claim_referral_earnings(ctx)
    }
}
