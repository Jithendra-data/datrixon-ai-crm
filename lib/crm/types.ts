import type * as s from "../../db/schema";
export type Account = typeof s.accounts.$inferSelect;
export type Opportunity = typeof s.opportunities.$inferSelect;
export type Activity = typeof s.activities.$inferSelect;
export type Contact = typeof s.contacts.$inferSelect;
export type User = typeof s.users.$inferSelect;
export type Recommendation = typeof s.recommendations.$inferSelect;
export type Dataset = {
  intelligence_snapshots: (typeof s.intelligenceSnapshots.$inferSelect)[];
  recommendation_feedback: (typeof s.recommendationFeedback.$inferSelect)[];
  ingestion_events: (typeof s.ingestionEvents.$inferSelect)[];
  activity_contacts: (typeof s.activityContacts.$inferSelect)[];
  accounts: Account[];
  contacts: Contact[];
  opportunities: Opportunity[];
  activities: Activity[];
  users: User[];
  stages: (typeof s.stages.$inferSelect)[];
  tasks: (typeof s.tasks.$inferSelect)[];
  cases: (typeof s.cases.$inferSelect)[];
  notes: (typeof s.notes.$inferSelect)[];
  products: (typeof s.products.$inferSelect)[];
  orders: (typeof s.orders.$inferSelect)[];
  order_lines: (typeof s.orderLines.$inferSelect)[];
  stage_history: (typeof s.stageHistory.$inferSelect)[];
  stakeholders: (typeof s.stakeholders.$inferSelect)[];
  recommendations: Recommendation[];
  agent_runs: (typeof s.agentRuns.$inferSelect)[];
  audit_events: (typeof s.auditEvents.$inferSelect)[];
  quality_issues: (typeof s.qualityIssues.$inferSelect)[];
  workflow_rules: (typeof s.workflowRules.$inferSelect)[];
  workflow_runs: (typeof s.workflowRuns.$inferSelect)[];
  notifications: (typeof s.notifications.$inferSelect)[];
  memories: (typeof s.memories.$inferSelect)[];
  ai_requests: (typeof s.aiRequests.$inferSelect)[];
  approvals: (typeof s.approvals.$inferSelect)[];
  leads: (typeof s.leads.$inferSelect)[];
  campaigns: (typeof s.campaigns.$inferSelect)[];
  quotes: (typeof s.quotes.$inferSelect)[];
  quote_lines: (typeof s.quoteLines.$inferSelect)[];
};
export const roles = [
  "Administrator",
  "Executive",
  "Sales Manager",
  "Sales Representative",
  "Customer Success",
  "Support",
  "Analyst",
] as const;
export type Role = (typeof roles)[number];
export type Action =
  "read" | "write" | "approve" | "run_agents" | "audit" | "govern";
export type Evidence = {
  type: string;
  id: string;
  label: string;
  account_id?: string;
};
export type Factor = { label: string; points: number; source: string };
export type Score = { score: number; factors: Factor[]; method: string };
export type Session = { workspace_id: string; user: User; expires_at: string };
