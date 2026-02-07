import {
  getReadOnlyProgram,
  getGamePhase,
  getNextKeyPrice,
  estimateDividend,
  toApiGameState,
} from "@/lib/sdk";
import {
  getCachedGameRound,
  getCachedLeaderboardPlayers,
} from "@/lib/rpc-cache";
import { calculateKeyPrice } from "@/lib/utils/bonding-curve";
import { assembleSkillMd } from "@/lib/skill-md/template";
import { trackReferralVisit } from "@/lib/referral-tracking";
import { recordSnapshot } from "@/lib/state-history";
import { getCachedEvents } from "@/lib/event-cache";
import { getActivityMetrics } from "@/lib/activity-metrics";
import { getCluster, getPublicRpcUrl, getProgramId } from "@/lib/network";
import { getBaseUrl } from "@/lib/base-url";
import type { ActivityMetrics } from "@/lib/activity-metrics";
import type { GameStateResponse, LeaderboardResponse } from "@/types/api";
import type { LeaderboardEntry, ReferralEntry } from "@/types/game";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const program = getReadOnlyProgram();
    const result = await getCachedGameRound(program);

    // Extract ?ref= query param for referral embedding
    const url = new URL(request.url);
    const refParam = url.searchParams.get("ref");
    const referrer = refParam && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(refParam) ? refParam : undefined;

    // Track referral visit
    if (referrer) {
      trackReferralVisit(referrer);
    }

    let state: GameStateResponse;
    let leaderboardData: LeaderboardResponse;

    if (!result) {
      // No round exists — return placeholder data
      state = {
        gameState: {
          round: 0,
          potLamports: 0,
          timerEnd: 0,
          lastBuyer: "",
          totalKeys: 0,
          roundStart: 0,
          active: false,
          winnerClaimed: false,
          totalPlayers: 0,
          totalDividendPool: 0,
          nextRoundPot: 0,
          winnerPot: 0,
          basePriceLamports: 10_000_000,
          priceIncrementLamports: 1_000_000,
          timerExtensionSecs: 30,
          maxTimerSecs: 86400,
          winnerBps: 4800,
          dividendBps: 4500,
          nextRoundBps: 700,
          protocolFeeBps: 200,
          referralBonusBps: 1000,
          protocolWallet: "",
        },
        keyPriceLamports: 10_000_000,
        nextKeyPriceLamports: 10_000_000,
        phase: "waiting",
      };
      leaderboardData = { keyHolders: [], dividendEarners: [], topReferrers: [] };
    } else {
      const { round, gameState: gs } = result;
      const gameState = toApiGameState(gs);
      const keyPriceLamports = getNextKeyPrice(gs);
      const nextKeyPriceLamports = calculateKeyPrice(
        gs.totalKeys + 1,
        gs.basePriceLamports,
        gs.priceIncrementLamports
      );
      const phase = getGamePhase(gs);

      state = { gameState, keyPriceLamports, nextKeyPriceLamports, phase };

      // Record state snapshot for price trajectory and pot momentum
      recordSnapshot(gs.totalKeys, gs.potLamports, keyPriceLamports);

      // Build leaderboard for skill.md
      const players = await getCachedLeaderboardPlayers(program, round);

      // Key holders: sorted by keys
      const keyHolders: LeaderboardEntry[] = players
        .filter((p) => p.keys > 0)
        .sort((a, b) => b.keys - a.keys)
        .slice(0, 10)
        .map((p, i) => ({
          rank: i + 1,
          player: p.player.toBase58(),
          keys: p.keys,
          totalDividends: estimateDividend(gs, p.keys),
          isAgent: p.isAgent,
        }));

      // Dividend earners: sorted by estimated dividend (descending)
      const dividendEarners: LeaderboardEntry[] = players
        .filter((p) => p.keys > 0)
        .sort(
          (a, b) =>
            estimateDividend(gs, b.keys) - estimateDividend(gs, a.keys)
        )
        .slice(0, 10)
        .map((p, i) => ({
          rank: i + 1,
          player: p.player.toBase58(),
          keys: p.keys,
          totalDividends: estimateDividend(gs, p.keys),
          isAgent: p.isAgent,
        }));

      // Top referrers: group by referrer field, count distinct referred players
      const referralCounts = new Map<string, number>();
      const referrerEarnings = new Map<string, number>();
      for (const p of players) {
        if (p.referrer) {
          const refKey = p.referrer.toBase58();
          referralCounts.set(refKey, (referralCounts.get(refKey) ?? 0) + 1);
        }
        if (p.referralEarningsLamports > 0) {
          referrerEarnings.set(p.player.toBase58(), p.referralEarningsLamports);
        }
      }
      const allReferrers = new Set([...referralCounts.keys(), ...referrerEarnings.keys()]);
      const topReferrers: ReferralEntry[] = [...allReferrers]
        .map((ref) => ({
          referrer: ref,
          referrals: referralCounts.get(ref) ?? 0,
          totalEarnings: referrerEarnings.get(ref) ?? 0,
        }))
        .filter((r) => r.totalEarnings > 0 || r.referrals > 0)
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 10);

      leaderboardData = { keyHolders, dividendEarners, topReferrers };
    }

    // Compute activity metrics from cached events
    const cachedEvents = getCachedEvents();
    const activity: ActivityMetrics = getActivityMetrics(
      cachedEvents,
      state.gameState.totalPlayers
    );

    const baseUrl = getBaseUrl(request);
    const network = {
      cluster: getCluster(),
      publicRpcUrl: getPublicRpcUrl(),
      programId: getProgramId(),
    };
    const markdown = assembleSkillMd(state, leaderboardData, activity, baseUrl, network, referrer);

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Vary: "Accept, User-Agent",
      },
    });
  } catch (err) {
    console.error("Skill.md error:", err);
    return new Response("# FOMolt3D\n\nFailed to load game state. Please try again.", {
      status: 500,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }
}
