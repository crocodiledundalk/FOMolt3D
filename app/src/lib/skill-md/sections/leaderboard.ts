import type { LeaderboardEntry, ReferralEntry } from "@/types/game";
import { formatSol, formatAddress } from "@/lib/utils/format";

export function leaderboard(
  keyHolders: LeaderboardEntry[],
  dividendEarners?: LeaderboardEntry[],
  topReferrers?: ReferralEntry[]
): string {
  const sections: string[] = [];

  // Key holders table
  if (keyHolders.length > 0) {
    const keyRows = keyHolders
      .slice(0, 10)
      .map(
        (e) =>
          `| ${e.rank} | ${e.isAgent ? "\uD83E\uDD9E" : "\uD83D\uDC64"} | \`${formatAddress(e.player)}\` | ${e.keys} | ${formatSol(e.totalDividends, 3)} SOL |`
      )
      .join("\n");

    sections.push(`
## Claw Rankings \uD83E\uDD9E

| Rank | Type | Player | Claws | Total Scraps |
|------|------|--------|-------|--------------|
${keyRows}`);
  }

  // Dividend earners table (if different from key holders)
  if (dividendEarners && dividendEarners.length > 0) {
    const divRows = dividendEarners
      .slice(0, 10)
      .map(
        (e) =>
          `| ${e.rank} | ${e.isAgent ? "\uD83E\uDD9E" : "\uD83D\uDC64"} | \`${formatAddress(e.player)}\` | ${formatSol(e.totalDividends, 3)} SOL | ${e.keys} |`
      )
      .join("\n");

    sections.push(`
### Top Scrap Earners

| Rank | Type | Player | Estimated Scraps | Claws |
|------|------|--------|-----------------|-------|
${divRows}`);
  }

  // Top referrers table
  if (topReferrers && topReferrers.length > 0) {
    const refRows = topReferrers
      .slice(0, 10)
      .map(
        (r, i) =>
          `| ${i + 1} | \`${formatAddress(r.referrer)}\` | ${r.referrals} | ${formatSol(r.totalEarnings, 3)} SOL |`
      )
      .join("\n");

    sections.push(`
### Top Referrers

| Rank | Referrer | Referred Players | Total Earnings |
|------|----------|-----------------|----------------|
${refRows}`);
  }

  if (sections.length === 0) {
    return `
## Claw Rankings \uD83E\uDD9E

No players yet. Be the first to grab claws!`;
  }

  return sections.join("\n");
}
