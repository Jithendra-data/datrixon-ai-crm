import { z } from "zod";
import { type Database, loadData, insert, baseRow, audit } from "./repository";
import { authorize, AppError, scopeData } from "./security";
import type { Session } from "./types";
import {
  agentCatalog,
  deriveRecommendations,
  quality,
  workflowMatches,
  type WorkflowDefinition,
} from "./agents";
import { accountBrief, analytics, DAY } from "./intelligence";
import { answerQuestion } from "./copilot";
const text = z.string().trim().min(1).max(2000);
const id = z.string().min(1).max(100);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid calendar date");
export const mutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create_opportunity"),
      account_id: id,
      name: text.max(160),
      amount: z.number().int().min(0).max(100000000000),
      close_date: date,
      next_action: text.max(400),
    })
    .strict(),
  z
    .object({
      action: z.literal("update_opportunity"),
      id,
      version: z.number().int().positive(),
      stage_id: z.enum([
        "discovery",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ]),
      next_action: text.max(400),
      close_date: date,
    })
    .strict(),
  z
    .object({
      action: z.literal("log_activity"),
      account_id: id,
      opportunity_id: id.nullable().optional(),
      kind: z.enum(["call", "email", "meeting", "note"]),
      subject: text.max(160),
      body: text,
    })
    .strict(),
  z
    .object({
      action: z.literal("recommendation"),
      id,
      status: z.enum(["accepted", "dismissed", "snoozed", "completed"]),
      outcome: z.string().max(500).optional(),
    })
    .strict(),
  z.object({ action: z.literal("task"), id }).strict(),
  z.object({ action: z.literal("notification"), id }).strict(),
  z
    .object({
      action: z.literal("quality"),
      id,
      status: z.enum(["acknowledged", "resolved"]),
    })
    .strict(),
  z.object({ action: z.literal("run_agents") }).strict(),
  z.object({ action: z.literal("run_workflows") }).strict(),
  z.object({ action: z.literal("brief"), account_id: id }).strict(),
  z.object({ action: z.literal("ask"), question: text.max(1000) }).strict(),
  z
    .object({ action: z.literal("workflow"), id, enabled: z.boolean() })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      id,
      decision: z.enum(["approved", "rejected"]),
    })
    .strict(),
]);
export async function mutate(
  db: Database,
  s: Session,
  input: unknown,
  requestId: string,
) {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(
      400,
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  const b = parsed.data;
  const action =
    b.action === "approve"
      ? "approve"
      : b.action === "workflow"
        ? "govern"
        : ["run_agents", "run_workflows"].includes(b.action)
          ? "run_agents"
          : ["ask", "brief"].includes(b.action)
            ? "read"
            : "write";
  authorize(s.user, action);
  const all = await loadData(db, s.workspace_id);
  const d = scopeData(all, s.user);
  const now = new Date().toISOString();
  const statements = [];
  const account = (aid: string) => {
    const a = d.accounts.find((a) => a.id === aid);
    if (!a) throw new AppError(404, "Account not found in your scope.");
    return a;
  };
  const addAudit = (entity: string, entityId: string, detail: string) =>
    statements.push(
      audit(db, s, b.action, entity, entityId, detail, requestId),
    );
  if (b.action === "create_opportunity") {
    const a = account(b.account_id);
    if (["Support", "Customer Success"].includes(s.user.role))
      throw new AppError(403, "Sales role required for commercial changes.");
    const oid = crypto.randomUUID();
    statements.push(
      insert(db, "opportunities", {
        ...baseRow(s.workspace_id, oid),
        account_id: a.id,
        owner_id: a.owner_id || s.user.id,
        stage_id: "discovery",
        name: b.name,
        amount: b.amount,
        close_date: b.close_date,
        stage_entered_at: now,
        next_action: b.next_action,
        forecast_category: "pipeline",
        competitor: null,
        decision_criteria: "Not yet confirmed",
        close_date_changes: 0,
        version: 1,
      }),
    );
    addAudit(
      "opportunities",
      oid,
      "Created in discovery; amount in USD cents.",
    );
  } else if (b.action === "update_opportunity") {
    if (["Support", "Customer Success"].includes(s.user.role))
      throw new AppError(403, "Sales role required for commercial changes.");
    const o = d.opportunities.find((o) => o.id === b.id);
    if (!o) throw new AppError(404, "Opportunity not found.");
    if (o.version !== b.version)
      throw new AppError(409, "Record changed. Refresh before updating.");
    const stamp = JSON.stringify({ request_id: requestId });
    const update = db
      .prepare(
        "UPDATE opportunities SET stage_id=?,stage_entered_at=?,next_action=?,close_date=?,close_date_changes=?,forecast_category=?,version=version+1,updated_at=?,metadata=? WHERE workspace_id=? AND id=? AND version=?",
      )
      .bind(
        b.stage_id,
        o.stage_id === b.stage_id ? o.stage_entered_at : now,
        b.next_action,
        b.close_date,
        o.close_date_changes + (o.close_date !== b.close_date ? 1 : 0),
        b.stage_id === "won"
          ? "closed"
          : b.stage_id === "lost"
            ? "omitted"
            : o.forecast_category === "closed" ||
                o.forecast_category === "omitted"
              ? "pipeline"
              : o.forecast_category,
        now,
        stamp,
        s.workspace_id,
        o.id,
        b.version,
      );
    const gated = (
      table: string,
      row: Record<string, string | number | null>,
    ) => {
      const cols = Object.keys(row);
      return db
        .prepare(
          `INSERT INTO ${table} (${cols.join(",")}) SELECT ${cols.map(() => "?").join(",")} WHERE EXISTS (SELECT 1 FROM opportunities WHERE workspace_id=? AND id=? AND metadata=?)`,
        )
        .bind(...Object.values(row), s.workspace_id, o.id, stamp);
    };
    const batch = [
      update,
      gated("audit_events", {
        ...baseRow(s.workspace_id),
        actor_id: s.user.id,
        action: "opportunity.updated",
        entity_type: "opportunities",
        entity_id: o.id,
        detail: JSON.stringify({
          before: {
            stage: o.stage_id,
            close: o.close_date,
            next: o.next_action,
          },
          after: {
            stage: b.stage_id,
            close: b.close_date,
            next: b.next_action,
          },
        }),
        request_id: requestId,
      }),
    ];
    if (o.stage_id !== b.stage_id)
      batch.push(
        gated("stage_history", {
          ...baseRow(s.workspace_id),
          opportunity_id: o.id,
          from_stage: o.stage_id,
          to_stage: b.stage_id,
          actor_id: s.user.id,
          amount: o.amount,
          old_probability: d.stages.find((x) => x.id === o.stage_id)!
            .probability,
          new_probability: d.stages.find((x) => x.id === b.stage_id)!
            .probability,
        }),
      );
    const result = (await db.batch(batch)) as { meta?: { changes?: number } }[];
    if (result[0]?.meta?.changes === 0)
      throw new AppError(409, "Concurrent update detected. Refresh and retry.");
    return { ok: true };
  } else if (b.action === "log_activity") {
    account(b.account_id);
    if (
      b.opportunity_id &&
      !d.opportunities.some(
        (o) => o.id === b.opportunity_id && o.account_id === b.account_id,
      )
    )
      throw new AppError(400, "Opportunity must belong to this account.");
    const aid = crypto.randomUUID();
    statements.push(
      insert(db, "activities", {
        ...baseRow(s.workspace_id, aid),
        account_id: b.account_id,
        opportunity_id: b.opportunity_id || null,
        owner_id: s.user.id,
        kind: b.kind,
        subject: b.subject,
        body: b.body,
        occurred_at: now,
        sentiment: "neutral",
      }),
    );
    addAudit(
      "activities",
      aid,
      "Human logged activity; no external message sent.",
    );
  } else if (b.action === "recommendation") {
    const r = d.recommendations.find((r) => r.id === b.id);
    if (!r) throw new AppError(404, "Recommendation not found.");
    const allowed: Record<string, string[]> = {
      pending: ["accepted", "dismissed", "snoozed"],
      snoozed: ["accepted", "dismissed", "snoozed"],
      accepted: ["completed"],
      dismissed: [],
      completed: [],
    };
    if (!allowed[r.status]?.includes(b.status))
      throw new AppError(409, "Invalid recommendation transition.");
    const stamp = JSON.stringify({ request_id: requestId });
    statements.push(
      db
        .prepare(
          "UPDATE recommendations SET status=?,snoozed_until=?,outcome=?,updated_at=?,metadata=? WHERE workspace_id=? AND id=? AND status=?",
        )
        .bind(
          b.status,
          b.status === "snoozed"
            ? new Date(Date.now() + 7 * DAY).toISOString()
            : null,
          b.outcome || null,
          now,
          stamp,
          s.workspace_id,
          r.id,
          r.status,
        ),
    );
    const gated = (
      table: string,
      row: Record<string, string | number | null>,
    ) => {
      const cols = Object.keys(row);
      return db
        .prepare(
          `INSERT OR IGNORE INTO ${table} (${cols.join(",")}) SELECT ${cols.map(() => "?").join(",")} WHERE EXISTS (SELECT 1 FROM recommendations WHERE workspace_id=? AND id=? AND metadata=?)`,
        )
        .bind(...Object.values(row), s.workspace_id, r.id, stamp);
    };
    if (b.status === "accepted") {
      statements.push(
        gated("tasks", {
          ...baseRow(s.workspace_id, `rec-task-${r.id}`),
          account_id: r.account_id,
          owner_id: s.user.id,
          title: r.title,
          due_date: new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10),
          status: "open",
          recommendation_id: r.id,
        }),
      );
      statements.push(
        gated("approvals", {
          ...baseRow(s.workspace_id, `approval-${r.id}`),
          recommendation_id: r.id,
          requested_by: s.user.id,
          decided_by: null,
          status: "pending",
          action:
            "Authorize follow-up planning task; no external communication or commercial mutation",
        }),
      );
    }
    if (b.status === "completed")
      statements.push(
        db
          .prepare(
            "UPDATE tasks SET status='completed',updated_at=? WHERE workspace_id=? AND recommendation_id=? AND EXISTS (SELECT 1 FROM recommendations WHERE workspace_id=? AND id=? AND metadata=?)",
          )
          .bind(now, s.workspace_id, r.id, s.workspace_id, r.id, stamp),
      );
    statements.push(
      gated("audit_events", {
        ...baseRow(s.workspace_id),
        actor_id: s.user.id,
        action: `recommendation.${b.status}`,
        entity_type: "recommendations",
        entity_id: r.id,
        detail: b.outcome || "Human decision; no commercial fields changed.",
        request_id: requestId,
      }),
    );
  } else if (
    b.action === "task" ||
    b.action === "notification" ||
    b.action === "quality"
  ) {
    const table =
      b.action === "task"
        ? "tasks"
        : b.action === "notification"
          ? "notifications"
          : "quality_issues";
    if (!d[table].some((x) => x.id === b.id))
      throw new AppError(404, "Record not found.");
    if (
      b.action === "quality" &&
      b.status === "resolved" &&
      quality(d).some((x) => x.id === b.id)
    )
      throw new AppError(
        409,
        "The underlying data issue still exists. Correct the source record before resolving.",
      );
    const status =
      b.action === "task"
        ? "completed"
        : b.action === "notification"
          ? "read"
          : b.status;
    statements.push(
      db
        .prepare(
          `UPDATE ${table} SET status=?,updated_at=? WHERE workspace_id=? AND id=?`,
        )
        .bind(status, now, s.workspace_id, b.id),
    );
    addAudit(table, b.id, status);
  } else if (b.action === "workflow") {
    if (!d.workflow_rules.some((x) => x.id === b.id))
      throw new AppError(404, "Workflow not found.");
    statements.push(
      db
        .prepare(
          "UPDATE workflow_rules SET enabled=?,updated_at=? WHERE workspace_id=? AND id=?",
        )
        .bind(b.enabled ? 1 : 0, now, s.workspace_id, b.id),
    );
    addAudit("workflow_rules", b.id, b.enabled ? "enabled" : "disabled");
  } else if (b.action === "approve") {
    const approval = d.approvals.find((a) => a.id === b.id);
    if (!approval) throw new AppError(404, "Approval not found.");
    if (approval.status !== "pending")
      throw new AppError(409, "Approval already decided.");
    if (approval.requested_by === s.user.id)
      throw new AppError(
        403,
        "A different authorized reviewer must decide this request.",
      );
    statements.push(
      db
        .prepare(
          "UPDATE approvals SET status=?,decided_by=?,updated_at=?,metadata=? WHERE workspace_id=? AND id=? AND status='pending'",
        )
        .bind(b.decision, s.user.id, now, requestId, s.workspace_id, b.id),
    );
    const event = {
      ...baseRow(s.workspace_id),
      actor_id: s.user.id,
      action: "approval." + b.decision,
      entity_type: "approvals",
      entity_id: b.id,
      detail: "Planning decision only; no external action executed.",
      request_id: requestId,
    };
    const columns = Object.keys(event);
    statements.push(
      db
        .prepare(
          `INSERT INTO audit_events (${columns.join(",")}) SELECT ${columns.map(() => "?").join(",")} WHERE EXISTS (SELECT 1 FROM approvals WHERE workspace_id=? AND id=? AND metadata=?)`,
        )
        .bind(...Object.values(event), s.workspace_id, b.id, requestId),
    );
  } else if (b.action === "run_agents") {
    const recs = deriveRecommendations(d);
    for (const r of recs)
      statements.push(
        insert(
          db,
          "recommendations",
          {
            ...baseRow(s.workspace_id, r.id),
            ...r,
            status: "pending",
            snoozed_until: null,
            outcome: null,
          },
          true,
        ),
      );
    const issues = quality(d);
    for (const issue of issues)
      statements.push(
        insert(
          db,
          "quality_issues",
          { ...baseRow(s.workspace_id, issue.id), ...issue, status: "open" },
          true,
        ),
      );
    const forecasts = analytics(d);
    for (const agent of agentCatalog) {
      let result = `${recs.filter((r) => r.agent === agent.name).length} recommendations currently match this agent's rules.`;
      let reviewed = d.opportunities.length;
      if (agent.name === "Customer Health") reviewed = d.accounts.length;
      if (agent.name === "CRM Data Quality")
        reviewed =
          d.accounts.length + d.contacts.length + d.opportunities.length;
      if (agent.name === "Duplicate Detection") {
        result = `${issues.filter((i) => i.kind.startsWith("duplicate")).length} duplicate candidates; no merges performed.`;
        reviewed = d.accounts.length + d.contacts.length;
      }
      if (
        agent.name === "CRM Data Quality" ||
        agent.name === "Pipeline Hygiene"
      )
        result = `${issues.filter((i) => agent.name === "CRM Data Quality" || i.entity_type === "opportunities").length} data quality findings.`;
      if (agent.name === "Lead Qualification") {
        reviewed = d.leads.length;
        result = d.leads
          .map(
            (l) =>
              `${l.company}: ${l.email ? 40 : 0} completeness points + ${Math.min(60, Math.floor(l.estimated_value / 1000000) * 5)} commercial points; ${l.email ? "email recorded" : "missing email"}`,
          )
          .join("; ");
      }
      if (agent.name === "Forecast")
        result = `Weighted pipeline ${forecasts.weighted / 100} USD. Stage-history delta over 7 days: ${forecasts.forecastDelta / 100} USD; no calibrated prediction.`;
      statements.push(
        insert(db, "agent_runs", {
          ...baseRow(s.workspace_id),
          agent: agent.name,
          trigger: `manual:${s.user.id}`,
          records_reviewed: reviewed,
          result,
          confidence: "Deterministic rules; not a statistical probability",
          status: "completed",
          approval_required: 1,
        }),
      );
    }
    addAudit(
      "agent_runs",
      "batch",
      `${recs.length} recommendation candidates, ${issues.length} quality findings; existing decisions preserved.`,
    );
  } else if (b.action === "run_workflows") {
    for (const rule of d.workflow_rules.filter((r) => r.enabled)) {
      const def = JSON.parse(rule.definition) as WorkflowDefinition;
      for (const o of d.opportunities.filter((o) =>
        workflowMatches(def, o, d),
      )) {
        const key = `${rule.id}-${o.id}-${now.slice(0, 10)}`;
        statements.push(
          insert(
            db,
            "workflow_runs",
            {
              ...baseRow(s.workspace_id, key),
              rule_id: rule.id,
              entity_id: o.id,
              result:
                def.action === "notify"
                  ? "Notification created"
                  : "Review task created",
              status: "completed",
            },
            true,
          ),
        );
        if (def.action === "notify")
          statements.push(
            insert(
              db,
              "notifications",
              {
                ...baseRow(s.workspace_id, key),
                owner_id: o.owner_id,
                title: rule.name,
                body: o.name,
                status: "unread",
                entity_id: o.id,
              },
              true,
            ),
          );
        else
          statements.push(
            insert(
              db,
              "tasks",
              {
                ...baseRow(s.workspace_id, key),
                account_id: o.account_id,
                owner_id: "manager",
                title: `Manager review: ${o.name}`,
                due_date: now.slice(0, 10),
                status: "open",
                recommendation_id: null,
              },
              true,
            ),
          );
      }
    }
    addAudit(
      "workflow_runs",
      "batch",
      "Executed enabled allow-listed workflow rules; daily idempotency keys.",
    );
  } else if (b.action === "brief") {
    const a = account(b.account_id);
    const brief = accountBrief(a, d);
    statements.push(
      insert(db, "memories", {
        ...baseRow(s.workspace_id),
        account_id: a.id,
        summary: brief.summary,
        evidence: JSON.stringify(brief.evidence),
        method: brief.method,
      }),
    );
    addAudit(
      "memories",
      a.id,
      "Generated evidence-backed deterministic meeting brief.",
    );
    await db.batch(statements);
    return brief;
  } else if (b.action === "ask") {
    const start = Date.now();
    const result = answerQuestion(b.question, d);
    statements.push(
      insert(db, "ai_requests", {
        ...baseRow(s.workspace_id),
        user_id: s.user.id,
        intent: result.intent,
        status: result.intent === "unsupported" ? "unsupported" : "completed",
        provider: "deterministic",
        record_count: result.evidence.length,
        duration_ms: Date.now() - start,
      }),
    );
    addAudit(
      "ai_requests",
      result.intent,
      "Approved semantic query executed; prompt content excluded from logs.",
    );
    await db.batch(statements);
    return result;
  }
  // D1 batch is atomic: mutations and their audit events commit together.
  const result = (await db.batch(statements)) as {
    meta?: { changes?: number };
  }[];
  if (
    (b.action === "approve" || b.action === "recommendation") &&
    result[0]?.meta?.changes === 0
  )
    throw new AppError(
      409,
      "Concurrent decision detected. Refresh before retrying.",
    );
  return { ok: true };
}
