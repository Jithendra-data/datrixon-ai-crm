"use client";
import Link from "./link";
import { useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Bot,
  Play,
  Bell,
} from "lucide-react";
import type { ViewProps } from "./workspace";
import type { Answer } from "../../lib/crm/copilot";
import { can } from "../../lib/crm/security";
import { agentCatalog } from "../../lib/crm/agents";
import { isBrowserDemo } from "../../lib/crm/transport";
import { Card, Badge, Metric, Empty, when } from "./primitives";
export default function IntelligenceViews({
  d,
  user,
  view,
  busy,
  perform,
}: ViewProps) {
  const [narration, setNarration] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  if (view === "copilot")
    return (
      <div className="copilot-layout">
        <Card className="copilot-card">
          <div className="copilot-intro">
            <span className="ai-orb">
              <Sparkles size={28} />
            </span>
            <p className="eyebrow">YOUR CUSTOMER INTELLIGENCE PARTNER</p>
            <h2>
              Ask better questions.
              <br />
              Get grounded answers.
            </h2>
            <p>
              Answers use approved queries over the records your role can
              access.
            </p>
          </div>
          <div className="suggestions">
            {[
              "Which deals are most likely to slip this month?",
              "Which customers have gone quiet?",
              "Why did forecasted revenue decline?",
              "Give me the five most important actions I should take.",
            ].map((q) => (
              <button key={q} onClick={() => setQuestion(q)}>
                {q}
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          {!isBrowserDemo() && (
            <label>
              <input
                type="checkbox"
                checked={narration}
                onChange={(e) => setNarration(e.target.checked)}
              />{" "}
              Request optional server-generated narrative
            </label>
          )}
          <form
            className="ask-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await perform({
                action: "ask",
                question,
                narrate: narration,
              });
              if (r) setAnswer(r as Answer);
            }}
          >
            <input
              aria-label="Ask the CRM copilot"
              required
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your customers, pipeline or priorities…"
            />
            <button className="button primary" disabled={busy}>
              {busy ? "Analyzing…" : "Ask"}
              <ArrowRight size={16} />
            </button>
          </form>
          {answer && (
            <div className="answer">
              <Badge tone="green">{answer.method}</Badge>
              <p className="answer-body">{answer.answer}</p>
              {answer.narrative && (
                <aside className="notice">
                  <Badge>Model narrative · {answer.narrative.status}</Badge>
                  <p>{answer.narrative.text || answer.narrative.reason}</p>
                  <small>
                    Computed facts above remain authoritative. Citation and
                    number checks do not prove semantic correctness; human
                    review is required.
                  </small>
                </aside>
              )}
              <details open>
                <summary>
                  Query logic & evidence · {answer.evidence.length} sources
                </summary>
                <p>{answer.logic}</p>
                <p className="muted">{answer.confidence}</p>
                <div className="source-links">
                  {answer.evidence.map((e) => (
                    <Link
                      key={`${e.type}-${e.id}`}
                      href={
                        e.account_id
                          ? `/workspace/accounts/${e.account_id}`
                          : "/workspace/analytics"
                      }
                    >
                      {e.type} / {e.id} · {e.label}
                      <ArrowUpRight size={12} />
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          )}
        </Card>
        <Card title="The trust boundary">
          <ShieldCheck size={28} />
          <h3>Read-only reasoning</h3>
          <p>
            The copilot cannot run generated SQL, send emails or change
            opportunity values.
          </p>
          <h3>Visible evidence</h3>
          <p>
            Each supported answer includes its query logic and accessible source
            records.
          </p>
          <h3>Honest AI labeling</h3>
          <p>
            This demo uses deterministic semantic routing. External
            language-model narration is optional in the server edition. The
            provider has bounded calls and validates citation IDs and numerical
            tokens. Pages runs without a provider.
          </p>
          <Badge>No API key required</Badge>
        </Card>
      </div>
    );
  if (view === "agents")
    return (
      <>
        <div className="notice">
          <Badge tone="green">Observable by design</Badge> Eight rule-based
          agents. Runs preserve prior decisions; they never send communications,
          merge records or change commercial terms.
        </div>
        <div className="agent-grid">
          {agentCatalog.map((a) => (
            <Card key={a.name}>
              <div className="inline">
                <span className="agent-icon">
                  <Bot size={20} />
                </span>
                <Badge tone="green">Enabled</Badge>
              </div>
              <h3>{a.name}</h3>
              <p>{a.purpose}</p>
              <small>Deterministic · human review</small>
            </Card>
          ))}
        </div>
        <Card title="Execution log">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent / trigger</th>
                  <th>Reviewed</th>
                  <th>Result</th>
                  <th>Confidence</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.agent_runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.agent}</b>
                      <small>{r.trigger}</small>
                    </td>
                    <td>{r.records_reviewed}</td>
                    <td>{r.result}</td>
                    <td>{r.confidence}</td>
                    <td>{when(r.created_at)}</td>
                    <td>
                      <Badge tone="green">{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    );
  if (view === "quality")
    return (
      <>
        <div className="metrics">
          <Metric
            label="Open findings"
            value={String(
              d.quality_issues.filter((i) => i.status === "open").length,
            )}
            detail="Detected by deterministic rules"
          />
          <Metric
            label="Duplicate candidates"
            value={String(
              d.quality_issues.filter((i) => i.kind.startsWith("duplicate"))
                .length,
            )}
            detail="Review required before consolidation"
          />
          <Metric
            label="High severity"
            value={String(
              d.quality_issues.filter((i) => i.severity === "high").length,
            )}
            detail="Ownership, dates or missing activity"
          />
          <Metric
            label="Acknowledged"
            value={String(
              d.quality_issues.filter((i) => i.status === "acknowledged")
                .length,
            )}
            detail="Human triage recorded"
          />
        </div>
        <Card title="Data quality work queue">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Finding</th>
                  <th>Recommended remediation</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.quality_issues.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Badge tone={i.severity === "high" ? "red" : "amber"}>
                        {i.severity}
                      </Badge>
                    </td>
                    <td>
                      <b>{i.kind.replaceAll("_", " ")}</b>
                      <small>{i.description}</small>
                      {i.account_id && (
                        <Link href={`/workspace/accounts/${i.account_id}`}>
                          Inspect source →
                        </Link>
                      )}
                    </td>
                    <td>{i.remediation}</td>
                    <td>{i.status}</td>
                    <td>
                      {can(user.role, "write") && i.status !== "resolved" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            perform({
                              action: "quality",
                              id: i.id,
                              status:
                                i.status === "open"
                                  ? "acknowledged"
                                  : "resolved",
                            })
                          }
                        >
                          {i.status === "open"
                            ? "Acknowledge"
                            : "Verify resolved"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    );
  if (view === "governance")
    return (
      <>
        <div className="notice">
          <ShieldCheck size={20} />
          <span>
            <b>Recommendations have no write authority.</b>{" "}
            {isBrowserDemo()
              ? "This browser-local edition simulates permissions and approval decisions."
              : "Server-side authorization applies to every mutation."}{" "}
            Persona switching is limited to synthetic workspaces.
          </span>
        </div>
        <div className="two-col">
          <Card title="AI control plane">
            <dl className="definition-list">
              <dt>Execution mode</dt>
              <dd>Deterministic semantic queries and rule agents</dd>
              <dt>Language model</dt>
              <dd>Optional server configuration · disabled on GitHub Pages</dd>
              <dt>Rules / prompt policy</dt>
              <dd>
                risk-v1, health-v1, semantic-v1 · versioned in source control
              </dd>
              <dt>Confidence policy</dt>
              <dd>Rule coverage is not calibrated predictive confidence</dd>
              <dt>Data access</dt>
              <dd>Scoped records, approved read functions, no generated SQL</dd>
              <dt>Commercial changes</dt>
              <dd>Explicit human editing with role authorization</dd>
              <dt>External actions</dt>
              <dd>
                Email sending, record merges and autonomous reassignment
                disabled
              </dd>
            </dl>
          </Card>
          <Card title="Approval queue">
            <p>
              Accepted recommendations create planning tasks and review
              requests. Review does not send email or change commercial records.
              A different authorized reviewer must decide.
            </p>
            {d.approvals.map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  <b>
                    {
                      d.recommendations.find(
                        (r) => r.id === a.recommendation_id,
                      )?.title
                    }
                  </b>
                  <small>{a.action}</small>
                  <Badge>{a.status}</Badge>
                  {a.status === "approved" &&
                    a.requested_by === user.id &&
                    can(user.role, "write") && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          perform({ action: "execute_plan", id: a.id })
                        }
                      >
                        Start approved plan
                      </button>
                    )}
                  {a.status === "executed" &&
                    a.requested_by === user.id &&
                    d.recommendations.find((r) => r.id === a.recommendation_id)
                      ?.status !== "completed" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          perform({
                            action: "recommendation",
                            id: a.recommendation_id,
                            status: "completed",
                            outcome:
                              "Internal planning task completed by requesting user",
                            reason_code: "useful",
                          })
                        }
                      >
                        Complete planning task
                      </button>
                    )}
                </div>
                {a.status === "pending" && can(user.role, "approve") && (
                  <div className="action-stack">
                    <button
                      disabled={busy}
                      onClick={() =>
                        perform({
                          action: "approve",
                          id: a.id,
                          decision: "approved",
                        })
                      }
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        perform({
                          action: "approve",
                          id: a.id,
                          decision: "rejected",
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!d.approvals.length && (
              <Empty>
                Accept a recommendation to create a planning review request.
              </Empty>
            )}
          </Card>
          <Card
            title="Workflow rules"
            action={
              can(user.role, "run_agents") && (
                <button
                  disabled={busy}
                  onClick={() => perform({ action: "run_workflows" })}
                >
                  <Play size={14} />
                  Run now
                </button>
              )
            }
          >
            {d.workflow_rules.map((w) => (
              <div className="list-row" key={w.id}>
                <div>
                  <b>{w.name}</b>
                  <small>
                    {JSON.parse(w.definition).condition.replaceAll("_", " ")} →{" "}
                    {JSON.parse(w.definition).action.replaceAll("_", " ")}
                  </small>
                </div>
                <button
                  disabled={!can(user.role, "govern") || busy}
                  onClick={() =>
                    perform({
                      action: "workflow",
                      id: w.id,
                      enabled: !w.enabled,
                    })
                  }
                >
                  {w.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            ))}
            <p className="muted">
              Manual execution in this demo. Daily idempotency prevents
              duplicate alerts for the same rule and deal.
            </p>
          </Card>
          <Card title="Security & operating limits">
            {isBrowserDemo() ? (
              <p>
                This GitHub Pages edition executes SQLite and application rules
                in your browser. Persona permissions and audit history
                demonstrate behavior; they are not authentication,
                tamper-resistant records, or a security boundary. Use synthetic
                data only. The server edition in GitHub implements the controls
                described below.
              </p>
            ) : null}
            <p>
              Server edition: workspace-scoped prepared SQL, composite foreign
              keys, HttpOnly session cookies, same-origin mutation checks,
              server-side role checks, optimistic deal versioning and atomic
              audit writes.
            </p>
            <p>
              The server reference uses bearer demo sessions, not enterprise
              SSO. Provisioning quotas, SSO/MFA, retention scheduling, immutable
              audit export and an independent security assessment are deployment
              gates for real data.
            </p>
            <Badge tone="amber">Synthetic data only</Badge>
          </Card>
        </div>
      </>
    );
  if (view === "audit")
    return (
      <Card title="Audit trail" eyebrow="HUMAN + SYSTEM ACTIONS">
        {!can(user.role, "audit") ? (
          <Empty>
            Your role does not have audit access. This restriction is enforced
            by the API.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Detail</th>
                  <th>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {d.audit_events.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.created_at).toLocaleString()}</td>
                    <td>
                      {d.users.find((u) => u.id === e.actor_id)?.name ||
                        e.actor_id}
                    </td>
                    <td>
                      <Badge>{e.action}</Badge>
                    </td>
                    <td>
                      {e.entity_type}/{e.entity_id}
                    </td>
                    <td className="wrap-cell">{e.detail}</td>
                    <td>
                      <code>{e.request_id.slice(0, 8)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  if (view === "notifications")
    return (
      <Card title="Notification center">
        {d.notifications.map((n) => (
          <div className="list-row" key={n.id}>
            <Bell size={18} />
            <div className="grow">
              <b>{n.title}</b>
              <p>{n.body}</p>
              <small>
                {when(n.created_at)} · {n.status}
              </small>
            </div>
            {n.status === "unread" && can(user.role, "write") && (
              <button
                disabled={busy}
                onClick={() => perform({ action: "notification", id: n.id })}
              >
                Mark read
              </button>
            )}
          </div>
        ))}
        {!d.notifications.length && (
          <Empty>
            No notifications. Run enabled workflows in AI Governance to evaluate
            current records.
          </Empty>
        )}
      </Card>
    );
  return null;
}
