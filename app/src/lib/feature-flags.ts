/**
 * Feature flags for gating functionality that requires external approval.
 *
 * REFERRALS_ENABLED: Controls whether dial.to Blink URLs are shown for
 * referral sharing. Referral functionality itself (on-chain, API, UI)
 * is always active — this only gates the Blink link (requires Dialect approval).
 * Set NEXT_PUBLIC_REFERRALS_ENABLED=true in .env to enable.
 */
export const REFERRALS_ENABLED =
  process.env.NEXT_PUBLIC_REFERRALS_ENABLED === "true";
