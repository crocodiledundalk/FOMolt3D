"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { REFERRALS_ENABLED } from "@/lib/feature-flags";

const STORAGE_KEY = "fomolt3d_referrer";

/** Validates a string looks like a base58 Solana pubkey (32-44 chars, no 0/O/I/l). */
function isValidBase58Pubkey(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

/**
 * Reads ?ref= from the URL and stores it in localStorage.
 * Does not render any visible UI.
 */
export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!REFERRALS_ENABLED) return;

    const ref = searchParams.get("ref");
    if (!ref) return;

    if (!isValidBase58Pubkey(ref)) return;

    try {
      localStorage.setItem(STORAGE_KEY, ref);
    } catch {
      // localStorage not available (SSR, private browsing, etc.)
    }
  }, [searchParams]);

  return null;
}

/** Read the stored referrer from localStorage. Returns null when referrals are disabled. */
export function getStoredReferrer(): string | null {
  if (!REFERRALS_ENABLED) return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
