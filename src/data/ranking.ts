import type { Girl } from "./girls";

export type RankTab = "Daily" | "Weekly";

export function formatHeat(count: number) {
  return String(count);
}

export function rankHosts(hosts: Girl[], tab: RankTab): Girl[] {
  const flagged = tab === "Daily" ? (g: Girl) => g.dailyRank === 1 : (g: Girl) => g.weeklyRank === 1;
  return hosts.filter(flagged).sort((a, b) => (b.fireCount ?? 0) - (a.fireCount ?? 0));
}
