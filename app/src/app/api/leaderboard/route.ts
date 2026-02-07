import { NextResponse } from "next/server";
import {
  getReadOnlyProgram,
  estimateDividend,
} from "@/lib/sdk";
import {
  getCachedGameRound,
  getCachedLeaderboardPlayers,
} from "@/lib/rpc-cache";
import type { LeaderboardResponse } from "@/types/api";
import type { LeaderboardEntry, ReferralEntry } from "@/types/game";

export async function GET() {
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    if (!result) {
      const empty: LeaderboardResponse = {
        keyHolders: [],
        dividendEarners: [],
        topReferrers: [],
      };
      return NextResponse.json(empty);
    }

    const { round, gameState } = result;
    const players = await getCachedLeaderboardPlayers(program, round);

    // Build key holders leaderboard
    const keyHolders: LeaderboardEntry[] = players
      .filter((p) => p.keys > 0)
      .sort((a, b) => b.keys - a.keys)
      .slice(0, 50)
      .map((p, i) => ({
        rank: i + 1,
        player: p.player.toBase58(),
        keys: p.keys,
        totalDividends: estimateDividend(gameState, p.keys),
        isAgent: p.isAgent,
      }));

    // Build dividend earners leaderboard (sorted by estimated dividends)
    const dividendEarners: LeaderboardEntry[] = players
      .filter((p) => p.keys > 0)
      .sort(
        (a, b) =>
          estimateDividend(gameState, b.keys) -
          estimateDividend(gameState, a.keys)
      )
      .slice(0, 50)
      .map((p, i) => ({
        rank: i + 1,
        player: p.player.toBase58(),
        keys: p.keys,
        totalDividends: estimateDividend(gameState, p.keys),
        isAgent: p.isAgent,
      }));

    // Build top referrers: group by the `referrer` field on referred players,
    // count distinct referrals, and look up earnings from referrer's own PlayerState.
    const referralCounts = new Map<string, number>();
    const referrerEarnings = new Map<string, number>();

    // Count how many players each referrer has referred (from referrer field)
    for (const p of players) {
      if (p.referrer) {
        const refKey = p.referrer.toBase58();
        referralCounts.set(refKey, (referralCounts.get(refKey) ?? 0) + 1);
      }
    }

    // Get earnings for players who are referrers (from their own PlayerState)
    for (const p of players) {
      if (p.referralEarningsLamports > 0) {
        referrerEarnings.set(p.player.toBase58(), p.referralEarningsLamports);
      }
    }

    // Merge all unique referrer addresses
    const allReferrers = new Set([
      ...referralCounts.keys(),
      ...referrerEarnings.keys(),
    ]);

    const topReferrers: ReferralEntry[] = [...allReferrers]
      .map((ref) => ({
        referrer: ref,
        referrals: referralCounts.get(ref) ?? 0,
        totalEarnings: referrerEarnings.get(ref) ?? 0,
      }))
      .filter((r) => r.totalEarnings > 0 || r.referrals > 0)
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 20);

    const response: LeaderboardResponse = {
      keyHolders,
      dividendEarners,
      topReferrers,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard from chain" },
      { status: 500 }
    );
  }
}
