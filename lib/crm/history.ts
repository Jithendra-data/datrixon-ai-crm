import { z } from "zod";
import type { Dataset, Evidence, Factor } from "./types";
import { health, risk, isOpen, DAY } from "./intelligence";
import { quality } from "./agents";
import { baseRow, insert, type Database } from "./repository";
const factorSchema = z.object({
  label: z.string(),
  points: z.number(),
  source: z.string(),
});
const dealSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  stage: z.string(),
  probability: z.number(),
  close_date: z.string(),
  close_changes: z.number(),
  risk: z.number(),
  factors: z.array(factorSchema),
  open: z.boolean(),
  next_action: z.string(),
});
export const frameSchema = z.object({
  version: z.literal(1),
  account: z.string(),
  name: z.string(),
  health: z.number(),
  healthFactors: z.array(factorSchema),
  deals: z.array(dealSchema),
  paid: z.number(),
  quality: z.array(z.object({ id: z.string(), severity: z.string() })),
  contacts: z.number(),
});
export type Frame = z.infer<typeof frameSchema>;
export type WindowKey = "yesterday" | "week" | "monday" | "quarter";
export function baselineTime(window: WindowKey, now = new Date()) {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  if (window === "quarter")
    return new Date(
      Date.UTC(day.getUTCFullYear(), Math.floor(day.getUTCMonth() / 3) * 3, 1),
    );
  day.setUTCDate(
    day.getUTCDate() -
      (window === "yesterday"
        ? 1
        : window === "week"
          ? 7
          : (day.getUTCDay() + 6) % 7),
  );
  return day;
}
export function accountFrame(d: Dataset, id: string, now = new Date()): Frame {
  const a = d.accounts.find((x) => x.id === id)!;
  const h = health(a, d, now);
  const orders = new Set(
    d.orders
      .filter((o) => o.account_id === id && o.status === "paid")
      .map((o) => o.id),
  );
  return {
    version: 1,
    account: id,
    name: a.name,
    health: h.score,
    healthFactors: h.factors,
    deals: d.opportunities
      .filter((o) => o.account_id === id)
      .map((o) => {
        const r = risk(o, d, now);
        return {
          id: o.id,
          name: o.name,
          amount: o.amount,
          stage: o.stage_id,
          probability:
            d.stages.find((s) => s.id === o.stage_id)?.probability || 0,
          close_date: o.close_date,
          close_changes: o.close_date_changes,
          risk: r.score,
          factors: r.factors,
          open: isOpen(o),
          next_action: o.next_action || "",
        };
      }),
    paid: d.order_lines
      .filter((l) => orders.has(l.order_id))
      .reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
    quality: quality(d, now)
      .filter((i) => i.account_id === id)
      .map((i) => ({ id: i.id, severity: i.severity })),
    contacts: d.contacts.filter((c) => c.account_id === id).length,
  };
}
export function snapshotRows(
  d: Dataset,
  workspace: string,
  now = new Date(),
  method = "observed",
  capture: string = crypto.randomUUID(),
) {
  return d.accounts.map((a) => ({
    ...baseRow(workspace, `${capture}:${a.id}`, now.toISOString()),
    account_id: a.id,
    captured_at: now.toISOString(),
    capture_id: capture,
    method,
    payload: JSON.stringify(accountFrame(d, a.id, now)),
  }));
}
export async function captureSnapshots(
  db: Database,
  d: Dataset,
  workspace: string,
  now = new Date(),
  capture: string = crypto.randomUUID(),
) {
  const rows = snapshotRows(d, workspace, now, "observed", capture);
  if (rows.length)
    await db.batch(
      rows.map((row) => insert(db, "intelligence_snapshots", row, true)),
    );
  return rows.length;
}
export function syntheticHistory(d: Dataset, workspace: string, now: Date) {
  // These are explicitly authored synthetic scenario frames, never backfilled
  // claims about observed production state. Values are computed from each frame.
  return [14, 7, 1].flatMap((days) => {
    const past = new Date(now.getTime() - days * DAY);
    past.setUTCHours(0, 0, 0, 0);
    const prior = structuredClone(d);
    prior.activities = prior.activities.filter(
      (a) => a.occurred_at <= past.toISOString(),
    );
    prior.cases = prior.cases.filter((c) => c.created_at <= past.toISOString());
    prior.orders = prior.orders.filter(
      (o) => o.ordered_at <= past.toISOString(),
    );
    for (const o of prior.opportunities) {
      const future = d.stage_history
        .filter(
          (h) => h.opportunity_id === o.id && h.created_at > past.toISOString(),
        )
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      if (future) {
        o.stage_id = future.from_stage;
        o.stage_entered_at = new Date(past.getTime() - 10 * DAY).toISOString();
      }
      if (days >= 7 && o.id === "o2") {
        o.close_date = new Date(now.getTime() + 8 * DAY)
          .toISOString()
          .slice(0, 10);
        o.amount += 4000000;
      }
    }
    return snapshotRows(
      prior,
      workspace,
      past,
      "synthetic scenario baseline",
      `scenario-${days}`,
    );
  });
}
export function factorChanges(
  before: Factor[],
  after: Factor[],
  direction = 1,
) {
  const key = (f: Factor) =>
    f.label.replace(/\d+/g, "#") +
    ":" +
    f.source.split(":")[0] +
    (f.source.startsWith("cases:") ? f.source : "");
  const keys = [...new Set([...before, ...after].map(key))];
  return keys
    .map((k) => {
      const old = before.find((f) => key(f) === k),
        current = after.find((f) => key(f) === k);
      return {
        label: current?.label || old!.label,
        prior: old?.points || 0,
        current: current?.points || 0,
        delta: direction * ((current?.points || 0) - (old?.points || 0)),
        source: current?.source || old!.source,
        state: !old ? "new" : !current ? "resolved" : "changed",
      };
    })
    .filter((f) => f.delta !== 0);
}
export type Comparison = {
  account_id: string;
  prior: Frame;
  current: Frame;
  captured_at: string;
  snapshot_id: string;
  method: string;
};
export function comparisons(
  d: Dataset,
  window: WindowKey = "week",
  now = new Date(),
): Comparison[] {
  const target = baselineTime(window, now).toISOString();
  return d.accounts.flatMap((a) => {
    const row = d.intelligence_snapshots
      .filter((s) => s.account_id === a.id && s.captured_at <= target)
      .sort((a, b) => b.captured_at.localeCompare(a.captured_at))[0];
    if (!row) return [];
    let value: unknown;
    try {
      value = JSON.parse(row.payload);
    } catch {
      return [];
    }
    const parsed = frameSchema.safeParse(value);
    if (!parsed.success) return [];
    return [
      {
        account_id: a.id,
        prior: parsed.data,
        current: accountFrame(d, a.id, now),
        captured_at: row.captured_at,
        snapshot_id: row.id,
        method: row.method,
      },
    ];
  });
}
export type MetricKey =
  "weighted" | "pipeline" | "forecast" | "won" | "atRisk" | "paid";
export function quarterOf(date: string) {
  return (
    date.slice(0, 4) +
    "-Q" +
    (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1)
  );
}
export function dealMetric(
  o: Frame["deals"][number],
  metric: MetricKey,
  quarter: string,
) {
  if (metric === "won") return o.stage === "won" ? o.amount : 0;
  if (!o.open) return 0;
  if (metric === "pipeline") return o.amount;
  if (metric === "atRisk") return o.risk >= 50 ? o.amount : 0;
  if (metric === "forecast" && quarterOf(o.close_date) !== quarter) return 0;
  return Math.round((o.amount * o.probability) / 100);
}
export function attribution(
  d: Dataset,
  metric: MetricKey,
  window: WindowKey = "week",
  now = new Date(),
) {
  const pairs = comparisons(d, window, now),
    quarter = quarterOf(now.toISOString());
  const contributions = pairs.flatMap((p) => {
    if (metric === "paid")
      return [
        {
          id: p.account_id,
          account_id: p.account_id,
          label: p.current.name,
          prior: p.prior.paid,
          current: p.current.paid,
          delta: p.current.paid - p.prior.paid,
          reason: "Paid order line totals",
          snapshot: p.snapshot_id,
        },
      ];
    const ids = [
      ...new Set([...p.prior.deals, ...p.current.deals].map((o) => o.id)),
    ];
    return ids.map((id) => {
      const old = p.prior.deals.find((o) => o.id === id),
        current = p.current.deals.find((o) => o.id === id);
      const before = old ? dealMetric(old, metric, quarter) : 0,
        after = current ? dealMetric(current, metric, quarter) : 0;
      const reasons = [
        !old ? "New record" : !current ? "Record no longer present" : "",
        old && current && old.amount !== current.amount ? "Value changed" : "",
        old && current && old.stage !== current.stage
          ? `${old.stage} → ${current.stage}`
          : "",
        old && current && old.close_date !== current.close_date
          ? `Close date ${old.close_date} → ${current.close_date}`
          : "",
        metric === "atRisk" && old && current
          ? `Risk ${old.risk} → ${current.risk}`
          : "",
      ].filter(Boolean);
      return {
        id,
        account_id: p.account_id,
        label: current?.name || old!.name,
        prior: before,
        current: after,
        delta: after - before,
        reason: reasons.join("; ") || "Recorded state unchanged",
        snapshot: p.snapshot_id,
      };
    });
  });
  const prior = contributions.reduce((s, x) => s + x.prior, 0),
    current = contributions.reduce((s, x) => s + x.current, 0);
  return {
    metric,
    prior,
    current,
    delta: current - prior,
    percentage: prior ? ((current - prior) / prior) * 100 : null,
    contributions: contributions
      .filter((x) => x.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    covered: pairs.length,
    total: d.accounts.length,
    window,
    as_of: now.toISOString(),
    baseline: baselineTime(window, now).toISOString(),
    limitation:
      "Only accounts with a snapshot at or before the requested boundary are compared. Baselines may be older; inspect their timestamps. Quarter forecast uses the current quarter for both states. Synthetic baselines are authored scenario data, not observed history.",
  };
}
export type SignalCategory =
  | "Revenue"
  | "Pipeline"
  | "Customer"
  | "Risk"
  | "Forecast"
  | "Relationship"
  | "Data Quality"
  | "Operational";
export type Signal = {
  id: string;
  title: string;
  category: SignalCategory;
  severity: "high" | "medium" | "low";
  timestamp: string;
  account_id: string;
  entity_id: string;
  entity_type: string;
  impact: number;
  explanation: string;
  evidence: Evidence[];
  action: string;
  change: boolean;
};
export function signals(
  d: Dataset,
  window: WindowKey = "week",
  now = new Date(),
): Signal[] {
  const result: Signal[] = [];
  const add = (s: Omit<Signal, "id">) =>
    result.push({ ...s, id: `${s.category}:${s.entity_id}:${s.title}` });
  for (const p of comparisons(d, window, now)) {
    const ev: Evidence[] = [
      {
        type: "intelligence_snapshots",
        id: p.snapshot_id,
        label: `${p.method} · ${p.captured_at}`,
        account_id: p.account_id,
      },
      {
        type: "accounts",
        id: p.account_id,
        label: p.current.name,
        account_id: p.account_id,
      },
    ];
    if (p.prior.health !== p.current.health)
      add({
        category: "Customer",
        severity: p.current.health < 50 ? "high" : "medium",
        title: `${p.current.name}: health ${p.prior.health} → ${p.current.health}`,
        timestamp: now.toISOString(),
        account_id: p.account_id,
        entity_id: p.account_id,
        entity_type: "accounts",
        impact: p.current.deals
          .filter((o) => o.open)
          .reduce((s, o) => s + o.amount, 0),
        explanation:
          factorChanges(p.prior.healthFactors, p.current.healthFactors, -1)
            .map((f) => `${f.label}: ${f.delta > 0 ? "+" : ""}${f.delta}`)
            .join("; ") || "Score clipping changed the total.",
        evidence: ev,
        action: "Review health drivers and prepare an account plan.",
        change: true,
      });
    for (const o of p.current.deals) {
      const old = p.prior.deals.find((x) => x.id === o.id);
      if (!old) continue;
      if (o.risk !== old.risk)
        add({
          category: "Risk",
          severity: o.risk >= 50 ? "high" : "medium",
          title: `${o.name}: risk ${old.risk} → ${o.risk}`,
          timestamp: now.toISOString(),
          account_id: p.account_id,
          entity_id: o.id,
          entity_type: "opportunities",
          impact: o.open ? o.amount : 0,
          explanation:
            factorChanges(old.factors, o.factors)
              .map((f) => `${f.label}: ${f.delta > 0 ? "+" : ""}${f.delta}`)
              .join("; ") || "Open/closed state changed.",
          evidence: [
            ...ev,
            {
              type: "opportunities",
              id: o.id,
              label: o.name,
              account_id: p.account_id,
            },
          ],
          action: o.next_action || "Confirm a next action with the deal owner.",
          change: true,
        });
      if (o.close_date !== old.close_date)
        add({
          category: "Pipeline",
          severity: "medium",
          title: `${o.name}: close date changed`,
          timestamp: now.toISOString(),
          account_id: p.account_id,
          entity_id: o.id,
          entity_type: "opportunities",
          impact: o.amount,
          explanation: `${old.close_date} → ${o.close_date}. Recorded lifetime date changes: ${o.close_changes}.`,
          evidence: ev,
          action: "Validate buying timeline before committing the forecast.",
          change: true,
        });
    }
    const priorIds = new Set(p.prior.quality.map((i) => i.id)),
      newIssues = p.current.quality.filter((i) => !priorIds.has(i.id));
    if (newIssues.length)
      add({
        category: "Data Quality",
        severity: newIssues.some((i) => i.severity === "high")
          ? "high"
          : "medium",
        title: `${p.current.name}: ${newIssues.length} new quality findings`,
        timestamp: now.toISOString(),
        account_id: p.account_id,
        entity_id: p.account_id,
        entity_type: "accounts",
        impact: 0,
        explanation: `${p.current.quality.length} current findings versus ${p.prior.quality.length} at the baseline.`,
        evidence: ev,
        action: "Correct the underlying records, then reevaluate.",
        change: true,
      });
  }
  for (const metric of ["forecast", "paid"] as const)
    for (const c of attribution(d, metric, window, now).contributions) {
      add({
        category: metric === "forecast" ? "Forecast" : "Revenue",
        severity: c.delta < 0 ? "high" : "low",
        title: `${c.label}: ${metric === "forecast" ? "quarter forecast" : "paid order value"} ${c.delta < 0 ? "decreased" : "increased"}`,
        timestamp: now.toISOString(),
        account_id: c.account_id,
        entity_id: c.id,
        entity_type: metric === "paid" ? "accounts" : "opportunities",
        impact: Math.abs(c.delta),
        explanation: `${c.prior / 100} → ${c.current / 100} USD. ${c.reason}`,
        evidence: [
          {
            type: "intelligence_snapshots",
            id: c.snapshot,
            label: "Baseline source frame",
            account_id: c.account_id,
          },
        ],
        action: "Inspect the before-and-after contribution.",
        change: true,
      });
    }
  for (const o of d.opportunities.filter(
    (o) => isOpen(o) && o.amount >= 10000000,
  )) {
    const stakeholderIds = d.stakeholders
      .filter((s) => s.opportunity_id === o.id)
      .map((s) => s.contact_id);
    const buyers = d.contacts.filter(
      (c) =>
        stakeholderIds.includes(c.id) &&
        /economic buyer|decision maker/.test(c.influence),
    );
    const activityIds = new Set(
      d.activity_contacts
        .filter((c) => buyers.some((b) => b.id === c.contact_id))
        .map((c) => c.activity_id),
    );
    const recent = d.activities.some(
      (a) =>
        activityIds.has(a.id) &&
        a.opportunity_id === o.id &&
        Date.parse(a.occurred_at) <= now.getTime() &&
        now.getTime() - Date.parse(a.occurred_at) < 14 * DAY,
    );
    if (!buyers.length || !recent)
      add({
        category: "Relationship",
        severity: "medium",
        title: `${o.name}: ${!buyers.length ? "no buyer identified" : "no recent buyer activity linked"}`,
        timestamp: now.toISOString(),
        account_id: o.account_id,
        entity_id: o.id,
        entity_type: "opportunities",
        impact: o.amount,
        explanation:
          "Checks explicitly linked decision-maker/economic-buyer contacts and their deal-linked activities. Account activity alone does not prove buyer engagement.",
        evidence: [
          {
            type: "opportunities",
            id: o.id,
            label: o.name,
            account_id: o.account_id,
          },
        ],
        action: "Confirm buyer coverage and link the relevant interaction.",
        change: false,
      });
  }
  for (const event of d.ingestion_events.slice(0, 10))
    add({
      category: "Operational",
      severity: "low",
      title: "Email event captured with source provenance",
      timestamp: event.received_at,
      account_id: event.account_id,
      entity_id: event.activity_id,
      entity_type: "activities",
      impact: 0,
      explanation: `${event.provider} event ${event.external_id}; contact matched and activity recorded once.`,
      evidence: [
        {
          type: "activities",
          id: event.activity_id,
          label: "Imported interaction",
          account_id: event.account_id,
        },
      ],
      action: "Review the interaction and refreshed account memory.",
      change: true,
    });
  return result.sort(
    (a, b) =>
      ({ high: 3, medium: 2, low: 1 })[b.severity] -
        { high: 3, medium: 2, low: 1 }[a.severity] || b.impact - a.impact,
  );
}
