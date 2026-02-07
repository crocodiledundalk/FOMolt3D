/**
 * In-memory referral tracking for MVP.
 * Tracks: referral creation, URL visits, and conversions.
 * Also provides rate limiting for referral creation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix timestamp ms
}

interface ReferralEvent {
  type: "create" | "visit" | "conversion";
  referrer: string;
  timestamp: number;
  visitor?: string; // for visits: IP or agent identifier
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;

// In-memory stores (reset on server restart)
const rateLimits = new Map<string, RateLimitEntry>();
const events: ReferralEvent[] = [];

/**
 * Check if an address has exceeded the rate limit for referral creation.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(address: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const entry = rateLimits.get(address);

  // No existing entry or window expired → allow
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(address, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  // Within window, check count
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  // Increment
  entry.count++;
  return { allowed: true };
}

/** Log a referral creation event. */
export function trackReferralCreation(referrer: string): void {
  events.push({ type: "create", referrer, timestamp: Date.now() });
}

/** Log a referral URL visit (e.g., when skill.md is fetched with ?ref=). */
export function trackReferralVisit(referrer: string, visitor?: string): void {
  events.push({ type: "visit", referrer, timestamp: Date.now(), visitor });
}

/** Log a referral conversion (referred agent's first buy includes referrer). */
export function trackReferralConversion(referrer: string, buyer: string): void {
  events.push({
    type: "conversion",
    referrer,
    timestamp: Date.now(),
    visitor: buyer,
  });
}

/** Get summary stats for a referrer. */
export function getReferralStats(referrer: string): {
  creations: number;
  visits: number;
  conversions: number;
} {
  let creations = 0;
  let visits = 0;
  let conversions = 0;
  for (const e of events) {
    if (e.referrer !== referrer) continue;
    if (e.type === "create") creations++;
    else if (e.type === "visit") visits++;
    else if (e.type === "conversion") conversions++;
  }
  return { creations, visits, conversions };
}
