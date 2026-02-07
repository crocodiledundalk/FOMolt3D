import { NextResponse } from "next/server";
import { referralCreateSchema } from "@/lib/validations/game";
import {
  checkRateLimit,
  trackReferralCreation,
} from "@/lib/referral-tracking";

/**
 * Referral link generation with rate limiting.
 *
 * Referral tracking is handled entirely on-chain via the referrerState
 * account in buy_keys. This endpoint validates the pubkey, enforces
 * rate limits (10 per address per hour), and returns a formatted referral URL.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = referralCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.message },
      { status: 400 }
    );
  }

  // Rate limit: 10 creations per address per hour
  const { allowed, retryAfterMs } = checkRateLimit(parsed.data.pubkey);
  if (!allowed) {
    const retryAfterSecs = Math.ceil((retryAfterMs ?? 0) / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 referral links per hour." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSecs) },
      }
    );
  }

  // Track the creation event
  trackReferralCreation(parsed.data.pubkey);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const referralUrl = `${baseUrl}?ref=${parsed.data.pubkey}`;
  const actionUrl = `${baseUrl}/api/actions/buy-keys?ref=${parsed.data.pubkey}`;

  return NextResponse.json({
    referralUrl,
    blinkUrl: `https://dial.to/?action=solana-action:${actionUrl}`,
    referrer: parsed.data.pubkey,
  });
}
