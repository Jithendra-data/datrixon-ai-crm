"use client";
import { useState } from "react";
import Link from "./link";
import type { ViewProps } from "./workspace";
import { Card, Metric, Badge, Empty, money, when } from "./primitives";
import {
  attribution,
  signals,
  comparisons,
  factorChanges,
  type WindowKey,
  type MetricKey,
} from "../../lib/crm/history";
import { can } from "../../lib/crm/security";
import { Recommendations } from "./revenue-views";
const windows = {
  yesterday: "Since yesterday",
  week: "Since last week",
  monday: "Since Monday",
  quarter: "Since quarter start",
};
export function HistoryPanel({
  d,
  accountId,
}: {
  d: ViewProps["d"];
  accountId?: string;
}) {
  const [window, setWindow] = useState<WindowKey>("week");
  const [metric, setMetric] = useState<MetricKey>("forecast");
  const data = accountId
    ? { ...d, accounts: d.accounts.filter((a) => a.id === accountId) }
    : d;
  const a = attribution(data, metric, window);
  return (
    <Card
      title="Why did this change?"
      eyebrow="Explain · exact contribution analysis"
    >
      <div className="inline">
        <select
          aria-label="Comparison period"
          value={window}
          onChange={(e) => setWindow(e.target.value as WindowKey)}
        >
          {Object.entries(windows).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Comparison metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
        >
          {Object.entries({
            forecast: "Quarter weighted forecast",
            pipeline: "Open pipeline",
            weighted: "Weighted pipeline",
            atRisk: "At-risk pipeline",
            paid: "Paid order value",
            won: "Closed-won value",
          }).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="metrics">
        <Metric
          label="Baseline"
          value={money(a.prior)}
          detail={`${a.covered}/${a.total} accounts compared`}
        />
        <Metric
          label="Current matched scope"
          value={money(a.current)}
          detail="Only accounts with eligible baseline"
        />
        <Metric
          label="Net change"
          value={money(a.delta)}
          detail={
            a.percentage === null
              ? "No percentage for zero baseline"
              : `${a.percentage.toFixed(1)}%`
          }
        />
      </div>
      {a.contributions.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Before</th>
                <th>After</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {a.contributions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/workspace/accounts/${c.account_id}`}>
                      {c.label}
                    </Link>
                    <small className="block">{c.reason}</small>
                  </td>
                  <td>{money(c.prior)}</td>
                  <td>{money(c.current)}</td>
                  <td>{money(c.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          {a.covered
            ? "No net changes in this comparison."
            : "No eligible historical baseline. Capture an observation and compare after the next boundary."}
        </Empty>
      )}
      <details>
        <summary>Calculation, coverage and baseline provenance</summary>
        <p>{a.limitation}</p>
        {comparisons(data, window).map((p) => (
          <p key={p.account_id}>
            {p.current.name} · {p.captured_at} · {p.method} · {p.snapshot_id}
          </p>
        ))}
      </details>
    </Card>
  );
}
export function AccountTrends({ d, id }: { d: ViewProps["d"]; id: string }) {
  const p = comparisons(d).find((p) => p.account_id === id);
  if (!p) return <Empty>No historical account baseline yet.</Empty>;
  return (
    <Card title="Relationship trajectory" eyebrow="Recorded baseline → current">
      <p>
        Health{" "}
        <b>
          {p.prior.health} → {p.current.health}
        </b>{" "}
        · {p.method} · {when(p.captured_at)}
      </p>
      {factorChanges(p.prior.healthFactors, p.current.healthFactors, -1).map(
        (f, i) => (
          <p key={i}>
            <Badge>{f.state}</Badge> {f.label} · {f.delta > 0 ? "+" : ""}
            {f.delta} points
          </p>
        ),
      )}
      <small>
        Health is clipped at 0–100; factor changes may exceed the net score
        change.
      </small>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Opportunity</th>
              <th>Risk before → now</th>
              <th>Changed factors</th>
            </tr>
          </thead>
          <tbody>
            {p.current.deals.map((o) => {
              const old = p.prior.deals.find((x) => x.id === o.id);
              return (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>
                    {old?.risk ?? "New"} → {o.risk}
                  </td>
                  <td>
                    {old
                      ? factorChanges(old.factors, o.factors)
                          .map(
                            (f) =>
                              `${f.label} (${f.delta > 0 ? "+" : ""}${f.delta})`,
                          )
                          .join("; ") || "No factor change"
                      : "No prior record"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
export default function SignalViews(p: ViewProps) {
  const { d, user, view, perform, busy } = p;
  const [window, setWindow] = useState<WindowKey>("week");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [visible, setVisible] = useState(12);
  const [importTime] = useState(() => new Date().toISOString());
  const [importResult, setImportResult] = useState("");
  if (view === "signals") {
    const all = signals(d, window);
    const items = all.filter(
      (s) =>
        (category === "All" || s.category === category) &&
        (severity === "All" || s.severity === severity),
    );
    return (
      <>
        <div className="notice">
          <Badge tone="green">Detect → Explain → Act</Badge> Changes have
          baseline evidence. Conditions describe the current state. Exposure is
          not predicted loss.
        </div>
        <div className="toolbar">
          <select
            aria-label="Signal period"
            value={window}
            onChange={(e) => setWindow(e.target.value as WindowKey)}
          >
            {Object.entries(windows).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Signal category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "All",
              "Revenue",
              "Pipeline",
              "Customer",
              "Risk",
              "Forecast",
              "Relationship",
              "Data Quality",
              "Operational",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Signal severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {["All", "high", "medium", "low"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {can(user.role, "write") && (
            <button
              className="button"
              disabled={busy}
              onClick={() => perform({ action: "capture_snapshot" })}
            >
              Capture current observation
            </button>
          )}
        </div>
        <div className="signal-grid">
          {items.slice(0, visible).map((s) => (
            <Card key={s.id} eyebrow={s.category} title={s.title}>
              <div className="inline">
                <Badge tone={s.severity === "high" ? "red" : "amber"}>
                  {s.severity}
                </Badge>
                <Badge>{s.change ? "Change" : "Current condition"}</Badge>
              </div>
              <p>{s.explanation}</p>
              {s.impact > 0 && (
                <p>
                  <b>{money(s.impact)}</b>{" "}
                  {s.category === "Forecast" || s.category === "Revenue"
                    ? "movement"
                    : "associated exposure"}
                </p>
              )}
              <p>
                <b>Next:</b> {s.action}
              </p>
              <details>
                <summary>
                  {s.evidence.length} source records · evaluated{" "}
                  {when(s.timestamp)}
                </summary>
                {s.evidence.map((e, i) => (
                  <p key={i}>
                    {e.type}/{e.id} · {e.label}
                  </p>
                ))}
              </details>
              <Link
                className="text-link"
                href={`/workspace/accounts/${s.account_id}`}
              >
                Review account →
              </Link>
            </Card>
          ))}
        </div>
        {items.length > visible && (
          <button className="button" onClick={() => setVisible(visible + 12)}>
            Show 12 more signals ({items.length - visible} remaining)
          </button>
        )}
        {!items.length && (
          <Empty>
            No matching signals. Try another category or comparison period.
          </Empty>
        )}
        <HistoryPanel d={d} />
      </>
    );
  }
  if (view === "morning") {
    const overdue = d.tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.due_date < new Date().toISOString().slice(0, 10) &&
        (user.role !== "Sales Representative" || t.owner_id === user.id),
    );
    return (
      <>
        <div className="brief-banner">
          <p className="eyebrow">
            {user.role.toUpperCase()} · PERSONAL PRIORITIES
          </p>
          <h2>Good morning, {user.name.split(" ")[0]}.</h2>
          <p>
            {overdue.length} overdue tasks and{" "}
            {signals(d).filter((s) => s.severity === "high").length}{" "}
            high-severity signals in your accessible scope. Start with these
            five ranked actions.
          </p>
        </div>
        <div className="two-col">
          <Card
            title="Your five next best actions"
            eyebrow="Act · role, exposure, ownership and urgency"
          >
            <Recommendations {...p} count={5} />
          </Card>
          <Card title="Prepare before you act">
            <p>
              {d.approvals.filter((a) => a.status === "pending").length} pending
              independent reviews.{" "}
              <Link href="/workspace/governance">Open approval queue →</Link>
            </p>
            <h3>Upcoming meetings</h3>
            {d.activities
              .filter(
                (a) =>
                  a.kind === "meeting" &&
                  a.occurred_at > new Date().toISOString(),
              )
              .slice(0, 3)
              .map((a) => (
                <p key={a.id}>
                  <Link href={`/workspace/accounts/${a.account_id}`}>
                    {a.subject}
                  </Link>{" "}
                  · {when(a.occurred_at)}
                </p>
              ))}
            {!d.activities.some(
              (a) =>
                a.kind === "meeting" &&
                a.occurred_at > new Date().toISOString(),
            ) && (
              <p>
                No upcoming meetings recorded. Calendar synchronization is not
                connected.
              </p>
            )}
            <h3>Overdue follow-ups</h3>
            {overdue.slice(0, 5).map((t) => (
              <p key={t.id}>
                <Link href={`/workspace/accounts/${t.account_id}`}>
                  {t.title}
                </Link>
                <small className="block">Overdue since {t.due_date}</small>
              </p>
            ))}
            {!overdue.length && <p>No overdue tasks in this scope.</p>}
            <Link className="button" href="/workspace/signals">
              Review Datrixon Signals
            </Link>
            <p>
              Open any Customer 360 account to generate an evidence-backed
              meeting preparation brief.
            </p>
          </Card>
        </div>
        <HistoryPanel d={d} />
      </>
    );
  }
  if (view === "value") {
    const accepted = d.recommendations.filter((r) =>
      ["accepted", "completed"].includes(r.status),
    ).length;
    const completed = d.recommendations.filter(
      (r) => r.status === "completed",
    ).length;
    return (
      <>
        <div className="metrics">
          <Metric
            label="Recommendations generated"
            value={String(d.recommendations.length)}
            detail="Unique stored recommendations"
          />
          <Metric
            label="Accepted"
            value={String(accepted)}
            detail={`${d.recommendations.length ? Math.round((100 * accepted) / d.recommendations.length) : 0}% of generated; includes completed`}
          />
          <Metric
            label="Completed"
            value={String(completed)}
            detail="Human-reported outcomes"
          />
          <Metric
            label="Questions answered"
            value={String(
              d.ai_requests.filter((a) => a.status === "completed").length,
            )}
            detail="Completed query log entries"
          />
        </div>
        <div className="two-col">
          <Card title="Operational evidence">
            <p>
              {d.memories.length} memory / meeting brief snapshots generated.
            </p>
            <p>{d.ingestion_events.length} email events captured.</p>
            <p>
              {
                d.quality_issues.filter((q) => q.kind.startsWith("duplicate"))
                  .length
              }{" "}
              duplicate findings stored.
            </p>
            <p>
              {d.recommendations.filter((r) => r.status === "dismissed").length}{" "}
              dismissed;{" "}
              {d.recommendations.filter((r) => r.status === "snoozed").length}{" "}
              snoozed.
            </p>
            <p>
              No dollar savings or time saved are claimed. Counts demonstrate
              use, not causality or model accuracy.
            </p>
          </Card>
          <Card title="Human feedback ledger">
            {d.recommendation_feedback
              .slice()
              .reverse()
              .map((f) => (
                <p key={f.id}>
                  <Badge>{f.decision}</Badge>{" "}
                  {f.reason_code || "No reason supplied"} ·{" "}
                  {f.comment || "No outcome comment"}
                  <small className="block">
                    {f.user_id} · {when(f.created_at)}
                  </small>
                </p>
              ))}
            {!d.recommendation_feedback.length && (
              <Empty>
                Decide on a recommendation to begin tracking feedback.
              </Empty>
            )}
          </Card>
        </div>
      </>
    );
  }
  if (view === "integrations")
    return (
      <div className="two-col">
        <Card
          title="Capture an email interaction"
          eyebrow="Demo boundary · no mailbox connection"
        >
          <p>
            Exact email matching, deduplication, provenance, refreshed
            structured memory and an account snapshot are committed together.
            Imported text is untrusted.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const r = await perform({
                action: "import_email",
                external_id: f.get("external_id"),
                from: f.get("from"),
                subject: f.get("subject"),
                body: f.get("body"),
                occurred_at: importTime,
              });
              if (r)
                setImportResult(
                  (r as { duplicate?: boolean }).duplicate
                    ? "This event was already captured. No duplicate activity was created."
                    : "Interaction captured. Source provenance, account memory and history have been updated.",
                );
            }}
          >
            <label>
              External event ID
              <input
                name="external_id"
                required
                defaultValue="demo-message-001"
                maxLength={120}
              />
            </label>
            <label>
              Contact email
              <input
                name="from"
                type="email"
                required
                defaultValue={
                  d.contacts.find((c) => c.account_id === "a2")?.email || ""
                }
              />
            </label>
            <label>
              Subject
              <input
                name="subject"
                required
                defaultValue="Procurement review scheduled"
                maxLength={160}
              />
            </label>
            <label>
              Message
              <textarea
                name="body"
                defaultValue="Our team would like to review the implementation plan before the next meeting."
                maxLength={2000}
              />
            </label>
            <button
              className="button primary"
              disabled={busy || !can(user.role, "write")}
            >
              Import synthetic event
            </button>
          </form>
          {importResult && <p role="status">{importResult}</p>}
        </Card>
        <Card title="Connector status">
          <Badge tone="amber">Gmail & Microsoft Graph: not connected</Badge>
          <p>
            This form simulates normalized inbound events. It does not
            authenticate a sender or read a real mailbox. Repeat event IDs with
            different content are rejected.
          </p>
          <p>
            A production connector requires OAuth consent, encrypted refresh
            tokens, webhook verification, incremental synchronization, retry
            queues and retention controls.
          </p>
          <h3>Captured events</h3>
          {d.ingestion_events.map((e) => (
            <p key={e.id}>
              <Link href={`/workspace/accounts/${e.account_id}`}>
                {e.external_id}
              </Link>{" "}
              · {e.provider} · {e.status}
            </p>
          ))}
        </Card>
      </div>
    );
  if (view === "quality") {
    const pairs = comparisons(d);
    const before = pairs.reduce((s, p) => s + p.prior.quality.length, 0),
      after = pairs.reduce((s, p) => s + p.current.quality.length, 0);
    return (
      <Card
        title="Data trust trajectory"
        eyebrow="Same-account comparison · previous week"
      >
        <p>
          <b>
            {before} → {after}
          </b>{" "}
          active rule findings across {pairs.length}/{d.accounts.length}{" "}
          accounts with a baseline. Differences reflect record changes and
          elapsed time; acknowledged findings remain active until the source is
          corrected.
        </p>
        <small>
          Synthetic scenario baselines are authored examples. Accounts without
          baseline are excluded; unlinked-contact findings are outside account
          comparisons.
        </small>
      </Card>
    );
  }
  if (view === "analytics") return <HistoryPanel d={d} />;
  return null;
}
