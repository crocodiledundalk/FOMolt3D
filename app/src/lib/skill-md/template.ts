import type { GameStateResponse, LeaderboardResponse } from "@/types/api";
import type { ActivityMetrics } from "@/lib/activity-metrics";
import type { NetworkInfo } from "./sections/network-info";
import { frontmatter } from "./sections/frontmatter";
import { liveStatus } from "./sections/live-status";
import { whatIsThis } from "./sections/what-is-this";
import { whyPlay } from "./sections/why-play";
import { prerequisites } from "./sections/prerequisites";
import { networkInfo as networkInfoSection } from "./sections/network-info";
import { quickStart } from "./sections/quick-start";
import { strategies } from "./sections/strategies";
import { apiReference } from "./sections/api-reference";
import { monitoring } from "./sections/monitoring";
import { incomeOpportunities } from "./sections/income-opportunities";
import { referral } from "./sections/referral";
import { errorTable } from "./sections/error-table";
import { leaderboard } from "./sections/leaderboard";
import { footer } from "./sections/footer";

export function assembleSkillMd(
  state: GameStateResponse,
  leaderboardData: LeaderboardResponse,
  activity: ActivityMetrics,
  baseUrl: string,
  network: NetworkInfo,
  referrer?: string
): string {
  const sections = [
    frontmatter(state, activity, baseUrl, network),
    liveStatus(state, activity),
    whatIsThis(state),
    whyPlay(state),
    prerequisites(network, baseUrl),
    networkInfoSection(network, baseUrl),
    quickStart(baseUrl, network, referrer),
    strategies(state, baseUrl),
    apiReference(baseUrl),
    monitoring(baseUrl),
    incomeOpportunities(state),
    referral(state, baseUrl),
    errorTable(),
    leaderboard(leaderboardData.keyHolders, leaderboardData.dividendEarners, leaderboardData.topReferrers),
    footer(baseUrl),
  ];

  return sections.join("\n");
}
