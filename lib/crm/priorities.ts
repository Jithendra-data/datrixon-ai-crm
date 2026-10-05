import type { Dataset, User, Recommendation } from "./types";
import { health, risk, isOpen } from "./intelligence";
export function priority(r: Recommendation, d: Dataset, user: User) {
  const a = d.accounts.find((a) => a.id === r.account_id)!;
  const o = d.opportunities.find((o) => o.id === r.opportunity_id);
  const exposure =
    o?.amount ||
    d.opportunities
      .filter((o) => o.account_id === a.id && isOpen(o))
      .reduce((s, o) => s + o.amount, 0);
  const relevance =
    user.role === "Customer Success"
      ? /Health|Follow/.test(r.agent)
        ? 20
        : 0
      : user.role === "Support"
        ? /Health/.test(r.agent)
          ? 25
          : 0
        : user.role === "Analyst"
          ? /Quality|Hygiene/.test(r.agent)
            ? 20
            : 0
          : o
            ? 10
            : 0;
  const ownership = a.owner_id === user.id ? 15 : 0;
  const urgency = o
    ? Math.round(risk(o, d).score / 5)
    : Math.round((100 - health(a, d).score) / 5);
  return {
    score:
      r.priority +
      Math.min(20, Math.floor(exposure / 5000000)) +
      relevance +
      ownership +
      urgency,
    reason: `Rule ${r.priority} + exposure ${Math.min(20, Math.floor(exposure / 5000000))} + role ${relevance} + ownership ${ownership} + urgency ${urgency}`,
  };
}
export function rankedRecommendations(
  d: Dataset,
  user: User,
  now = new Date(),
) {
  return d.recommendations
    .filter(
      (r) =>
        r.status === "pending" ||
        (r.status === "snoozed" &&
          !!r.snoozed_until &&
          r.snoozed_until <= now.toISOString()),
    )
    .map((r) => ({ ...r, ranking: priority(r, d, user) }))
    .sort(
      (a, b) => b.ranking.score - a.ranking.score || a.id.localeCompare(b.id),
    );
}
