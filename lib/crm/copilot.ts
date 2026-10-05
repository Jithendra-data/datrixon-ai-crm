import { rankedRecommendations } from "./priorities";
import type { User } from "./types";
import type { NarrativeResult } from "./narrative";
import { attribution, signals, type WindowKey } from "./history";
import type { Dataset, Evidence } from "./types";
import {
  analytics,
  risk,
  health,
  isOpen,
  lastContact,
  daysSince,
  accountBrief,
} from "./intelligence";
export type Answer = {
  narrative?: NarrativeResult;
  answer: string;
  intent: string;
  logic: string;
  confidence: string;
  evidence: Evidence[];
  method: string;
  generated_at: string;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n / 100);
function baseAnswer(question: string, d: Dataset, now = new Date()): Answer {
  const q = question.toLowerCase();
  const m = analytics(d, now);
  let answer = "",
    intent = "unsupported",
    logic = "",
    evidence: Evidence[] = [];
  const account = d.accounts.find((a) => q.includes(a.name.toLowerCase()));
  if (account) {
    const b = accountBrief(account, d, now);
    answer = b.summary;
    evidence = b.evidence;
    intent = "account_summary";
    logic =
      "Join accessible account, open opportunities, recorded activities and unresolved cases.";
  } else if (
    /risk/.test(q) &&
    /account|customer/.test(q) &&
    !/deal|opportunit/.test(q)
  ) {
    const rows = d.accounts.filter((a) => health(a, d, now).score < 60);
    answer = rows.length
      ? rows
          .map(
            (a) =>
              `${a.name}: health ${health(a, d, now).score}/100. ${health(
                a,
                d,
                now,
              )
                .factors.map((f) => f.label)
                .join("; ")}.`,
          )
          .join("\n")
      : "No accessible accounts fall below the health attention threshold.";
    evidence = rows.map((a) => ({
      type: "accounts",
      id: a.id,
      label: a.name,
      account_id: a.id,
    }));
    intent = "account_risk";
    logic =
      "Accessible accounts with health-v1 score below 60; includes source-backed health factors.";
  } else if (/slip|risk|100.?000|no activity/.test(q)) {
    const threshold = q.includes("100") ? 10000000 : 0;
    const records = d.opportunities
      .filter((o) => isOpen(o) && o.amount >= threshold)
      .filter((o) => {
        if (q.includes("activity")) {
          const a = lastContact(d, o.account_id, o.id, now);
          return !a || daysSince(a.occurred_at, now) >= 14;
        }
        return risk(o, d, now).score >= 50;
      })
      .filter(
        (o) =>
          !q.includes("this month") ||
          o.close_date.slice(0, 7) === now.toISOString().slice(0, 7),
      )
      .sort((a, b) => risk(b, d, now).score - risk(a, d, now).score);
    answer = records.length
      ? records
          .slice(0, 10)
          .map(
            (o) =>
              `${o.name} (${money(o.amount)}): risk ${risk(o, d, now).score}/100. ${risk(
                o,
                d,
                now,
              )
                .factors.map((f) => f.label)
                .join("; ")}.`,
          )
          .join("\n")
      : "No accessible opportunities match those criteria.";
    evidence = records.slice(0, 10).map((o) => ({
      type: "opportunities",
      id: o.id,
      label: o.name,
      account_id: o.account_id,
    }));
    intent = "pipeline_risk";
    logic = `Open opportunities; amount >= ${threshold / 100} USD; ${q.includes("activity") ? "customer contact absent or >=14 days old" : "risk-v1 >=50"}${q.includes("this month") ? "; close date in current UTC month" : ""}; top 10 by risk.`;
  } else if (/quiet|inactive|health/.test(q)) {
    const rows = d.accounts.filter((a) => {
      const last = lastContact(d, a.id, undefined, now);
      return !last || daysSince(last.occurred_at, now) >= 14;
    });
    answer = rows.length
      ? rows
          .map(
            (a) =>
              `${a.name}: health ${health(a, d, now).score}/100. ${health(
                a,
                d,
                now,
              )
                .factors.map((f) => f.label)
                .join("; ")}.`,
          )
          .join("\n")
      : "No accessible accounts have been quiet for 14 days.";
    evidence = rows.map((a) => ({
      type: "accounts",
      id: a.id,
      label: a.name,
      account_id: a.id,
    }));
    intent = "quiet_accounts";
    logic =
      "Accounts whose latest email/call/meeting is absent or >=14 days old.";
  } else if (/revenue|generated.*most/.test(q) && !/forecast|declin/.test(q)) {
    const rows = d.accounts
      .map((a) => ({
        a,
        value: d.order_lines
          .filter((l) =>
            d.orders.some(
              (o) =>
                o.id === l.order_id &&
                o.account_id === a.id &&
                o.status === "paid",
            ),
          )
          .reduce((s, l) => s + l.quantity * l.unit_price, 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    answer = rows
      .map((r) => `${r.a.name}: ${money(r.value)} paid order value.`)
      .join("\n");
    evidence = rows.map((r) => ({
      type: "accounts",
      id: r.a.id,
      label: r.a.name,
      account_id: r.a.id,
    }));
    intent = "revenue_rank";
    logic =
      "Sum paid order quantity × unit price by account; descending, top 5. This is paid order value, not GAAP recognized revenue.";
  } else if (/change|forecast|declin/.test(q)) {
    answer = `Weighted open pipeline is ${money(m.weighted)}. Recorded stage changes in the last 7 days contributed ${money(m.forecastDelta)} to weighted value. ${
      m.movement.length
        ? m.movement
            .slice(0, 5)
            .map(
              (h) =>
                `${d.opportunities.find((o) => o.id === h.opportunity_id)?.name}: ${h.from_stage} → ${h.to_stage} (${money(h.delta)}).`,
            )
            .join(" ")
        : "No stage-change evidence is available."
    } This attribution excludes unrecorded amount or close-date changes.`;
    evidence = m.movement.map((h) => ({
      type: "stage_history",
      id: h.id,
      label: `${h.from_stage} → ${h.to_stage}`,
      account_id: d.opportunities.find((o) => o.id === h.opportunity_id)
        ?.account_id,
    }));
    intent = "forecast_change";
    logic =
      "Sum amount × (new probability − old probability) /100 from stage history in trailing 7 days.";
  } else if (/rep|salesperson/.test(q)) {
    answer = m.reps
      .map(
        (r) =>
          `${r.name}: ${money(r.pipeline)} open pipeline; ${r.activity} activities in 30 days. Activity counts alone do not establish performance.`,
      )
      .join("\n");
    intent = "rep_attention";
    logic =
      "Group accessible opportunities and trailing 30-day activities by owner; do not infer employee quality.";
    evidence = m.reps.map((r) => ({ type: "users", id: r.id, label: r.name }));
  } else if (/focus|action|today|brief/.test(q)) {
    const rec = d.recommendations
      .filter(
        (r) =>
          r.status === "pending" ||
          (r.status === "snoozed" &&
            r.snoozed_until &&
            r.snoozed_until <= now.toISOString()),
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
    answer = rec.length
      ? rec.map((r, i) => `${i + 1}. ${r.title}. ${r.reason}`).join("\n")
      : "No pending recommendations. Run agents to analyze current records.";
    intent = "next_actions";
    logic =
      "Accessible pending recommendations, descending deterministic priority, top 5.";
    evidence = rec.map((r) => ({
      type: "recommendations",
      id: r.id,
      label: r.title,
      account_id: r.account_id,
    }));
  } else {
    answer =
      "I do not have an approved query for that question. Try asking about deal risk, quiet customers, revenue, forecast changes, a specific account, or today’s actions. No database query was generated.";
    logic = "Unsupported intent: fail closed.";
  }
  return {
    answer,
    intent,
    logic,
    confidence:
      intent === "unsupported"
        ? "Insufficient evidence"
        : "Computed from accessible records; completeness is not guaranteed",
    evidence,
    method: "Deterministic semantic query; no language model used",
    generated_at: now.toISOString(),
  };
}

export function answerQuestion(
  question: string,
  d: Dataset,
  now = new Date(),
  user?: User,
): Answer {
  const q = question.toLowerCase();
  if (user && /next action|focus on today|important actions/.test(q)) {
    const rows = rankedRecommendations(d, user, now).slice(0, 5);
    return {
      answer:
        rows
          .map(
            (r) =>
              `${r.title}. ${r.reason}. Priority ${r.ranking.score}: ${r.ranking.reason}`,
          )
          .join("\n\n") || "No pending actions in your accessible scope.",
      intent: "personal_priorities",
      logic:
        "Accessible recommendations ranked by rule severity, exposure, role, ownership and urgency; top five.",
      confidence:
        "Rule ranking is not calibrated probability or guaranteed business impact.",
      evidence: rows.map((r) => ({
        type: "recommendations",
        id: r.id,
        label: r.title,
        account_id: r.account_id,
      })),
      method: "Deterministic persona-aware priorities",
      generated_at: now.toISOString(),
    };
  }
  const window: WindowKey = /yesterday/.test(q)
    ? "yesterday"
    : /monday/.test(q)
      ? "monday"
      : /quarter/.test(q)
        ? "quarter"
        : "week";
  if (
    /(why|change|declin|increas|decreas)/.test(q) &&
    /(forecast|pipeline|revenue)/.test(q)
  ) {
    const metric = /forecast/.test(q)
      ? "forecast"
      : /revenue/.test(q)
        ? "paid"
        : "pipeline";
    const a = attribution(d, metric, window, now);
    return {
      answer: a.covered
        ? `${metric === "forecast" ? "Current-quarter weighted forecast" : metric === "paid" ? "Paid order value" : "Open pipeline"} moved from ${money(a.prior)} to ${money(a.current)} (${a.delta >= 0 ? "+" : ""}${money(a.delta)}). ${
            a.contributions
              .slice(0, 5)
              .map((c) => `${c.label}: ${money(c.delta)}; ${c.reason}`)
              .join(". ") || "No net contribution changed."
          }`
        : "There is no eligible historical baseline. Capture snapshots and compare after the next period boundary.",
      intent: "snapshot_attribution",
      logic: `Compare latest per-account frame at or before ${a.baseline} to current state. Sum exact record contributions. Coverage ${a.covered}/${a.total} accounts.`,
      confidence: a.limitation,
      evidence: a.contributions.slice(0, 20).flatMap((c) => [
        {
          type: metric === "paid" ? "accounts" : "opportunities",
          id: c.id,
          label: c.label,
          account_id: c.account_id,
        },
        {
          type: "intelligence_snapshots",
          id: c.snapshot,
          label: "Baseline frame",
          account_id: c.account_id,
        },
      ]),
      method: "Deterministic snapshot attribution",
      generated_at: now.toISOString(),
    };
  }
  if (
    /(what changed|signals|relationship|decision maker|buyer coverage)/.test(q)
  ) {
    const list = signals(d, window, now)
      .filter(
        (x) =>
          !/relationship|decision maker|buyer coverage/.test(q) ||
          x.category === "Relationship",
      )
      .slice(0, 5);
    return {
      answer:
        list
          .map((x) => `${x.title}. ${x.explanation} Next: ${x.action}`)
          .join("\n\n") || "No supported signals found in accessible records.",
      intent: "signals",
      logic:
        "Rank explainable snapshot differences and explicit relationship coverage conditions by severity and exposure; top five.",
      confidence:
        "Current conditions are identified separately from measured changes. Synthetic baselines are authored scenarios.",
      evidence: list.flatMap((x) => x.evidence),
      method: "Deterministic signal analysis",
      generated_at: now.toISOString(),
    };
  }
  return baseAnswer(question, d, now);
}
