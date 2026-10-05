import type { Dataset, Opportunity, Score, Account, Evidence } from "./types";
export const DAY = 86400000;
export function daysSince(date: string, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(date)) / DAY));
}
export const isOpen = (o: Opportunity) => !["won", "lost"].includes(o.stage_id);
export function lastContact(
  d: Dataset,
  accountId: string,
  opportunityId?: string,
) {
  return d.activities
    .filter(
      (a) =>
        a.account_id === accountId &&
        (!opportunityId || a.opportunity_id === opportunityId) &&
        ["email", "call", "meeting"].includes(a.kind),
    )
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
}
export function risk(o: Opportunity, d: Dataset, now = new Date()): Score {
  if (!isOpen(o))
    return { score: 0, factors: [], method: "rule-based / risk-v1" };
  const factors: Score["factors"] = [];
  const contact = lastContact(d, o.account_id, o.id);
  const quiet = contact ? daysSince(contact.occurred_at, now) : null;
  if (quiet === null || quiet >= 14)
    factors.push({
      label:
        quiet === null
          ? "No recorded customer contact"
          : `${quiet} days without customer contact`,
      points: quiet === null || quiet >= 30 ? 30 : 20,
      source: contact ? `activities:${contact.id}` : `opportunities:${o.id}`,
    });
  if (daysSince(o.stage_entered_at, now) > 30)
    factors.push({
      label: `${daysSince(o.stage_entered_at, now)} days in current stage`,
      points: 15,
      source: `opportunities:${o.id}`,
    });
  if (!o.next_action)
    factors.push({
      label: "No next action recorded",
      points: 15,
      source: `opportunities:${o.id}`,
    });
  const closeDays = Math.ceil(
    (Date.parse(o.close_date + "T23:59:59Z") - now.getTime()) / DAY,
  );
  if (closeDays < 0)
    factors.push({
      label: "Close date has passed",
      points: 20,
      source: `opportunities:${o.id}`,
    });
  else if (closeDays <= 14 && (quiet === null || quiet >= 14))
    factors.push({
      label: "Closing within 14 days with stale engagement",
      points: 10,
      source: `opportunities:${o.id}`,
    });
  if (o.close_date_changes >= 2)
    factors.push({
      label: `Close date moved ${o.close_date_changes} times`,
      points: 10,
      source: `opportunities:${o.id}`,
    });
  const urgent = d.cases.find(
    (c) =>
      c.account_id === o.account_id &&
      c.severity === "critical" &&
      c.status !== "resolved",
  );
  if (urgent)
    factors.push({
      label: "Unresolved critical support case",
      points: 15,
      source: `cases:${urgent.id}`,
    });
  if (d.stakeholders.filter((s) => s.opportunity_id === o.id).length < 2)
    factors.push({
      label: "Fewer than two documented stakeholders",
      points: 10,
      source: `opportunities:${o.id}`,
    });
  return {
    score: Math.min(
      100,
      factors.reduce((s, f) => s + f.points, 0),
    ),
    factors,
    method: "rule-based / risk-v1; not a probability",
  };
}
export function health(a: Account, d: Dataset, now = new Date()): Score {
  const factors: Score["factors"] = [];
  const last = lastContact(d, a.id);
  const quiet = last ? daysSince(last.occurred_at, now) : 999;
  if (quiet >= 14)
    factors.push({
      label: last
        ? `${quiet} days without customer interaction`
        : "No recorded interaction",
      points: quiet >= 30 ? 35 : 20,
      source: last ? `activities:${last.id}` : `accounts:${a.id}`,
    });
  for (const c of d.cases.filter(
    (c) => c.account_id === a.id && c.status !== "resolved",
  ))
    factors.push({
      label: `${c.severity} case: ${c.subject}`,
      points: c.severity === "critical" ? 25 : 8,
      source: `cases:${c.id}`,
    });
  const overdue = d.tasks.filter(
    (t) =>
      t.account_id === a.id &&
      t.status !== "completed" &&
      t.due_date < now.toISOString().slice(0, 10),
  );
  if (overdue.length)
    factors.push({
      label: `${overdue.length} overdue follow-up tasks`,
      points: Math.min(15, overdue.length * 5),
      source: `tasks:${overdue[0].id}`,
    });
  const recent = d.activities.filter(
    (x) => x.account_id === a.id && daysSince(x.occurred_at, now) <= 30,
  ).length;
  const prior = d.activities.filter(
    (x) =>
      x.account_id === a.id &&
      daysSince(x.occurred_at, now) > 30 &&
      daysSince(x.occurred_at, now) <= 60,
  ).length;
  if (prior > 2 && recent < prior / 2)
    factors.push({
      label: `Engagement declined from ${prior} to ${recent} interactions across consecutive 30-day windows`,
      points: 15,
      source: `accounts:${a.id}`,
    });
  return {
    score: Math.max(0, 100 - factors.reduce((s, f) => s + f.points, 0)),
    factors,
    method:
      "rule-based / health-v1; excludes unavailable adoption and sentiment inference",
  };
}
export function analytics(d: Dataset, now = new Date()) {
  const open = d.opportunities.filter(isOpen);
  const won = d.opportunities.filter((o) => o.stage_id === "won");
  const lost = d.opportunities.filter((o) => o.stage_id === "lost");
  const sum = (a: Opportunity[]) => a.reduce((s, o) => s + o.amount, 0);
  const probability = (id: string) =>
    d.stages.find((s) => s.id === id)?.probability ?? 0;
  const pipeline = sum(open);
  const weighted = Math.round(
    open.reduce((s, o) => s + (o.amount * probability(o.stage_id)) / 100, 0),
  );
  const movement = d.stage_history
    .filter((h) => daysSince(h.created_at, now) <= 7)
    .map((h) => ({
      ...h,
      delta: Math.round(
        (h.amount * (h.new_probability - h.old_probability)) / 100,
      ),
    }));
  const revenue = d.order_lines
    .filter((l) =>
      d.orders.some((o) => o.id === l.order_id && o.status === "paid"),
    )
    .reduce((s, l) => s + l.quantity * l.unit_price, 0);
  return {
    pipeline,
    weighted,
    won: sum(won),
    lost: sum(lost),
    revenue,
    winRate:
      won.length + lost.length
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : 0,
    averageDeal: won.length ? Math.round(sum(won) / won.length) : 0,
    salesCycle: won.length
      ? Math.round(
          won.reduce(
            (s, o) => s + daysSince(o.created_at, new Date(o.stage_entered_at)),
            0,
          ) / won.length,
        )
      : 0,
    commit: sum(open.filter((o) => o.forecast_category === "commit")),
    bestCase: sum(
      open.filter((o) => ["commit", "best_case"].includes(o.forecast_category)),
    ),
    stale: sum(
      open.filter((o) => {
        const a = lastContact(d, o.account_id, o.id);
        return !a || daysSince(a.occurred_at, now) >= 14;
      }),
    ),
    atRisk: sum(open.filter((o) => risk(o, d, now).score >= 50)),
    movement,
    forecastDelta: movement.reduce((s, h) => s + h.delta, 0),
    openCount: open.length,
    health: d.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      ...health(a, d, now),
    })),
    stages: d.stages.map((s) => ({
      ...s,
      count: d.opportunities.filter((o) => o.stage_id === s.id).length,
      value: sum(d.opportunities.filter((o) => o.stage_id === s.id)),
    })),
    reps: d.users
      .filter((u) => u.role === "Sales Representative")
      .map((u) => ({
        id: u.id,
        name: u.name,
        pipeline: sum(open.filter((o) => o.owner_id === u.id)),
        won: sum(won.filter((o) => o.owner_id === u.id)),
        activity: d.activities.filter(
          (a) => a.owner_id === u.id && daysSince(a.occurred_at, now) <= 30,
        ).length,
      })),
  };
}
export function accountBrief(a: Account, d: Dataset, now = new Date()) {
  const opps = d.opportunities.filter(
    (o) => o.account_id === a.id && isOpen(o),
  );
  const recent = d.activities
    .filter((x) => x.account_id === a.id)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 5);
  const support = d.cases.filter(
    (c) => c.account_id === a.id && c.status !== "resolved",
  );
  const h = health(a, d, now);
  const evidence: Evidence[] = [
    { type: "accounts", id: a.id, label: a.name, account_id: a.id },
    ...opps.map((o) => ({
      type: "opportunities",
      id: o.id,
      label: o.name,
      account_id: a.id,
    })),
    ...recent.map((x) => ({
      type: "activities",
      id: x.id,
      label: x.subject,
      account_id: a.id,
    })),
    ...support.map((c) => ({
      type: "cases",
      id: c.id,
      label: c.subject,
      account_id: a.id,
    })),
  ];
  return {
    summary: `${a.name} has ${opps.length} open opportunities worth $${(opps.reduce((s, o) => s + o.amount, 0) / 100).toLocaleString("en-US")}. Relationship health is ${h.score}/100 under health-v1. ${support.length} support cases remain unresolved. Recorded priorities: ${a.priorities}`,
    questions: [
      `What has changed in your priority to ${a.priorities.toLowerCase()}?`,
      ...(support.length
        ? [
            "What would a satisfactory resolution of the open support issues look like?",
          ]
        : []),
      ...(opps.length
        ? [
            "Who else needs to participate in the purchasing decision?",
            "Is the recorded close date still realistic?",
          ]
        : ["What outcomes should we plan for the next renewal?"]),
    ],
    evidence,
    method: "Deterministic meeting brief; no language model used",
    generated_at: now.toISOString(),
  };
}
