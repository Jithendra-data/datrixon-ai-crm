import { test } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database";
import { seedRows } from "../lib/crm/seed";
import { insert, loadData, sessionFor } from "../lib/crm/repository";
import { mutate, mutationSchema } from "../lib/crm/service";
import { hashToken, publicData } from "../lib/crm/security";
import type { Session } from "../lib/crm/types";
async function setup() {
  const { db, sql } = testDatabase();
  const now = new Date().toISOString();
  await insert(db, "workspaces", {
    id: "one",
    name: "Test synthetic",
    kind: "synthetic",
    created_at: now,
    expires_at: "2099-01-01",
  }).run();
  for (const [table, rows] of Object.entries(seedRows("one")))
    await db.batch(rows.map((row) => insert(db, table, row)));
  const d = await loadData(db, "one");
  const session: Session = {
    workspace_id: "one",
    user: d.users.find((u) => u.id === "manager")!,
    expires_at: "2099-01-01",
  };
  return { db, sql, d, session };
}
test("migrations and synthetic seeds create valid relations", async () => {
  const { sql, d } = await setup();
  assert.equal(sql.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(d.accounts.length, 12);
  assert.equal(d.opportunities.length, 24);
  sql.close();
});
test("opportunity create writes audit in same transaction", async () => {
  const { db, sql, session } = await setup();
  await mutate(
    db,
    session,
    {
      action: "create_opportunity",
      account_id: "a1",
      name: "Verified pilot",
      amount: 3500000,
      close_date: "2027-01-20",
      next_action: "Arrange evaluation",
    },
    "req1",
  );
  const d = await loadData(db, "one");
  assert.ok(d.opportunities.some((o) => o.name === "Verified pilot"));
  assert.ok(d.audit_events.some((e) => e.request_id === "req1"));
  sql.close();
});
test("update changes stage, history, forecast category and version", async () => {
  const { db, sql, session } = await setup();
  await mutate(
    db,
    session,
    {
      action: "update_opportunity",
      id: "o1",
      version: 1,
      stage_id: "won",
      next_action: "Begin onboarding",
      close_date: "2027-01-20",
    },
    "req2",
  );
  const d = await loadData(db, "one");
  const o = d.opportunities.find((o) => o.id === "o1")!;
  assert.equal(o.version, 2);
  assert.equal(o.forecast_category, "closed");
  assert.ok(
    d.stage_history.some(
      (h) => h.opportunity_id === "o1" && h.to_stage === "won",
    ),
  );
  await assert.rejects(
    () =>
      mutate(
        db,
        session,
        {
          action: "update_opportunity",
          id: "o1",
          version: 1,
          stage_id: "lost",
          next_action: "Review",
          close_date: "2027-01-20",
        },
        "req3",
      ),
    /Record changed/,
  );
  sql.close();
});
test("analyst cannot mutate via API service", async () => {
  const { db, sql, session, d } = await setup();
  await assert.rejects(
    () =>
      mutate(
        db,
        { ...session, user: d.users.find((u) => u.id === "analyst")! },
        { action: "task", id: "task-0" },
        "req",
      ),
    /role cannot/,
  );
  sql.close();
});
test("representative cannot update another owner account", async () => {
  const { db, sql, session, d } = await setup();
  await assert.rejects(
    () =>
      mutate(
        db,
        { ...session, user: d.users.find((u) => u.id === "maya")! },
        {
          action: "log_activity",
          account_id: "a2",
          kind: "call",
          subject: "Unauthorized",
          body: "Attempt",
        },
        "req",
      ),
    /not found/,
  );
  sql.close();
});
test("support cannot make commercial mutations", async () => {
  const { db, sql, session, d } = await setup();
  await assert.rejects(
    () =>
      mutate(
        db,
        { ...session, user: d.users.find((u) => u.id === "support")! },
        {
          action: "update_opportunity",
          id: "o1",
          version: 1,
          stage_id: "won",
          next_action: "Close",
          close_date: "2027-01-20",
        },
        "req",
      ),
    /Sales role required/,
  );
  sql.close();
});
test("cross-workspace foreign key injection is rejected", async () => {
  const { db, sql } = await setup();
  await insert(db, "workspaces", {
    id: "two",
    name: "Other",
    kind: "synthetic",
    created_at: "2026-01-01",
    expires_at: "2099-01-01",
  }).run();
  await assert.rejects(
    () =>
      db
        .prepare(
          "INSERT INTO contacts(workspace_id,id,created_at,updated_at,account_id,name,title,influence) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          "two",
          "bad",
          "2026-01-01",
          "2026-01-01",
          "a1",
          "Evil",
          "VP",
          "buyer",
        )
        .run(),
    /FOREIGN KEY/,
  );
  sql.close();
});
test("batch rollback leaves no orphan mutation", async () => {
  const { db, sql } = await setup();
  const count = sql.prepare("SELECT count(*) n FROM notes").get()!.n;
  await assert.rejects(() =>
    db.batch([
      db.prepare(
        "INSERT INTO notes(workspace_id,id,created_at,updated_at,account_id,author_id,body) VALUES('one','atomic','2026','2026','a1','manager','hello')",
      ),
      db.prepare(
        "INSERT INTO notes(workspace_id,id,created_at,updated_at,account_id,author_id,body) VALUES('one','invalid','2026','2026','missing','manager','bad')",
      ),
    ]),
  );
  assert.equal(sql.prepare("SELECT count(*) n FROM notes").get()!.n, count);
  sql.close();
});
test("recommendation acceptance creates one task, approval and audit", async () => {
  const { db, sql, session, d } = await setup();
  const r = d.recommendations[0];
  await mutate(
    db,
    session,
    { action: "recommendation", id: r.id, status: "accepted" },
    "accept",
  );
  await assert.rejects(
    () =>
      mutate(
        db,
        session,
        { action: "recommendation", id: r.id, status: "accepted" },
        "repeat",
      ),
    /Invalid recommendation/,
  );
  const after = await loadData(db, "one");
  assert.equal(
    after.tasks.filter((t) => t.recommendation_id === r.id).length,
    1,
  );
  assert.equal(
    after.approvals.filter((a) => a.recommendation_id === r.id).length,
    1,
  );
  await assert.rejects(
    () =>
      mutate(
        db,
        session,
        { action: "approve", id: `approval-${r.id}`, decision: "approved" },
        "self",
      ),
    /different authorized/,
  );
  sql.close();
});
test("independent reviewer approves planning request without commercial changes", async () => {
  const { db, sql, session, d } = await setup();
  const r = d.recommendations[0];
  await mutate(
    db,
    session,
    { action: "recommendation", id: r.id, status: "accepted" },
    "accept",
  );
  await mutate(
    db,
    { ...session, user: d.users.find((u) => u.id === "ceo")! },
    { action: "approve", id: `approval-${r.id}`, decision: "approved" },
    "approve",
  );
  const after = await loadData(db, "one");
  assert.equal(after.approvals[0].status, "approved");
  assert.deepEqual(after.opportunities, d.opportunities);
  sql.close();
});
test("agents are repeatable and preserve dismissed decisions", async () => {
  const { db, sql, session, d } = await setup();
  await mutate(
    db,
    session,
    {
      action: "recommendation",
      id: d.recommendations[0].id,
      status: "dismissed",
    },
    "dismiss",
  );
  await mutate(db, session, { action: "run_agents" }, "agents");
  await mutate(db, session, { action: "run_agents" }, "agents2");
  const after = await loadData(db, "one");
  assert.equal(after.recommendations.length, d.recommendations.length);
  assert.equal(
    after.recommendations.find((r) => r.id === d.recommendations[0].id)?.status,
    "dismissed",
  );
  assert.equal(after.agent_runs.length, d.agent_runs.length + 16);
  sql.close();
});
test("workflow reruns do not duplicate same-day notifications", async () => {
  const { db, sql, session } = await setup();
  await mutate(db, session, { action: "run_workflows" }, "workflow1");
  const first = await loadData(db, "one");
  await mutate(db, session, { action: "run_workflows" }, "workflow2");
  const after = await loadData(db, "one");
  assert.ok(after.notifications.length > 0);
  assert.equal(after.notifications.length, first.notifications.length);
  sql.close();
});
test("quality cannot be marked resolved while issue still exists", async () => {
  const { db, sql, session, d } = await setup();
  await assert.rejects(
    () =>
      mutate(
        db,
        session,
        { action: "quality", id: d.quality_issues[0].id, status: "resolved" },
        "quality",
      ),
    /still exists/,
  );
  sql.close();
});
test("meeting preparation persists source-backed CRM memory", async () => {
  const { db, sql, session } = await setup();
  const brief = await mutate(
    db,
    session,
    { action: "brief", account_id: "a1" },
    "brief",
  );
  assert.ok("evidence" in brief);
  assert.equal((await loadData(db, "one")).memories.length, 1);
  sql.close();
});
test("copilot logs metadata without retaining user prompt text", async () => {
  const { db, sql, session } = await setup();
  await mutate(
    db,
    session,
    { action: "ask", question: "Which deals are at risk? private-marker" },
    "ask",
  );
  const d = await loadData(db, "one");
  assert.equal(d.ai_requests.length, 1);
  assert.ok(!JSON.stringify(d.ai_requests).includes("private-marker"));
  sql.close();
});
test("session tokens are hashed, expire and reject missing cookies", async () => {
  const { db, sql } = await setup();
  await insert(db, "sessions", {
    token_hash: await hashToken("secret-token"),
    workspace_id: "one",
    user_id: "manager",
    created_at: "2026-01-01",
    expires_at: "2099-01-01",
  }).run();
  const s = await sessionFor(
    db,
    new Request("https://crm.example/api/workspace", {
      headers: { cookie: "datrixon_session=secret-token" },
    }),
  );
  assert.equal(s.user.id, "manager");
  await assert.rejects(
    () => sessionFor(db, new Request("https://crm.example")),
    /Start an isolated/,
  );
  await db.prepare("UPDATE sessions SET expires_at='2000-01-01'").run();
  await assert.rejects(
    () =>
      sessionFor(
        db,
        new Request("https://crm.example", {
          headers: { cookie: "datrixon_session=secret-token" },
        }),
      ),
    /expired/,
  );
  sql.close();
});
test("representative payload removes cross-owner evidence and global audit", async () => {
  const { sql, d } = await setup();
  const scoped = publicData(
    d,
    d.users.find((u) => u.id === "maya")!,
  );
  assert.equal(scoped.audit_events.length, 0);
  assert.equal(scoped.agent_runs.length, 0);
  assert.ok(
    scoped.order_lines.every((l) =>
      scoped.orders.some((o) => o.id === l.order_id),
    ),
  );
  assert.ok(
    scoped.opportunities.every((o) =>
      scoped.accounts.some(
        (a) => a.id === o.account_id && a.owner_id === "maya",
      ),
    ),
  );
  sql.close();
});
test("API validation rejects unknown properties, invalid dates and unsafe amounts", () => {
  assert.equal(
    mutationSchema.safeParse({ action: "run_agents", role: "Administrator" })
      .success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({
      action: "create_opportunity",
      account_id: "a1",
      name: "Bad",
      amount: -1,
      close_date: "2026-02-31",
      next_action: "Test",
    }).success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({
      action: "log_activity",
      account_id: "a1",
      kind: "script",
      subject: "x",
      body: "y",
    }).success,
    false,
  );
});
