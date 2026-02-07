import type { GameStateResponse, LeaderboardResponse } from "@/types/api";
import { frontmatter } from "./sections/frontmatter";
import { liveStatus } from "./sections/live-status";
import { whatIsThis } from "./sections/what-is-this";
import { whyPlay } from "./sections/why-play";
import { quickStart } from "./sections/quick-start";
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
  baseUrl: string,
  referrer?: string
): string {
  const sections = [
    frontmatter(state, baseUrl),
    liveStatus(state),
    whatIsThis(state),
    whyPlay(state),
    quickStart(baseUrl, referrer),
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
