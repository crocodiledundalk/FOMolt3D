/**
 * Feature flags for gating functionality that requires external approval.
 *
 * REFERRALS_ENABLED: Gated until Dialect approves Blink referral flows.
 * Set NEXT_PUBLIC_REFERRALS_ENABLED=true in .env to enable.
 */
export const REFERRALS_ENABLED =
  process.env.NEXT_PUBLIC_REFERRALS_ENABLED === "true";
