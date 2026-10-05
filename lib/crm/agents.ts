import type { Dataset } from "./types";
import { risk, health, isOpen, daysSince, lastContact } from "./intelligence";
export const agentCatalog = [
  {
    name: "Opportunity Risk",
    purpose: "Explain stale engagement, stage age and close-date exposure",
  },
  {
    name: "Customer Health",
    purpose: "Identify relationship deterioration and unresolved support",
  },
  {
    name: "Follow-Up",
    purpose: "Prioritize a specific next action for neglected opportunities",
  },
  {
    name: "Pipeline Hygiene",
    purpose: "Detect missing next actions and overdue close dates",
  },
  {
    name: "Duplicate Detection",
    purpose: "Identify matching normalized emails; never merge automatically",
  },
  {
    name: "CRM Data Quality",
    purpose: "Find incomplete ownership, email and account relationships",
  },
  {
    name: "Lead Qualification",
    purpose: "Rank lead completeness and estimated commercial value",
  },
  {
    name: "Forecast",
    purpose: "Explain weighted forecast movement from stage history",
  },
];
export function deriveRecommendations(d: Dataset, now = new Date()) {
  const out: {
    id: string;
    account_id: string;
    opportunity_id: string | null;
    agent: string;
    title: string;
    reason: string;
    evidence: string;
    priority: number;
  }[] = [];
  for (const o of d.opportunities.filter(isOpen)) {
    const r = risk(o, d, now);
    if (r.score >= 40 || !o.next_action)
      out.push({
        id: `risk-${o.id}`,
        account_id: o.account_id,
        opportunity_id: o.id,
        agent: "Opportunity Risk",
        title:
          o.close_date < now.toISOString().slice(0, 10)
            ? `Review close date: ${o.name}`
            : `Re-engage decision makers: ${o.name}`,
        reason: r.factors.map((f) => f.label).join("; "),
        evidence: JSON.stringify(r.factors),
        priority: r.score,
      });
    const last = lastContact(d, o.account_id, o.id);
    if (last && daysSince(last.occurred_at, now) >= 14)
      out.push({
        id: `follow-${o.id}`,
        account_id: o.account_id,
        opportunity_id: o.id,
        agent: "Follow-Up",
        title: `Schedule follow-up: ${o.name}`,
        reason: `Last customer interaction was ${daysSince(last.occurred_at, now)} days ago. Confirm current priorities before updating forecast.`,
        evidence: JSON.stringify([{ source: `activities:${last.id}` }]),
        priority: Math.max(35, r.score - 5),
      });
  }
  for (const a of d.accounts) {
    const h = health(a, d, now);
    if (h.score < 60)
      out.push({
        id: `health-${a.id}`,
        account_id: a.id,
        opportunity_id: null,
        agent: "Customer Health",
        title: `Prepare recovery plan: ${a.name}`,
        reason: h.factors.map((f) => f.label).join("; "),
        evidence: JSON.stringify(h.factors),
        priority: 100 - h.score,
      });
  }
  return out.sort((a, b) => b.priority - a.priority);
}
export function quality(d: Dataset, now = new Date()) {
  const issues: {
    id: string;
    entity_type: string;
    entity_id: string;
    account_id: string | null;
    kind: string;
    severity: string;
    description: string;
    remediation: string;
  }[] = [];
  const add = (
    type: string,
    id: string,
    account: string | null,
    kind: string,
    severity: string,
    description: string,
    remediation: string,
  ) =>
    issues.push({
      id: `${kind}-${id}`,
      entity_type: type,
      entity_id: id,
      account_id: account,
      kind,
      severity,
      description,
      remediation,
    });
  for (const c of d.contacts) {
    if (!c.email)
      add(
        "contacts",
        c.id,
        c.account_id,
        "missing_email",
        "medium",
        `${c.name} has no email address.`,
        "Confirm email with the account owner.",
      );
    if (!c.account_id)
      add(
        "contacts",
        c.id,
        null,
        "unlinked_contact",
        "high",
        `${c.name} is not linked to an account.`,
        "Verify company affiliation before linking.",
      );
  }
  const emails = new Map<string, string>();
  for (const c of [...d.contacts].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!c.email) continue;
    const key = c.email.trim().toLowerCase();
    if (emails.has(key))
      add(
        "contacts",
        c.id,
        c.account_id,
        "duplicate_contact",
        "high",
        `${c.name} shares an email with ${emails.get(key)}.`,
        "Compare source records; a human must approve a merge.",
      );
    else emails.set(key, c.id);
  }
  const domains = new Map<string, string>();
  for (const a of [...d.accounts].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!a.owner_id)
      add(
        "accounts",
        a.id,
        a.id,
        "missing_owner",
        "high",
        `${a.name} has no owner.`,
        "Sales manager should assign an accountable owner.",
      );
    if (domains.has(a.domain))
      add(
        "accounts",
        a.id,
        a.id,
        "duplicate_account",
        "high",
        `${a.name} shares a domain with ${domains.get(a.domain)}.`,
        "Review legal entities before consolidation.",
      );
    else domains.set(a.domain, a.id);
  }
  for (const o of d.opportunities.filter(isOpen)) {
    if (!o.next_action)
      add(
        "opportunities",
        o.id,
        o.account_id,
        "missing_next_action",
        "medium",
        `${o.name} has no next action.`,
        "Record a specific next action and owner.",
      );
    if (o.close_date < now.toISOString().slice(0, 10))
      add(
        "opportunities",
        o.id,
        o.account_id,
        "past_close_date",
        "high",
        `${o.name} has passed its close date.`,
        "Confirm timing with the customer and update the opportunity.",
      );
    const a = lastContact(d, o.account_id, o.id);
    if (!a)
      add(
        "opportunities",
        o.id,
        o.account_id,
        "no_activity",
        "high",
        `${o.name} has no customer activity.`,
        "Log a verified customer interaction.",
      );
    else if (daysSince(a.occurred_at, now) >= 14)
      add(
        "opportunities",
        o.id,
        o.account_id,
        "stale_opportunity",
        "medium",
        `${o.name} has not had contact for ${daysSince(a.occurred_at, now)} days.`,
        "Follow up and capture the interaction.",
      );
  }
  return issues;
}
export type WorkflowDefinition = {
  condition:
    "inactive_14d" | "past_close_date" | "critical_case" | "negotiation";
  action: "notify" | "review_task";
};
export function workflowMatches(
  def: WorkflowDefinition,
  o: Dataset["opportunities"][number],
  d: Dataset,
  now = new Date(),
) {
  if (!isOpen(o)) return false;
  const last = lastContact(d, o.account_id, o.id);
  switch (def.condition) {
    case "inactive_14d":
      return !last || daysSince(last.occurred_at, now) >= 14;
    case "past_close_date":
      return o.close_date < now.toISOString().slice(0, 10);
    case "critical_case":
      return d.cases.some(
        (c) =>
          c.account_id === o.account_id &&
          c.severity === "critical" &&
          c.status !== "resolved",
      );
    case "negotiation":
      return o.stage_id === "negotiation" && o.amount >= 10000000;
  }
}
