import test from "node:test";
import assert from "node:assert/strict";
import { seedRows } from "../lib/crm/seed";
import type { Dataset, Session } from "../lib/crm/types";
import {
  attribution,
  comparisons,
  signals,
  baselineTime,
} from "../lib/crm/history";
import { scopeData } from "../lib/crm/security";
import { answerQuestion } from "../lib/crm/copilot";
import { narrate } from "../lib/crm/narrative";
import { serverProvider } from "../lib/crm/narrative.server";
import { memoryStatus, accountMemory } from "../lib/crm/memory";
import { testDatabase } from "./database";
import { insert, loadData } from "../lib/crm/repository";
import { mutate } from "../lib/crm/service";
import { tco, defaultCosts } from "../lib/crm/economics";
const now = new Date("2026-10-05T12:00:00Z");
const data = () => seedRows("one", now) as unknown as Dataset;
async function setup() {
  const { db, sql } = testDatabase();
  await insert(db, "workspaces", {
    id: "one",
    name: "Test",
    kind: "synthetic",
    created_at: now.toISOString(),
    expires_at: "2099-01-01",
  }).run();
  for (const [table, rows] of Object.entries(seedRows("one", now)))
    await db.batch(rows.map((r) => insert(db, table, r)));
  const d = await loadData(db, "one");
  const s: Session = {
    workspace_id: "one",
    user: d.users.find((u) => u.id === "manager")!,
    expires_at: "2099-01-01",
  };
  return { db, sql, d, s };
}
test("all metric contributions reconcile exactly and scope excludes foreign frames", () => {
  const d = data();
  for (const metric of [
    "pipeline",
    "forecast",
    "paid",
    "weighted",
    "won",
    "atRisk",
  ] as const) {
    const a = attribution(d, metric, "week", now);
    assert.equal(
      a.delta,
      a.contributions.reduce((s, c) => s + c.delta, 0),
    );
    assert.equal(a.covered, 12);
  }
  const scoped = scopeData(
    d,
    d.users.find((u) => u.id === "maya")!,
  );
  assert.ok(
    comparisons(scoped, "week", now).every((p) =>
      scoped.accounts.some((a) => a.id === p.account_id),
    ),
  );
  assert.ok(
    signals(scoped, "week", now).every((s) =>
      scoped.accounts.some((a) => a.id === s.account_id),
    ),
  );
});
test("missing, future and malformed baselines fail closed without fabricated change", () => {
  const d = data();
  d.intelligence_snapshots = [];
  assert.equal(attribution(d, "forecast", "week", now).covered, 0);
  assert.match(
    answerQuestion("Why did forecast decline?", d, now).answer,
    /no eligible historical baseline/,
  );
  d.intelligence_snapshots = data().intelligence_snapshots.map((s) => ({
    ...s,
    payload: "{broken",
  }));
  assert.equal(comparisons(d, "week", now).length, 0);
  assert.equal(
    baselineTime("monday", now).toISOString(),
    "2026-10-05T00:00:00.000Z",
  );
});
test("forecast date boundary, value and stage effects reconcile to record differences", () => {
  const d = data();
  const before = attribution(d, "forecast", "week", now);
  const o = d.opportunities.find((o) => o.stage_id === "proposal")!;
  const p = d.stages.find((s) => s.id === o.stage_id)!.probability;
  const old =
    Date.parse(o.close_date) >= Date.parse("2026-10-01") &&
    Date.parse(o.close_date) < Date.parse("2027-01-01")
      ? Math.round((o.amount * p) / 100)
      : 0;
  o.close_date = "2027-01-15";
  assert.equal(
    attribution(d, "forecast", "week", now).current,
    before.current - old,
  );
});
test("structured memory detects record changes and age", () => {
  const d = data();
  const m = accountMemory(d, "a1", now);
  assert.match(
    memoryStatus(JSON.stringify({ structured: m }), d, "a1", now),
    /^Current/,
  );
  d.accounts[0].updated_at = "2026-10-06";
  assert.match(
    memoryStatus(JSON.stringify({ structured: m }), d, "a1", now),
    /^Stale/,
  );
});
test("narrative fallback rejects invented citations, numbers, timeout and provider failure", async () => {
  const a = answerQuestion("Which deals are at risk?", data(), now);
  assert.equal((await narrate(a)).status, "unconfigured");
  const citation = `${a.evidence[0].type}:${a.evidence[0].id}`;
  assert.equal(
    (
      await narrate(a, {
        name: "test",
        summarize: async () => ({
          text: "Review the recorded deal risks.",
          citations: [citation],
        }),
      })
    ).status,
    "generated",
  );
  for (const value of [
    { text: "Review risk", citations: ["accounts:foreign"] },
    { text: "Forecast declined 987654321%", citations: [citation] },
  ])
    assert.equal(
      (await narrate(a, { name: "test", summarize: async () => value })).status,
      "fallback",
    );
  assert.equal(
    (
      await narrate(
        a,
        { name: "test", summarize: async () => new Promise(() => {}) },
        5,
      )
    ).status,
    "fallback",
  );
  assert.equal(
    (
      await narrate(a, {
        name: "test",
        summarize: async () => {
          throw new Error("secret must not escape");
        },
      })
    ).reason?.includes("secret"),
    false,
  );
  assert.equal(
    serverProvider({
      AI_ENDPOINT: "http://localhost",
      AI_API_KEY: "test",
      AI_MODEL: "test",
    }),
    undefined,
  );
});
test("email import is atomic, idempotent, source-scoped and refreshes memory", async () => {
  const { db, sql, d, s } = await setup();
  const c = d.contacts.find((c) => c.account_id === "a2")!;
  const event = {
    action: "import_email",
    external_id: "mail-1",
    from: c.email,
    subject: "Review date",
    body: "Untrusted customer message",
    occurred_at: "2026-10-01T12:00:00Z",
  };
  await mutate(db, s, event, "mail");
  await mutate(db, s, event, "replay");
  const after = await loadData(db, "one");
  assert.equal(after.ingestion_events.length, 1);
  assert.equal(after.activities.length, d.activities.length + 1);
  assert.equal(after.activity_contacts.length, 1);
  assert.equal(after.memories.length, 1);
  await assert.rejects(
    () => mutate(db, s, { ...event, body: "changed" }, "collision"),
    /different content/,
  );
  await assert.rejects(
    () =>
      mutate(
        db,
        s,
        { ...event, external_id: "no-match", from: "missing@example.test" },
        "unknown",
      ),
    /exactly one/,
  );
  const rep = { ...s, user: d.users.find((u) => u.id === "maya")! };
  const foreign = d.contacts.find(
    (c) =>
      c.account_id &&
      d.accounts.find((a) => a.id === c.account_id)?.owner_id === "owen",
  )!;
  await assert.rejects(
    () =>
      mutate(
        db,
        rep,
        { ...event, external_id: "foreign", from: foreign.email },
        "scope",
      ),
    /exactly one/,
  );
  assert.equal(sql.prepare("PRAGMA foreign_key_check").all().length, 0);
  sql.close();
});
test("approval is required before internal execution and completion; feedback is durable", async () => {
  const { db, sql, d, s } = await setup();
  const id = d.recommendations[0].id;
  await mutate(
    db,
    s,
    { action: "recommendation", id, status: "accepted", reason_code: "useful" },
    "accept",
  );
  await assert.rejects(
    () =>
      mutate(
        db,
        s,
        { action: "recommendation", id, status: "completed" },
        "early",
      ),
    /approved plan/,
  );
  await assert.rejects(
    () =>
      mutate(
        db,
        s,
        { action: "execute_plan", id: `approval-${id}` },
        "early-start",
      ),
    /approval/,
  );
  await mutate(
    db,
    { ...s, user: d.users.find((u) => u.id === "ceo")! },
    { action: "approve", id: `approval-${id}`, decision: "approved" },
    "approve",
  );
  await mutate(
    db,
    s,
    { action: "execute_plan", id: `approval-${id}` },
    "execute",
  );
  await mutate(
    db,
    s,
    { action: "recommendation", id, status: "completed", outcome: "Reviewed" },
    "complete",
  );
  const after = await loadData(db, "one");
  assert.equal(after.recommendation_feedback.length, 2);
  assert.equal(
    after.tasks.find((t) => t.recommendation_id === id)?.status,
    "completed",
  );
  sql.close();
});
test("five-year growth scenario compounds and reports horizon-limited break-even", () => {
  const base = tco(defaultCosts, 5),
    grown = tco(
      { ...defaultCosts, seatGrowth: 10, licenseGrowth: 5, buildGrowth: 3 },
      5,
    );
  assert.equal(grown.years.length, 5);
  assert.ok(grown.buy > base.buy);
  assert.ok(grown.build > base.build);
  assert.equal(
    tco({ ...defaultCosts, maintenance: 1000000 }, 5).breakEven,
    null,
  );
});

test("explicit buyer-linked deal interaction resolves coverage; account-only activity does not", async () => {
  const { db, sql, d, s } = await setup();
  const o = d.opportunities.find((o) => o.id === "o2")!;
  const ids = d.stakeholders
    .filter((x) => x.opportunity_id === o.id)
    .map((x) => x.contact_id);
  const c = d.contacts.find(
    (c) =>
      ids.includes(c.id) && /economic buyer|decision maker/.test(c.influence),
  )!;
  assert.ok(
    signals(d, "week", new Date()).some(
      (x) => x.category === "Relationship" && x.entity_id === o.id,
    ),
  );
  await mutate(
    db,
    s,
    {
      action: "log_activity",
      account_id: o.account_id,
      opportunity_id: o.id,
      contact_id: c.id,
      kind: "meeting",
      subject: "Buyer review",
      body: "Buying criteria confirmed",
    },
    "buyer",
  );
  const after = await loadData(db, "one");
  assert.ok(
    !signals(after, "week", new Date()).some(
      (x) => x.category === "Relationship" && x.entity_id === o.id,
    ),
  );
  sql.close();
});
test("server narration has an atomic daily budget and logs safe metadata", async () => {
  const { db, sql, s } = await setup();
  let calls = 0;
  const provider = {
    name: "fixture",
    summarize: async (a: ReturnType<typeof answerQuestion>) => {
      calls++;
      return {
        text: "Review the recorded risks.",
        citations: [`${a.evidence[0].type}:${a.evidence[0].id}`],
      };
    },
  };
  for (let i = 0; i < 21; i++)
    await mutate(
      db,
      s,
      { action: "ask", question: "Which deals are at risk?", narrate: true },
      `q${i}`,
      provider,
    );
  assert.equal(calls, 20);
  const after = await loadData(db, "one");
  assert.equal(after.ai_requests.length, 21);
  assert.ok(
    after.ai_requests.some((a) => a.metadata.includes("budget reached")),
  );
  sql.close();
});
