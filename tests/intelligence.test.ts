import { test } from "node:test";
import assert from "node:assert/strict";
import { seedRows } from "../lib/crm/seed";
import type { Dataset } from "../lib/crm/types";
import { analytics, risk, health, DAY } from "../lib/crm/intelligence";
import {
  deriveRecommendations,
  quality,
  workflowMatches,
} from "../lib/crm/agents";
import { answerQuestion } from "../lib/crm/copilot";
import { tco, defaultCosts } from "../lib/crm/economics";
import { scopeData, can, requireSameOrigin } from "../lib/crm/security";
const now = new Date("2026-10-05T12:00:00Z");
const d = seedRows("test", now) as unknown as Dataset;
test("account risk questions select account health rather than deal risk", () => {
  const a = answerQuestion("Which accounts appear at risk?", d, now);
  assert.equal(a.intent, "account_risk");
  assert.ok(a.evidence.length > 0);
  assert.ok(a.evidence.every((e) => e.type === "accounts"));
});
test("seeded current stages reconcile to stage history", () => {
  for (const event of d.stage_history) {
    const o = d.opportunities.find((o) => o.id === event.opportunity_id)!;
    assert.equal(o.stage_entered_at, event.created_at);
    assert.equal(o.stage_id, event.to_stage);
  }
});
test("risk factors sum to a bounded explainable score", () => {
  const r = risk(d.opportunities[0], d, now);
  assert.equal(
    r.score,
    Math.min(
      100,
      r.factors.reduce((s, f) => s + f.points, 0),
    ),
  );
  assert.ok(r.factors.every((f) => f.source));
  assert.ok(r.score >= 50);
});
test("closed opportunities carry no open pipeline risk", () =>
  assert.equal(
    risk(
      d.opportunities.find((o) => o.stage_id === "won")!,
      d,
      now,
    ).score,
    0,
  ));
test("recent contact, valid dates, next action and stakeholders remove risk", () => {
  const o = {
    ...d.opportunities[4],
    stage_entered_at: now.toISOString(),
    close_date: "2026-12-01",
    close_date_changes: 0,
  };
  const data = {
    ...d,
    cases: [],
    stakeholders: [
      ...d.stakeholders,
      { ...d.stakeholders[0], opportunity_id: o.id, id: "extra" },
    ],
  };
  assert.equal(risk(o, data, now).score, 0);
});
test("health is transparent and a critical case reduces score", () => {
  const a = d.accounts[0];
  const h = health(a, d, now);
  const noCases = health(a, { ...d, cases: [] }, now);
  assert.equal(
    h.score,
    Math.max(0, 100 - h.factors.reduce((s, f) => s + f.points, 0)),
  );
  assert.ok(noCases.score > h.score);
});
test("pipeline and paid order metrics reconcile to independent sums", () => {
  const m = analytics(d, now);
  assert.equal(m.pipeline, 247900000);
  assert.equal(m.revenue, 151200000);
  assert.equal(m.winRate, 75);
  assert.equal(m.forecastDelta, -1500000);
});
test("empty analytics avoids divide by zero", () => {
  const empty = Object.fromEntries(
    Object.keys(d).map((k) => [k, []]),
  ) as unknown as Dataset;
  const m = analytics(empty, now);
  assert.equal(m.pipeline, 0);
  assert.equal(m.winRate, 0);
  assert.equal(m.salesCycle, 0);
});
test("quality detects intentional duplicates, orphan and missing owner", () => {
  const issues = quality(d, now);
  for (const kind of [
    "duplicate_contact",
    "duplicate_account",
    "missing_owner",
    "missing_email",
    "unlinked_contact",
    "past_close_date",
    "missing_next_action",
  ])
    assert.ok(
      issues.some((i) => i.kind === kind),
      kind,
    );
});
test("recommendations are stable and ordered by severity", () => {
  const recs = deriveRecommendations(d, now);
  assert.ok(recs.length > 0);
  assert.deepEqual(recs, deriveRecommendations(d, now));
  assert.ok(recs[0].priority >= recs.at(-1)!.priority);
});
test("workflow boundary triggers at exactly 14 days", () => {
  const o = d.opportunities[4];
  const activity = {
    ...d.activities[0],
    account_id: o.account_id,
    opportunity_id: o.id,
    occurred_at: new Date(now.getTime() - 14 * DAY).toISOString(),
  };
  assert.equal(
    workflowMatches(
      { condition: "inactive_14d", action: "notify" },
      o,
      { ...d, activities: [activity] },
      now,
    ),
    true,
  );
  assert.equal(
    workflowMatches(
      { condition: "inactive_14d", action: "notify" },
      o,
      { ...d, activities: [{ ...activity, occurred_at: now.toISOString() }] },
      now,
    ),
    false,
  );
});
test("copilot works without keys and refuses unknown intent", () => {
  assert.equal(
    answerQuestion("DELETE FROM accounts", d, now).intent,
    "unsupported",
  );
  const a = answerQuestion("Which deals are at risk?", d, now);
  assert.ok(a.evidence.length);
  assert.match(a.method, /Deterministic/);
});
test("copilot evidence never escapes representative scope", () => {
  const scoped = scopeData(
    d,
    d.users.find((u) => u.id === "maya")!,
  );
  const answer = answerQuestion("Which deals are at risk?", scoped, now);
  assert.ok(
    answer.evidence.every((e) =>
      scoped.accounts.some((a) => a.id === e.account_id),
    ),
  );
  assert.ok(!scoped.accounts.some((a) => a.owner_id === "owen"));
});
test("forecast explanation attributes exact records, not invented trend", () => {
  const a = answerQuestion("Why did forecast decline?", d, now);
  assert.equal(a.intent, "forecast_change");
  assert.equal(a.evidence.length, 4);
  assert.match(a.answer, /excludes unrecorded/);
});
test("RBAC denies analyst writes and supports manager approval", () => {
  assert.equal(can("Analyst", "write"), false);
  assert.equal(can("Sales Representative", "approve"), false);
  assert.equal(can("Sales Manager", "approve"), true);
  assert.equal(can("Invented role", "read"), false);
});
test("CSRF check rejects absent and foreign origin", () => {
  assert.throws(() =>
    requireSameOrigin(
      new Request("https://crm.example/api/actions", { method: "POST" }),
    ),
  );
  assert.throws(() =>
    requireSameOrigin(
      new Request("https://crm.example/api/actions", {
        headers: { Origin: "https://evil.example" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request("https://crm.example/api/actions", {
        headers: { Origin: "https://crm.example" },
      }),
    ),
  );
});
test("TCO includes maintenance, security, migration and recurring costs", () => {
  const r = tco(defaultCosts);
  assert.equal(r.buy, 2190000);
  assert.equal(r.build, 1646000);
  assert.ok(r.breakEven !== null && r.breakEven > 1);
  assert.equal(tco({ ...defaultCosts, maintenance: 1000000 }).breakEven, null);
});
