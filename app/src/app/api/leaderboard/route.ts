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

export const dynamic = "force-dynamic";

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

    const playersWithDividend = players.map((p) => ({
      player: p,
      dividend: estimateDividend(gameState, p.keys),
    }));

    // Build key holders leaderboard
    const keyHolders: LeaderboardEntry[] = playersWithDividend
      .filter(({ player }) => player.keys > 0)
      .sort((a, b) => b.player.keys - a.player.keys)
      .slice(0, 50)
      .map(({ player, dividend }, i) => ({
        rank: i + 1,
        player: player.player.toBase58(),
        keys: player.keys,
        totalDividends: dividend,
        isAgent: player.isAgent,
      }));

    // Build dividend earners leaderboard (sorted by estimated dividends)
    const dividendEarners: LeaderboardEntry[] = playersWithDividend
      .filter(({ player }) => player.keys > 0)
      .sort((a, b) => b.dividend - a.dividend)
      .slice(0, 50)
      .map(({ player, dividend }, i) => ({
        rank: i + 1,
        player: player.player.toBase58(),
        keys: player.keys,
        totalDividends: dividend,
        isAgent: player.isAgent,
      }));

    // Build top referrers: group by the `referrer` field on referred players,
    // count distinct referrals, and look up earnings from referrer's own PlayerState.
    const referralCounts = new Map<string, number>();
    const referrerEarnings = new Map<string, number>();

    for (const p of players) {
      if (p.referrer) {
        const refKey = p.referrer.toBase58();
        referralCounts.set(refKey, (referralCounts.get(refKey) ?? 0) + 1);
      }
    }

    for (const p of players) {
      if (p.referralEarningsLamports > 0) {
        referrerEarnings.set(p.player.toBase58(), p.referralEarningsLamports);
      }
    }

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

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard from chain" },
      { status: 500 }
    );
  }
}
