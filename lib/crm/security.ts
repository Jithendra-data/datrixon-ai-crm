import type { Action, Dataset, Role, User } from "./types";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const grants: Record<Role, Action[]> = {
  Administrator: ["read", "write", "approve", "run_agents", "audit", "govern"],
  Executive: ["read", "approve", "audit"],
  "Sales Manager": ["read", "write", "approve", "run_agents", "audit"],
  "Sales Representative": ["read", "write"],
  "Customer Success": ["read", "write", "run_agents"],
  Support: ["read", "write"],
  Analyst: ["read"],
};
export function can(role: string, action: Action) {
  return (grants[role as Role] ?? []).includes(action);
}
export function authorize(user: User, action: Action) {
  if (!can(user.role, action))
    throw new AppError(403, "Your role cannot perform this action.");
}
export function scopeData(data: Dataset, user: User): Dataset {
  if (user.role !== "Sales Representative") return data;
  const accounts = data.accounts.filter((a) => a.owner_id === user.id);
  const ids = new Set(accounts.map((a) => a.id));
  const opportunities = data.opportunities.filter((o) => ids.has(o.account_id));
  const opps = new Set(opportunities.map((o) => o.id));
  const orders = data.orders.filter((o) => ids.has(o.account_id));
  const orderIds = new Set(orders.map((o) => o.id));
  const recommendations = data.recommendations.filter((r) =>
    ids.has(r.account_id),
  );
  const recs = new Set(recommendations.map((r) => r.id));
  const quotes = data.quotes.filter((q) => opps.has(q.opportunity_id));
  const quoteIds = new Set(quotes.map((q) => q.id));
  return {
    ...data,
    accounts,
    opportunities,
    orders,
    recommendations,
    quotes,
    contacts: data.contacts.filter(
      (c) => c.account_id && ids.has(c.account_id),
    ),
    activities: data.activities.filter((a) => ids.has(a.account_id)),
    tasks: data.tasks.filter((t) => ids.has(t.account_id)),
    cases: data.cases.filter((c) => ids.has(c.account_id)),
    notes: data.notes.filter((n) => ids.has(n.account_id)),
    order_lines: data.order_lines.filter((l) => orderIds.has(l.order_id)),
    quote_lines: data.quote_lines.filter((l) => quoteIds.has(l.quote_id)),
    stakeholders: data.stakeholders.filter((s) => opps.has(s.opportunity_id)),
    stage_history: data.stage_history.filter((h) => opps.has(h.opportunity_id)),
    quality_issues: data.quality_issues.filter(
      (i) => i.account_id && ids.has(i.account_id),
    ),
    memories: data.memories.filter((m) => ids.has(m.account_id)),
    notifications: data.notifications.filter((n) => n.owner_id === user.id),
    approvals: data.approvals.filter((a) => recs.has(a.recommendation_id)),
    leads: data.leads.filter((l) => l.owner_id === user.id),
    audit_events: [],
    agent_runs: [],
    workflow_runs: [],
    ai_requests: data.ai_requests.filter((r) => r.user_id === user.id),
  };
}
export function publicData(data: Dataset, user: User) {
  authorize(user, "read");
  const d = scopeData(data, user);
  return {
    ...d,
    audit_events: can(user.role, "audit") ? d.audit_events : [],
    ai_requests: can(user.role, "audit")
      ? d.ai_requests
      : d.ai_requests.filter((r) => r.user_id === user.id),
  };
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new AppError(403, "Same-origin request required.");
}
export async function hashToken(token: string) {
  const b = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(b), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export function newToken() {
  return crypto.randomUUID() + crypto.randomUUID();
}
