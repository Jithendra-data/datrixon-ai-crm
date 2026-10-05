"use client";
import { useState } from "react";
import { AccountTrends } from "./signal-views";
import { memoryStatus } from "../../lib/crm/memory";
import Link from "./link";
import { Sparkles, Plus, Users, Activity, Building2 } from "lucide-react";
import type { ViewProps } from "./workspace";
import { health, isOpen, accountBrief } from "../../lib/crm/intelligence";
import { can } from "../../lib/crm/security";
import {
  Card,
  Badge,
  Empty,
  Modal,
  Metric,
  ScoreBar,
  money,
  when,
} from "./primitives";
export default function AccountDetail({
  id,
  d,
  user,
  busy,
  perform,
  openDeal,
}: ViewProps & { id: string }) {
  const [brief, setBrief] = useState<ReturnType<typeof accountBrief> | null>(
    null,
  );
  const [logging, setLogging] = useState(false);
  const [tab, setTab] = useState("timeline");
  const a = d.accounts.find((a) => a.id === id);
  if (!a)
    return (
      <Empty>
        Account not found in your scope.{" "}
        <Link href="/workspace/accounts">Return to directory</Link>
      </Empty>
    );
  const h = health(a, d);
  const opps = d.opportunities.filter((o) => o.account_id === id);
  const orders = d.orders.filter((o) => o.account_id === id);
  const lines = d.order_lines.filter((l) =>
    orders.some((o) => o.id === l.order_id && o.status === "paid"),
  );
  const summary = accountBrief(a, d);
  const timeline = [
    ...d.activities
      .filter((x) => x.account_id === id)
      .map((x) => ({
        id: x.id,
        type: x.kind,
        title: x.subject,
        body: x.body,
        time: x.occurred_at,
      })),
    ...d.notes
      .filter((x) => x.account_id === id)
      .map((x) => ({
        id: x.id,
        type: "note",
        title: "Account note",
        body: x.body,
        time: x.created_at,
      })),
    ...d.cases
      .filter((x) => x.account_id === id)
      .map((x) => ({
        id: x.id,
        type: "support case",
        title: x.subject,
        body: `${x.severity} · ${x.status}`,
        time: x.created_at,
      })),
    ...d.stage_history
      .filter((x) => opps.some((o) => o.id === x.opportunity_id))
      .map((x) => ({
        id: x.id,
        type: "stage change",
        title: `${x.from_stage} → ${x.to_stage}`,
        body: opps.find((o) => o.id === x.opportunity_id)?.name || "",
        time: x.created_at,
      })),
    ...d.recommendations
      .filter((x) => x.account_id === id)
      .map((x) => ({
        id: x.id,
        type: "recommendation",
        title: x.title,
        body: `${x.reason} · ${x.status}`,
        time: x.updated_at,
      })),
    ...orders.map((x) => ({
      id: x.id,
      type: "order",
      title: `Paid order ${x.id}`,
      body: money(
        lines
          .filter((l) => l.order_id === x.id)
          .reduce((s, l) => s + l.quantity * l.unit_price, 0),
      ),
      time: x.ordered_at,
    })),
    ...d.tasks
      .filter((x) => x.account_id === id)
      .map((x) => ({
        id: x.id,
        type: "task",
        title: x.title,
        body: `${x.status} · due ${x.due_date}`,
        time: x.updated_at,
      })),
  ].sort((a, b) => b.time.localeCompare(a.time));
  return (
    <>
      <div className="account-header">
        <span className="company-icon large">
          {a.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="grow">
          <div className="inline">
            <Badge>{a.industry}</Badge>
            <Badge tone="green">{a.status}</Badge>
            <Badge>Synthetic organization</Badge>
          </div>
          <p>
            {a.domain} · {a.employees.toLocaleString()} employees · Owner:{" "}
            {d.users.find((u) => u.id === a.owner_id)?.name || "Unassigned"}
          </p>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={async () => {
            const r = await perform({ action: "brief", account_id: id });
            if (r) setBrief(r as ReturnType<typeof accountBrief>);
          }}
        >
          <Sparkles size={16} />
          Prepare for meeting
        </button>
        {can(user.role, "write") && (
          <button className="button" onClick={() => setLogging(true)}>
            <Plus size={16} />
            Log activity
          </button>
        )}
      </div>
      <div className="metrics">
        <Metric
          label="Relationship health"
          value={`${h.score}/100`}
          detail="health-v1 · explainable rules"
        />
        <Metric
          label="Open opportunities"
          value={String(opps.filter(isOpen).length)}
          detail={money(opps.filter(isOpen).reduce((s, o) => s + o.amount, 0))}
        />
        <Metric
          label="Paid order value"
          value={money(
            lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
          )}
          detail={`${orders.length} historical orders`}
        />
        <Metric
          label="Renewal date"
          value={a.renewal_date || "Unknown"}
          detail="Recorded date · confirm with customer"
        />
      </div>
      <div className="executive-brief">
        <Sparkles size={25} />
        <div>
          <h2>Relationship summary</h2>
          <p>{summary.summary}</p>
          <small>
            Computed summary · {summary.evidence.length} supporting records · no
            language model used
          </small>
        </div>
      </div>
      <div className="account-grid">
        <div>
          <Card
            title="Relationship timeline"
            action={
              <div className="segmented">
                <button
                  className={tab === "timeline" ? "active" : ""}
                  onClick={() => setTab("timeline")}
                >
                  Timeline
                </button>
                <button
                  className={tab === "commercial" ? "active" : ""}
                  onClick={() => setTab("commercial")}
                >
                  Commercial
                </button>
                <button
                  className={tab === "memory" ? "active" : ""}
                  onClick={() => setTab("memory")}
                >
                  Memory
                </button>
              </div>
            }
          >
            {tab === "timeline" ? (
              <div className="timeline">
                {timeline.map((x) => (
                  <article key={x.type + x.id}>
                    <span className="timeline-icon">
                      <Activity size={15} />
                    </span>
                    <div>
                      <div className="inline">
                        <Badge>{x.type}</Badge>
                        <small>
                          {when(x.time)} · {x.id}
                        </small>
                      </div>
                      <h3>{x.title}</h3>
                      <p>{x.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : tab === "commercial" ? (
              <>
                <h3>Opportunities</h3>
                {opps.map((o) => (
                  <button
                    className="commercial-row"
                    key={o.id}
                    onClick={() => openDeal(o)}
                  >
                    <span>
                      <b>{o.name}</b>
                      <small>
                        {o.stage_id} · {o.forecast_category}
                      </small>
                    </span>
                    <strong>{money(o.amount)}</strong>
                  </button>
                ))}
                <h3>Products purchased</h3>
                {lines.map((l) => (
                  <div className="list-row" key={l.id}>
                    <span>
                      {d.products.find((p) => p.id === l.product_id)?.name}
                      <small>
                        {l.quantity} units · {l.order_id}
                      </small>
                    </span>
                    <b>{money(l.quantity * l.unit_price)}</b>
                  </div>
                ))}
                <h3>Quotes</h3>
                {d.quotes
                  .filter((q) => opps.some((o) => o.id === q.opportunity_id))
                  .map((q) => (
                    <div className="list-row" key={q.id}>
                      <span>
                        {q.id} · {q.status}
                        <small>Expires {when(q.expires_at)}</small>
                      </span>
                      <b>
                        {money(
                          d.quote_lines
                            .filter((l) => l.quote_id === q.id)
                            .reduce((s, l) => s + l.quantity * l.unit_price, 0),
                        )}
                      </b>
                    </div>
                  ))}
              </>
            ) : (
              <>
                {d.memories
                  .filter((m) => m.account_id === id)
                  .map((m) => (
                    <article key={m.id}>
                      <Badge>{m.method}</Badge>
                      <p>{m.summary}</p>
                      <Badge>{memoryStatus(m.metadata, d, id)}</Badge>
                      <details>
                        <summary>Structured memory & source versions</summary>
                        <pre className="memory-json">
                          {JSON.stringify(
                            JSON.parse(m.metadata).structured || {},
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                      <small>
                        Generated {when(m.created_at)} ·{" "}
                        {JSON.parse(m.evidence).length} source records. Snapshot
                        may be stale after new activity.
                      </small>
                    </article>
                  ))}
                {!d.memories.some((m) => m.account_id === id) && (
                  <Empty>
                    Generate a meeting brief to save the first evidence-backed
                    memory snapshot.
                  </Empty>
                )}
              </>
            )}
          </Card>
        </div>
        <div>
          <Card title="Health explained">
            <ScoreBar score={h.score} kind="health" />
            {h.factors.map((f) => (
              <p className="factor" key={f.label}>
                <span>
                  {f.label}
                  <small>{f.source}</small>
                </span>
                <b>−{f.points}</b>
              </p>
            ))}
            {!h.factors.length && (
              <p>No negative factors detected in the available records.</p>
            )}
            <small>
              Starts at 100. Factors subtract points; minimum 0. Missing
              adoption data is not inferred.
            </small>
          </Card>
          <Card title="Relationship map" eyebrow="PEOPLE & INFLUENCE">
            <div className="relationship-root">
              <Building2 size={17} />
              {a.name}
            </div>
            {d.contacts
              .filter((c) => c.account_id === id)
              .map((c) => (
                <div className="contact-node" key={c.id}>
                  <Users size={16} />
                  <div>
                    <b>{c.name}</b>
                    <small>
                      {c.title} · {c.influence}
                    </small>
                    <small>{c.email || "Email missing"}</small>
                  </div>
                </div>
              ))}
          </Card>
          <Card title="Known priorities">
            <p>{a.priorities}</p>
            <Badge>Recorded account context</Badge>
          </Card>
          <Card title="Recommended next action">
            {d.recommendations
              .filter((r) => r.account_id === id && r.status === "pending")
              .slice(0, 2)
              .map((r) => (
                <div key={r.id}>
                  <h3>{r.title}</h3>
                  <p>{r.reason}</p>
                  <Link href="/workspace/morning">Review recommendation →</Link>
                </div>
              ))}
          </Card>
        </div>
      </div>
      <AccountTrends d={d} id={id} />
      {brief && (
        <Modal
          title={`Meeting brief · ${a.name}`}
          onClose={() => setBrief(null)}
        >
          <Badge tone="green">{brief.method}</Badge>
          <p>{brief.summary}</p>
          <h3>Recommended questions</h3>
          <ul>
            {brief.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <h3>Supporting records</h3>
          {brief.evidence.map((e) => (
            <p key={e.type + e.id}>
              <b>{e.label}</b>
              <small>
                {e.type}/{e.id}
              </small>
            </p>
          ))}
          <small>Saved as CRM memory at {brief.generated_at}.</small>
        </Modal>
      )}
      {logging && (
        <Modal
          title="Log a customer interaction"
          onClose={() => setLogging(false)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const r = await perform({
                action: "log_activity",
                account_id: id,
                opportunity_id: f.get("opportunity_id") || null,
                contact_id: f.get("contact_id") || null,
                kind: f.get("kind"),
                subject: f.get("subject"),
                body: f.get("body"),
              });
              if (r) setLogging(false);
            }}
          >
            <label>
              Type
              <select name="kind">
                <option>meeting</option>
                <option>call</option>
                <option>email</option>
                <option>note</option>
              </select>
            </label>
            <label>
              Related opportunity
              <select name="opportunity_id">
                <option value="">Account only</option>
                {opps.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Linked participant
              <select name="contact_id">
                <option value="">No participant linked</option>
                {d.contacts
                  .filter((c) => c.account_id === id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.influence}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Subject
              <input required maxLength={160} name="subject" />
            </label>
            <label>
              What happened?
              <textarea required maxLength={2000} rows={4} name="body" />
            </label>
            <p className="muted">
              This records an interaction. It does not send a message.
            </p>
            <button className="button primary" disabled={busy}>
              Save interaction
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
