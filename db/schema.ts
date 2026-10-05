import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  foreignKey,
  index,
  uniqueIndex,
  check,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("synthetic"),
  created_at: text("created_at").notNull(),
  expires_at: text("expires_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires_at: text("expires_at").notNull(),
});
const base = () => ({
  workspace_id: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  source: text("source").notNull().default("synthetic"),
  metadata: text("metadata").notNull().default("{}"),
});
const identity = (t: { workspace_id: AnySQLiteColumn; id: AnySQLiteColumn }) =>
  primaryKey({ columns: [t.workspace_id, t.id] });
export const teams = sqliteTable(
  "teams",
  { ...base(), name: text("name").notNull() },
  (t) => [identity(t)],
);
export const users = sqliteTable(
  "users",
  {
    ...base(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    team_id: text("team_id"),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.team_id],
      foreignColumns: [teams.workspace_id, teams.id],
    }),
  ],
);
export const sessions = sqliteTable(
  "sessions",
  {
    token_hash: text("token_hash").primaryKey(),
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    user_id: text("user_id").notNull(),
    expires_at: text("expires_at").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.workspace_id, t.user_id],
      foreignColumns: [users.workspace_id, users.id],
    }),
    index("idx_sessions_expiry").on(t.expires_at),
  ],
);
export const territories = sqliteTable(
  "territories",
  { ...base(), name: text("name").notNull() },
  (t) => [identity(t)],
);
export const accounts = sqliteTable(
  "accounts",
  {
    ...base(),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    industry: text("industry").notNull(),
    owner_id: text("owner_id"),
    territory_id: text("territory_id"),
    status: text("status").notNull(),
    employees: integer("employees").notNull(),
    renewal_date: text("renewal_date"),
    priorities: text("priorities").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.owner_id],
      foreignColumns: [users.workspace_id, users.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.territory_id],
      foreignColumns: [territories.workspace_id, territories.id],
    }),
    index("idx_accounts_owner").on(t.workspace_id, t.owner_id),
  ],
);
export const contacts = sqliteTable(
  "contacts",
  {
    ...base(),
    account_id: text("account_id"),
    name: text("name").notNull(),
    email: text("email"),
    title: text("title").notNull(),
    influence: text("influence").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    index("idx_contacts_account").on(t.workspace_id, t.account_id),
  ],
);
export const stages = sqliteTable(
  "stages",
  {
    ...base(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    probability: integer("probability").notNull(),
    is_closed: integer("is_closed").notNull().default(0),
  },
  (t) => [
    identity(t),
    check("stage_probability", sql`${t.probability} BETWEEN 0 AND 100`),
  ],
);
export const opportunities = sqliteTable(
  "opportunities",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    owner_id: text("owner_id").notNull(),
    stage_id: text("stage_id").notNull(),
    name: text("name").notNull(),
    amount: integer("amount").notNull(),
    close_date: text("close_date").notNull(),
    stage_entered_at: text("stage_entered_at").notNull(),
    next_action: text("next_action"),
    forecast_category: text("forecast_category").notNull(),
    competitor: text("competitor"),
    decision_criteria: text("decision_criteria").notNull(),
    close_date_changes: integer("close_date_changes").notNull().default(0),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.owner_id],
      foreignColumns: [users.workspace_id, users.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.stage_id],
      foreignColumns: [stages.workspace_id, stages.id],
    }),
    index("idx_opportunities_account").on(t.workspace_id, t.account_id),
    index("idx_opportunities_owner_stage").on(
      t.workspace_id,
      t.owner_id,
      t.stage_id,
    ),
    check("amount_positive", sql`${t.amount} >= 0`),
  ],
);
export const stakeholders = sqliteTable(
  "stakeholders",
  {
    ...base(),
    opportunity_id: text("opportunity_id").notNull(),
    contact_id: text("contact_id").notNull(),
    role: text("role").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.opportunity_id],
      foreignColumns: [opportunities.workspace_id, opportunities.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.contact_id],
      foreignColumns: [contacts.workspace_id, contacts.id],
    }),
    uniqueIndex("unique_stakeholder").on(
      t.workspace_id,
      t.opportunity_id,
      t.contact_id,
    ),
  ],
);
export const stageHistory = sqliteTable(
  "stage_history",
  {
    ...base(),
    opportunity_id: text("opportunity_id").notNull(),
    from_stage: text("from_stage").notNull(),
    to_stage: text("to_stage").notNull(),
    actor_id: text("actor_id").notNull(),
    amount: integer("amount").notNull(),
    old_probability: integer("old_probability").notNull(),
    new_probability: integer("new_probability").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.opportunity_id],
      foreignColumns: [opportunities.workspace_id, opportunities.id],
    }),
    index("idx_history_time").on(t.workspace_id, t.created_at),
  ],
);
export const activities = sqliteTable(
  "activities",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    opportunity_id: text("opportunity_id"),
    owner_id: text("owner_id").notNull(),
    kind: text("kind").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    occurred_at: text("occurred_at").notNull(),
    sentiment: text("sentiment").notNull().default("neutral"),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.opportunity_id],
      foreignColumns: [opportunities.workspace_id, opportunities.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.owner_id],
      foreignColumns: [users.workspace_id, users.id],
    }),
    index("idx_activities_account_time").on(
      t.workspace_id,
      t.account_id,
      t.occurred_at,
    ),
  ],
);
export const tasks = sqliteTable(
  "tasks",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    owner_id: text("owner_id").notNull(),
    title: text("title").notNull(),
    due_date: text("due_date").notNull(),
    status: text("status").notNull(),
    recommendation_id: text("recommendation_id"),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.owner_id],
      foreignColumns: [users.workspace_id, users.id],
    }),
    uniqueIndex("idx_task_recommendation").on(
      t.workspace_id,
      t.recommendation_id,
    ),
  ],
);
export const notes = sqliteTable(
  "notes",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    author_id: text("author_id").notNull(),
    body: text("body").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
  ],
);
export const products = sqliteTable(
  "products",
  {
    ...base(),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    price: integer("price").notNull(),
  },
  (t) => [identity(t), uniqueIndex("unique_sku").on(t.workspace_id, t.sku)],
);
export const orders = sqliteTable(
  "orders",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    status: text("status").notNull(),
    ordered_at: text("ordered_at").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
  ],
);
export const orderLines = sqliteTable(
  "order_lines",
  {
    ...base(),
    order_id: text("order_id").notNull(),
    product_id: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    unit_price: integer("unit_price").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.order_id],
      foreignColumns: [orders.workspace_id, orders.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.product_id],
      foreignColumns: [products.workspace_id, products.id],
    }),
  ],
);
export const quotes = sqliteTable(
  "quotes",
  {
    ...base(),
    opportunity_id: text("opportunity_id").notNull(),
    status: text("status").notNull(),
    expires_at: text("expires_at").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.opportunity_id],
      foreignColumns: [opportunities.workspace_id, opportunities.id],
    }),
  ],
);
export const quoteLines = sqliteTable(
  "quote_lines",
  {
    ...base(),
    quote_id: text("quote_id").notNull(),
    product_id: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    unit_price: integer("unit_price").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.quote_id],
      foreignColumns: [quotes.workspace_id, quotes.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.product_id],
      foreignColumns: [products.workspace_id, products.id],
    }),
  ],
);
export const cases = sqliteTable(
  "cases",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    owner_id: text("owner_id").notNull(),
    subject: text("subject").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
  ],
);
export const campaigns = sqliteTable(
  "campaigns",
  {
    ...base(),
    name: text("name").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull(),
  },
  (t) => [identity(t)],
);
export const leads = sqliteTable(
  "leads",
  {
    ...base(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email"),
    owner_id: text("owner_id").notNull(),
    campaign_id: text("campaign_id"),
    status: text("status").notNull(),
    estimated_value: integer("estimated_value").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.campaign_id],
      foreignColumns: [campaigns.workspace_id, campaigns.id],
    }),
  ],
);
export const tags = sqliteTable(
  "tags",
  { ...base(), name: text("name").notNull() },
  (t) => [identity(t)],
);
export const accountTags = sqliteTable(
  "account_tags",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    tag_id: text("tag_id").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.tag_id],
      foreignColumns: [tags.workspace_id, tags.id],
    }),
  ],
);
export const dataSources = sqliteTable(
  "data_sources",
  {
    ...base(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    last_sync_at: text("last_sync_at"),
  },
  (t) => [identity(t)],
);
export const agentRuns = sqliteTable(
  "agent_runs",
  {
    ...base(),
    agent: text("agent").notNull(),
    trigger: text("trigger").notNull(),
    records_reviewed: integer("records_reviewed").notNull(),
    result: text("result").notNull(),
    confidence: text("confidence").notNull(),
    status: text("status").notNull(),
    approval_required: integer("approval_required").notNull(),
  },
  (t) => [identity(t)],
);
export const recommendations = sqliteTable(
  "recommendations",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    opportunity_id: text("opportunity_id"),
    agent: text("agent").notNull(),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    evidence: text("evidence").notNull(),
    priority: integer("priority").notNull(),
    status: text("status").notNull(),
    snoozed_until: text("snoozed_until"),
    outcome: text("outcome"),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.opportunity_id],
      foreignColumns: [opportunities.workspace_id, opportunities.id],
    }),
  ],
);
export const auditEvents = sqliteTable(
  "audit_events",
  {
    ...base(),
    actor_id: text("actor_id").notNull(),
    action: text("action").notNull(),
    entity_type: text("entity_type").notNull(),
    entity_id: text("entity_id").notNull(),
    detail: text("detail").notNull(),
    request_id: text("request_id").notNull(),
  },
  (t) => [
    identity(t),
    index("idx_audit_time").on(t.workspace_id, t.created_at),
  ],
);
export const workflowRules = sqliteTable(
  "workflow_rules",
  {
    ...base(),
    name: text("name").notNull(),
    definition: text("definition").notNull(),
    enabled: integer("enabled").notNull(),
  },
  (t) => [identity(t)],
);
export const workflowRuns = sqliteTable(
  "workflow_runs",
  {
    ...base(),
    rule_id: text("rule_id").notNull(),
    entity_id: text("entity_id").notNull(),
    result: text("result").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.rule_id],
      foreignColumns: [workflowRules.workspace_id, workflowRules.id],
    }),
  ],
);
export const notifications = sqliteTable(
  "notifications",
  {
    ...base(),
    owner_id: text("owner_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull(),
    entity_id: text("entity_id"),
  },
  (t) => [identity(t)],
);
export const qualityIssues = sqliteTable(
  "quality_issues",
  {
    ...base(),
    entity_type: text("entity_type").notNull(),
    entity_id: text("entity_id").notNull(),
    account_id: text("account_id"),
    kind: text("kind").notNull(),
    severity: text("severity").notNull(),
    description: text("description").notNull(),
    remediation: text("remediation").notNull(),
    status: text("status").notNull(),
  },
  (t) => [identity(t)],
);
export const memories = sqliteTable(
  "memories",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    summary: text("summary").notNull(),
    evidence: text("evidence").notNull(),
    method: text("method").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
  ],
);
export const aiRequests = sqliteTable(
  "ai_requests",
  {
    ...base(),
    user_id: text("user_id").notNull(),
    intent: text("intent").notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull(),
    record_count: integer("record_count").notNull(),
    duration_ms: integer("duration_ms").notNull(),
  },
  (t) => [identity(t)],
);
export const approvals = sqliteTable(
  "approvals",
  {
    ...base(),
    recommendation_id: text("recommendation_id").notNull(),
    requested_by: text("requested_by").notNull(),
    decided_by: text("decided_by"),
    status: text("status").notNull(),
    action: text("action").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.recommendation_id],
      foreignColumns: [recommendations.workspace_id, recommendations.id],
    }),
  ],
);

// A complete per-account frame holds the metrics and source state needed for
// coherent pipeline, forecast, health, risk and quality comparisons.
export const intelligenceSnapshots = sqliteTable(
  "intelligence_snapshots",
  {
    ...base(),
    account_id: text("account_id").notNull(),
    captured_at: text("captured_at").notNull(),
    capture_id: text("capture_id").notNull(),
    method: text("method").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    index("idx_snapshots_account_time").on(
      t.workspace_id,
      t.account_id,
      t.captured_at,
    ),
  ],
);
export const recommendationFeedback = sqliteTable(
  "recommendation_feedback",
  {
    ...base(),
    recommendation_id: text("recommendation_id").notNull(),
    user_id: text("user_id").notNull(),
    decision: text("decision").notNull(),
    reason_code: text("reason_code"),
    comment: text("comment"),
  },
  (t) => [
    identity(t),
    foreignKey({
      columns: [t.workspace_id, t.recommendation_id],
      foreignColumns: [recommendations.workspace_id, recommendations.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.user_id],
      foreignColumns: [users.workspace_id, users.id],
    }),
  ],
);
export const ingestionEvents = sqliteTable(
  "ingestion_events",
  {
    ...base(),
    provider: text("provider").notNull(),
    external_id: text("external_id").notNull(),
    account_id: text("account_id").notNull(),
    contact_id: text("contact_id").notNull(),
    activity_id: text("activity_id").notNull(),
    received_at: text("received_at").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    identity(t),
    uniqueIndex("idx_ingestion_idempotency").on(
      t.workspace_id,
      t.provider,
      t.external_id,
    ),
    foreignKey({
      columns: [t.workspace_id, t.account_id],
      foreignColumns: [accounts.workspace_id, accounts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.contact_id],
      foreignColumns: [contacts.workspace_id, contacts.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.activity_id],
      foreignColumns: [activities.workspace_id, activities.id],
    }),
  ],
);
export const activityContacts = sqliteTable(
  "activity_contacts",
  {
    ...base(),
    activity_id: text("activity_id").notNull(),
    contact_id: text("contact_id").notNull(),
  },
  (t) => [
    identity(t),
    uniqueIndex("idx_activity_contact").on(
      t.workspace_id,
      t.activity_id,
      t.contact_id,
    ),
    foreignKey({
      columns: [t.workspace_id, t.activity_id],
      foreignColumns: [activities.workspace_id, activities.id],
    }),
    foreignKey({
      columns: [t.workspace_id, t.contact_id],
      foreignColumns: [contacts.workspace_id, contacts.id],
    }),
  ],
);
