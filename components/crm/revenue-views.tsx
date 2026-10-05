"use client";
import Link from "./link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Activity,
  Sparkles,
  Search,
} from "lucide-react";
import {
  Card,
  Metric,
  Badge,
  Empty,
  ScoreBar,
  money,
  compact,
  when,
} from "./primitives";
import {
  health,
  risk,
  lastContact,
  daysSince,
  isOpen,
} from "../../lib/crm/intelligence";
import { can } from "../../lib/crm/security";
import type { ViewProps } from "./workspace";
export function Recommendations({
  d,
  user,
  busy,
  perform,
  count = 5,
}: Pick<ViewProps, "d" | "user" | "busy" | "perform"> & { count?: number }) {
  const pending = d.recommendations
    .filter(
      (r) =>
        r.status === "pending" ||
        (r.status === "snoozed" &&
          !!r.snoozed_until &&
          r.snoozed_until <= new Date().toISOString()),
    )
    .sort((a, b) => b.priority - a.priority);
  return (
    <div className="recommendations">
      {pending.slice(0, count).map((r) => (
        <div className="recommendation" key={r.id}>
          <div className="priority-marker">{r.priority}</div>
          <div className="grow">
            <Link href={`/workspace/accounts/${r.account_id}`}>
              <b>{r.title}</b>
            </Link>
            <p>{r.reason}</p>
            <div className="inline">
              <Badge>{r.agent}</Badge>
              <small>Rule-generated recommendation</small>
            </div>
          </div>
          {can(user.role, "write") && (
            <div className="action-stack">
              <button
                disabled={busy}
                onClick={() =>
                  perform({
                    action: "recommendation",
                    id: r.id,
                    status: "accepted",
                  })
                }
              >
                Accept
              </button>
              <button
                className="quiet"
                disabled={busy}
                onClick={() =>
                  perform({
                    action: "recommendation",
                    id: r.id,
                    status: "snoozed",
                  })
                }
              >
                Snooze 7d
              </button>
              <button
                className="quiet"
                disabled={busy}
                onClick={() =>
                  perform({
                    action: "recommendation",
                    id: r.id,
                    status: "dismissed",
                  })
                }
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
      {!pending.length && (
        <Empty>
          No pending recommendations. Run agents to review current records.
        </Empty>
      )}
    </div>
  );
}
export default function RevenueViews(p: ViewProps) {
  const { d, user, m, view, busy, perform, openDeal, explain } = p;
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("board");
  const accountName = (id: string) =>
    d.accounts.find((a) => a.id === id)?.name || "Account";
  if (view === "overview")
    return (
      <>
        <div className="metrics">
          <Metric
            label="Open pipeline"
            value={compact(m.pipeline)}
            detail={`${m.openCount} open opportunities`}
            onClick={() => explain("Pipeline")}
          />
          <Metric
            label="Weighted pipeline"
            value={compact(m.weighted)}
            detail="Stage-weighted · all close dates"
            onClick={() => explain("Weighted")}
          />
          <Metric
            label="Paid order value"
            value={compact(m.revenue)}
            detail="Historical · not recognized revenue"
            onClick={() => explain("Revenue")}
          />
          <Metric
            label="At-risk pipeline"
            value={compact(m.atRisk)}
            detail="Risk score ≥ 50 / 100"
            onClick={() => explain("Risk")}
          />
        </div>
        <section className="executive-brief">
          <div className="brief-icon">
            <Sparkles size={23} />
          </div>
          <div>
            <div className="inline">
              <h2>The executive brief</h2>
              <Badge tone="green">Computed from CRM records</Badge>
            </div>
            <p>
              Your open pipeline stands at <b>{money(m.pipeline)}</b>. Recorded
              stage movements contributed <b>{money(m.forecastDelta)}</b> to
              weighted pipeline in the last seven days. <b>{money(m.stale)}</b>{" "}
              has no recorded customer contact in at least 14 days.
            </p>
            <Link href="/workspace/signals">
              See what changed <ArrowRight size={15} />
            </Link>
          </div>
          <span className="brief-watermark">✳</span>
        </section>
        <div className="dashboard-grid">
          <Card
            title="What deserves attention"
            eyebrow="NEXT BEST ACTION"
            action={
              <Link href="/workspace/morning">
                View all <ArrowUpRight size={14} />
              </Link>
            }
          >
            <Recommendations {...p} count={4} />
          </Card>
          <Card title="Pipeline composition" eyebrow="CURRENT STATE">
            <div className="stage-bars">
              {m.stages
                .filter((s) => !s.is_closed)
                .map((s, i) => (
                  <div key={s.id}>
                    <div>
                      <span>
                        <i
                          style={{
                            background: [
                              "#b8c8ec",
                              "#8aa8db",
                              "#537cc5",
                              "#244c92",
                            ][i],
                          }}
                        />
                        {s.name}
                      </span>
                      <b>{compact(s.value)}</b>
                    </div>
                    <div className="bar-track">
                      <i
                        style={{
                          width: `${m.pipeline ? (s.value / m.pipeline) * 100 : 0}%`,
                          background: [
                            "#b8c8ec",
                            "#8aa8db",
                            "#537cc5",
                            "#244c92",
                          ][i],
                        }}
                      />
                    </div>
                    <small>{s.count} opportunities</small>
                  </div>
                ))}
            </div>
            <div className="card-bottom">
              <span>Win rate</span>
              <b>{m.winRate}%</b>
              <small>{m.salesCycle} day average won sales cycle</small>
            </div>
          </Card>
          <Card title="Relationship health" eyebrow="CUSTOMER SIGNALS">
            <div className="health-overview">
              {[
                ["Healthy", 75, 101, "green"],
                ["Watch", 50, 75, "amber"],
                ["At risk", 0, 50, "red"],
              ].map(([label, low, high, tone]) => (
                <div key={String(label)}>
                  <strong className={String(tone)}>
                    {
                      m.health.filter(
                        (h) => h.score >= Number(low) && h.score < Number(high),
                      ).length
                    }
                  </strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            {[...m.health]
              .sort((a, b) => a.score - b.score)
              .slice(0, 4)
              .map((h) => (
                <Link
                  className="health-row"
                  key={h.id}
                  href={`/workspace/accounts/${h.id}`}
                >
                  <span>{h.name}</span>
                  <ScoreBar score={h.score} kind="health" />
                </Link>
              ))}
          </Card>
          <Card
            title="Latest changes"
            eyebrow="EVIDENCE, NOT GUESSWORK"
            action={
              <Link href="/workspace/signals">
                Explore <ArrowUpRight size={14} />
              </Link>
            }
          >
            {m.movement.slice(0, 3).map((h) => (
              <div className="signal-row" key={h.id}>
                <div className={`signal-icon ${h.delta < 0 ? "red" : "green"}`}>
                  <Activity size={18} />
                </div>
                <div>
                  <b>
                    {
                      d.opportunities.find((o) => o.id === h.opportunity_id)
                        ?.name
                    }
                  </b>
                  <p>
                    {h.from_stage} → {h.to_stage}
                  </p>
                </div>
                <strong className={h.delta < 0 ? "red" : "green"}>
                  {h.delta > 0 ? "+" : ""}
                  {compact(h.delta)}
                </strong>
              </div>
            ))}
            <p className="muted">
              Weighted-value contribution from stage changes, trailing 7 days.
            </p>
          </Card>
        </div>
      </>
    );
  if (view === "morning")
    return (
      <div className="two-col">
        <Card title="Your priorities" eyebrow="ORDERED BY DETERMINISTIC SCORE">
          <Recommendations {...p} count={10} />
        </Card>
        <div>
          <Card title="Tasks needing attention">
            {d.tasks
              .filter((t) => t.status !== "completed")
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .slice(0, 10)
              .map((t) => (
                <div className="list-row" key={t.id}>
                  <div>
                    <b>{t.title}</b>
                    <small
                      className={
                        t.due_date < new Date().toISOString().slice(0, 10)
                          ? "red"
                          : ""
                      }
                    >
                      Due {t.due_date} ·{" "}
                      {d.users.find((u) => u.id === t.owner_id)?.name}
                    </small>
                  </div>
                  {can(user.role, "write") && (
                    <button
                      disabled={busy}
                      onClick={() => perform({ action: "task", id: t.id })}
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
          </Card>
          <Card title="Accepted recommendations">
            {d.recommendations
              .filter((r) => r.status === "accepted")
              .map((r) => (
                <div className="list-row" key={r.id}>
                  <div>
                    <b>{r.title}</b>
                    <small>Accepted by a person · planning task created</small>
                  </div>
                  {can(user.role, "write") && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        perform({
                          action: "recommendation",
                          id: r.id,
                          status: "completed",
                          outcome:
                            "Marked complete by user; no external outcome verified",
                        })
                      }
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
          </Card>
        </div>
      </div>
    );
  if (view === "accounts")
    return (
      <Card
        title="Account directory"
        action={
          <label className="inline">
            <Search size={16} />
            <input
              aria-label="Filter accounts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by company or industry"
            />
          </label>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Owner</th>
                <th>Relationship health</th>
                <th>Open pipeline</th>
                <th>Last contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.accounts
                .filter((a) =>
                  `${a.name} ${a.industry}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((a) => {
                  const h = health(a, d);
                  const last = lastContact(d, a.id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link
                          className="account-cell"
                          href={`/workspace/accounts/${a.id}`}
                        >
                          <span className="company-icon">
                            {a.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <b>{a.name}</b>
                            <small>{a.industry}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {d.users.find((u) => u.id === a.owner_id)?.name ||
                          "Unassigned"}
                      </td>
                      <td>
                        <ScoreBar score={h.score} kind="health" />
                      </td>
                      <td>
                        {compact(
                          d.opportunities
                            .filter((o) => o.account_id === a.id && isOpen(o))
                            .reduce((s, o) => s + o.amount, 0),
                        )}
                      </td>
                      <td>
                        {last
                          ? `${daysSince(last.occurred_at)} days ago`
                          : "No contact"}
                      </td>
                      <td>
                        <Link
                          aria-label={`Open ${a.name}`}
                          href={`/workspace/accounts/${a.id}`}
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  if (view === "pipeline")
    return (
      <>
        <div className="toolbar">
          <div className="segmented">
            <button
              className={mode === "board" ? "active" : ""}
              onClick={() => setMode("board")}
            >
              Board
            </button>
            <button
              className={mode === "table" ? "active" : ""}
              onClick={() => setMode("table")}
            >
              Analytical view
            </button>
          </div>
          <span>
            {compact(m.pipeline)} open · {compact(m.commit)} commit · Select a
            deal to inspect risk and update
          </span>
        </div>
        {mode === "board" ? (
          <div className="kanban">
            {d.stages
              .filter((s) => !s.is_closed)
              .map((s) => (
                <section className="kanban-column" key={s.id}>
                  <header>
                    <b>{s.name}</b>
                    <Badge>
                      {
                        d.opportunities.filter((o) => o.stage_id === s.id)
                          .length
                      }
                    </Badge>
                    <strong>
                      {compact(m.stages.find((x) => x.id === s.id)?.value || 0)}
                    </strong>
                  </header>
                  {d.opportunities
                    .filter((o) => o.stage_id === s.id)
                    .map((o) => {
                      const r = risk(o, d);
                      return (
                        <button
                          className="deal-card"
                          key={o.id}
                          onClick={() => openDeal(o)}
                        >
                          <small>{accountName(o.account_id)}</small>
                          <h3>{o.name}</h3>
                          <strong>{money(o.amount)}</strong>
                          <div className="deal-risk">
                            <Badge
                              tone={
                                r.score >= 50
                                  ? "red"
                                  : r.score >= 25
                                    ? "amber"
                                    : "green"
                              }
                            >
                              Risk {r.score}
                            </Badge>
                            <span>
                              {daysSince(o.stage_entered_at)}d in stage
                            </span>
                          </div>
                          <p>
                            {r.factors[0]?.label || "No elevated risk signals"}
                          </p>
                          <footer>
                            <span className="avatar small">
                              {d.users
                                .find((u) => u.id === o.owner_id)
                                ?.name.split(" ")
                                .map((s) => s[0])
                                .join("")}
                            </span>
                            <span>Close {when(o.close_date)}</span>
                          </footer>
                        </button>
                      );
                    })}
                </section>
              ))}
          </div>
        ) : (
          <Card>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Stage</th>
                    <th>Amount</th>
                    <th>Risk</th>
                    <th>Close date</th>
                    <th>Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {d.opportunities.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => openDeal(o)}
                        >
                          {o.name}
                        </button>
                      </td>
                      <td>{o.stage_id}</td>
                      <td>{money(o.amount)}</td>
                      <td>
                        <ScoreBar score={risk(o, d).score} />
                      </td>
                      <td>{o.close_date}</td>
                      <td>{o.next_action || "Not recorded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    );
  if (view === "signals")
    return (
      <>
        <div className="metrics">
          <Metric
            label="Stage-driven forecast change"
            value={compact(m.forecastDelta)}
            detail="Trailing 7 days · recorded transitions"
            onClick={() => explain("Weighted")}
          />
          <Metric
            label="Stale open pipeline"
            value={compact(m.stale)}
            detail="No contact for 14+ days"
          />
          <Metric
            label="At-risk accounts"
            value={String(m.health.filter((h) => h.score < 50).length)}
            detail="health-v1 score below 50"
          />
          <Metric
            label="Past close dates"
            value={String(
              d.opportunities.filter(
                (o) =>
                  isOpen(o) &&
                  o.close_date < new Date().toISOString().slice(0, 10),
              ).length,
            )}
            detail="Open deals with elapsed close dates"
          />
        </div>
        <Card
          title="Why did the forecast change?"
          eyebrow="RECORD-LEVEL ATTRIBUTION"
        >
          <p>
            These are contributions from recorded stage transitions. They are
            not a full period-over-period forecast snapshot.
          </p>
          {m.movement.map((h) => (
            <div className="signal-row" key={h.id}>
              <span className={`signal-icon ${h.delta < 0 ? "red" : "green"}`}>
                <Activity size={18} />
              </span>
              <div className="grow">
                <b>
                  {d.opportunities.find((o) => o.id === h.opportunity_id)?.name}
                </b>
                <p>
                  {h.from_stage} → {h.to_stage} · {h.old_probability}% →{" "}
                  {h.new_probability}% · {when(h.created_at)}
                </p>
                <small>
                  {money(h.amount)} × ({h.new_probability} − {h.old_probability}
                  ) / 100
                </small>
              </div>
              <strong className={h.delta < 0 ? "red" : "green"}>
                {h.delta > 0 ? "+" : ""}
                {money(h.delta)}
              </strong>
            </div>
          ))}
        </Card>
        <Card title="Current attention signals">
          <Recommendations {...p} count={6} />
        </Card>
      </>
    );
  if (view === "analytics")
    return (
      <>
        <div className="metrics">
          <Metric
            label="Closed won"
            value={compact(m.won)}
            detail="Opportunity contract value · all history"
          />
          <Metric
            label="Closed lost"
            value={compact(m.lost)}
            detail="Lost opportunity value · all history"
          />
          <Metric
            label="Win rate"
            value={`${m.winRate}%`}
            detail="Won / all closed opportunities"
            onClick={() => explain("Win")}
          />
          <Metric
            label="Average won deal"
            value={compact(m.averageDeal)}
            detail={`${m.salesCycle} days average won cycle`}
          />
        </div>
        <div className="two-col">
          <Card title="Transparent forecast">
            <table>
              <tbody>
                {[
                  ["Open pipeline", m.pipeline],
                  ["Stage-weighted open pipeline", m.weighted],
                  ["Commit", m.commit],
                  ["Best case (includes commit)", m.bestCase],
                  ["Closed won (historical)", m.won],
                ].map(([label, value]) => (
                  <tr key={String(label)}>
                    <td>{label}</td>
                    <td>
                      <b>{money(Number(value))}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">
              All close dates. Categories overlap and must not be added
              together. No statistical forecast is represented.
            </p>
          </Card>
          <Card title="Sales activity & ownership">
            <table>
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Open pipeline</th>
                  <th>Won</th>
                  <th>30d activities</th>
                </tr>
              </thead>
              <tbody>
                {m.reps.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{compact(r.pipeline)}</td>
                    <td>{compact(r.won)}</td>
                    <td>{r.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">
              Activity counts provide context; they are not a performance
              rating.
            </p>
          </Card>
          <Card title="AI value · observable outcomes">
            <div className="value-grid">
              {[
                ["Recommendations", d.recommendations.length],
                [
                  "Accepted",
                  d.recommendations.filter((r) =>
                    ["accepted", "completed"].includes(r.status),
                  ).length,
                ],
                [
                  "Completed",
                  d.recommendations.filter((r) => r.status === "completed")
                    .length,
                ],
                [
                  "Dismissed",
                  d.recommendations.filter((r) => r.status === "dismissed")
                    .length,
                ],
                [
                  "Questions answered",
                  d.ai_requests.filter((r) => r.status === "completed").length,
                ],
                ["Briefs generated", d.memories.length],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="muted">
              Recorded operational counts. No time savings or financial outcomes
              are inferred.
            </p>
          </Card>
          <Card title="Metric lineage">
            <p>
              <b>Paid order value</b>
              <br />
              orders.status = paid → order_lines.quantity × unit_price → sum by
              account.
            </p>
            <p>
              <b>Weighted pipeline</b>
              <br />
              Open opportunities → join stage probability → sum amount ×
              probability.
            </p>
            <p>
              <b>Customer health</b>
              <br />
              Latest interaction + recent activity cadence + unresolved cases +
              overdue tasks.
            </p>
            <small>
              Computed at {p.asOf}. Operational views avoid a second copy of
              this small dataset.
            </small>
          </Card>
        </div>
      </>
    );
  return null;
}
