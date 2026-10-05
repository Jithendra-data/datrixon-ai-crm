"use client";
import Link from "./link";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Building2,
  Columns3,
  Sparkles,
  Bot,
  Activity,
  ShieldCheck,
  Search,
  Bell,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Play,
  Sun,
  Database,
  ChartNoAxesCombined,
  ClipboardList,
  Calculator,
  Menu,
  LogOut,
  Check,
  ChevronRight,
} from "lucide-react";
import type { Dataset, User, Opportunity } from "../../lib/crm/types";
import { analytics, risk, daysSince } from "../../lib/crm/intelligence";
import { can } from "../../lib/crm/security";
import { Empty, Modal, Badge, money, when } from "./primitives";
import Economics from "./economics";
import AccountDetail from "./account-detail";
import RevenueViews from "./revenue-views";
import IntelligenceViews from "./intelligence-views";
import { useWorkspaceTool } from "./webmcp";
import { demoRequest, isBrowserDemo } from "../../lib/crm/transport";
export type ViewProps = {
  d: Dataset;
  user: User;
  m: ReturnType<typeof analytics>;
  view: string;
  busy: boolean;
  perform: (body: unknown) => Promise<unknown>;
  openDeal: (o: Opportunity) => void;
  explain: (key: string) => void;
  asOf: string;
};
type Payload = {
  data: Dataset;
  user: User;
  as_of: string;
  expires_at: string;
  metrics: ReturnType<typeof analytics>;
};
export const navigation = [
  ["overview", "Command center", LayoutDashboard],
  ["morning", "My morning brief", Sun],
  ["accounts", "Customer 360", Building2],
  ["pipeline", "Pipeline", Columns3],
  ["copilot", "CRM copilot", Sparkles],
  ["signals", "Changes & signals", Activity],
  ["agents", "Agent activity", Bot],
  ["quality", "Data quality", Database],
  ["analytics", "Revenue analytics", ChartNoAxesCombined],
  ["governance", "AI governance", ShieldCheck],
  ["audit", "Audit center", ClipboardList],
  ["economics", "Build vs buy", Calculator],
] as const;
const descriptions: Record<string, string> = {
  overview: "The signals, relationships and decisions moving your business.",
  morning: "Start with the work that needs your judgment.",
  accounts: "Understand the relationship behind every account.",
  pipeline: "See momentum, exposure and the next useful action.",
  copilot: "Ask a question. Inspect the evidence. Make the decision.",
  signals: "Explain what changed using the records behind the movement.",
  agents: "Every analysis visible. Every consequential action accountable.",
  quality: "Trustworthy intelligence starts with trustworthy records.",
  analytics: "Transparent calculations, with their business meaning intact.",
  governance: "Clear boundaries between intelligence and authority.",
  audit: "A record of who changed what, and why.",
  economics: "Compare ownership obligations, not just subscription prices.",
  notifications: "Updates from your workflows and customer signals.",
};
export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (isBrowserDemo()) return (await demoRequest(path, body)) as T;
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(result.error || "Request failed");
  return result;
}
export default function Workspace({
  view,
  recordId,
}: {
  view: string;
  recordId?: string;
}) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [metric, setMetric] = useState("");
  const refresh = useCallback(async () => {
    const p = await api<Payload>("/api/workspace");
    setPayload(p);
    setError("");
  }, []);
  useWorkspaceTool(
    payload
      ? {
          pipeline: payload.metrics.pipeline,
          weighted: payload.metrics.weighted,
          accounts: payload.data.accounts.length,
          role: payload.user.role,
        }
      : null,
  );
  useEffect(() => {
    let active = true;
    api<Payload>("/api/workspace")
      .then((p) => {
        if (active) setPayload(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setDialog("search");
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const perform = async (body: unknown) => {
    setBusy(true);
    setError("");
    try {
      const r = await api<unknown>("/api/actions", body);
      await refresh();
      setToast("Saved. The action is recorded in the audit trail.");
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    setBusy(true);
    try {
      await api("/api/demo", {});
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <div className="entry">
        <div className="entry-card" role="status">
          <p className="eyebrow">DATRIXON AI CRM</p>
          <h1>Loading your workspace…</h1>
          <p>
            Retrieving your authorized records and calculating current
            intelligence.
          </p>
        </div>
      </div>
    );
  if (!payload)
    return (
      <div className="entry">
        <Link className="brand" href="/">
          <span className="brand-mark">D</span>datrixon <small>AI CRM</small>
        </Link>
        <div className="entry-card">
          <p className="eyebrow">YOUR PRIVATE SYNTHETIC WORKSPACE</p>
          <h1>
            Meet your next
            <br />
            revenue operating system.
          </h1>
          <p>
            Explore realistic fictional accounts, evidence-backed intelligence
            and governed workflows. Your changes are isolated from other
            visitors.
          </p>
          <button className="button primary" disabled={busy} onClick={start}>
            {busy ? "Preparing your workspace…" : "Start the interactive demo"}{" "}
            <ArrowRight size={18} />
          </button>
          <p className="muted">
            Demo sessions last 24 hours. Never enter real customer information.
            Persona switching simulates roles; it is not enterprise identity
            management.
          </p>
          {error && !error.includes("Start an isolated") && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  const { data: d, user, metrics: m } = payload;
  const title = navigation.find((n) => n[0] === view)?.[1] || "Notifications";
  const metricDefinitions: Record<string, [string, string, string]> = {
    Pipeline: [
      "Sum of open opportunity amounts",
      "opportunities.amount where stage is not won or lost",
      "All recorded open deals, regardless of close date. USD cents are stored as integers.",
    ],
    Weighted: [
      "Σ open amount × stage probability / 100",
      "opportunities + stages",
      "Rule-based expected value across all open opportunities; not a calibrated revenue prediction.",
    ],
    Revenue: [
      "Σ paid order line quantity × unit price",
      "orders + order_lines",
      "Paid order value across seeded history. Not GAAP recognized revenue.",
    ],
    Risk: [
      "Σ open amounts with risk-v1 score ≥ 50",
      "opportunities + activities + cases + stakeholders",
      "Risk thresholds indicate attention, not probability of loss.",
    ],
    Win: [
      "Won count / (won + lost count)",
      "opportunities where stage is won or lost",
      "All recorded closed opportunities. No time-window filter.",
    ],
  };
  const props: ViewProps = {
    d,
    user,
    m,
    view,
    busy,
    perform,
    openDeal: (o) => {
      setSelected(o);
      setDialog("deal");
    },
    explain: (key) => {
      setMetric(key);
      setDialog("metric");
    },
    asOf: payload.as_of,
  };
  return (
    <div className="shell">
      <aside className={`sidebar ${menu ? "visible" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-mark">D</span>
          <span>
            datrixon<small>AI CRM</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">DX</span>
          <span>
            Revenue operations<small>Reference workspace</small>
          </span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.map(([key, label, Icon], i) => (
            <Link
              key={key}
              href={`/workspace/${key}`}
              className={`${view === key ? "active" : ""} ${i === 8 ? "nav-break" : ""}`}
            >
              <Icon size={18} />
              {label}
              {key === "copilot" && <span className="nav-ai">AI</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="live-dot" />
          <b>Human judgment, amplified.</b>
          <p>Synthetic data. Real architecture.</p>
          <Link href="/">
            About this project <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <b>{title}</b>
          </div>
          <div className="top-actions">
            <button
              className="search-trigger"
              onClick={() => setDialog("search")}
            >
              <Search size={16} />
              <span>Search or jump to…</span>
              <kbd>⌘ K</kbd>
            </button>
            <Link
              className="icon-button"
              aria-label="Notifications"
              href="/workspace/notifications"
            >
              <Bell size={19} />
              {d.notifications.some((n) => n.status === "unread") && (
                <i className="notification-dot" />
              )}
            </Link>
            <label className="persona">
              <span className="avatar">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <select
                aria-label="Demo persona"
                value={user.id}
                disabled={busy}
                onChange={async (e) => {
                  setBusy(true);
                  try {
                    await api("/api/persona", { user_id: e.target.value });
                    await refresh();
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {d.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-button"
              aria-label="End demo session"
              onClick={async () => {
                await api("/api/logout", {});
                setPayload(null);
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="demo-ribbon">
          <span>
            <i className="live-dot" /> SYNTHETIC DEMO
          </span>
          <span>Isolated workspace · {user.role} · All amounts USD</span>
          <span>
            Rule-based intelligence <ShieldCheck size={13} />
          </span>
        </div>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">DATRIXON / REVENUE INTELLIGENCE</p>
              <h1>
                {view === "accounts" && recordId
                  ? d.accounts.find((a) => a.id === recordId)?.name || "Account"
                  : title}
              </h1>
              <p>{descriptions[view]}</p>
            </div>
            <div className="heading-actions">
              <span className="date-label">
                {when(payload.as_of)}
                <small>Live calculations · UTC</small>
              </span>
              {view === "pipeline" && can(user.role, "write") && (
                <button
                  className="button primary"
                  onClick={() => setDialog("opportunity")}
                >
                  <Plus size={16} />
                  New opportunity
                </button>
              )}
              {["agents", "quality"].includes(view) &&
                can(user.role, "run_agents") && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => perform({ action: "run_agents" })}
                  >
                    <Play size={15} />
                    Run analysis
                  </button>
                )}
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {toast && (
            <div className="toast" role="status">
              <Check size={16} />
              {toast}
              <button
                onClick={() => setToast("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          {view === "accounts" && recordId ? (
            <AccountDetail id={recordId} {...props} />
          ) : (
            <RevenueViews {...props} />
          )}
          <IntelligenceViews {...props} />
          {view === "economics" && <Economics />}
          {!navigation.some((n) => n[0] === view) &&
            view !== "notifications" && (
              <Empty>
                Page not found.{" "}
                <Link href="/workspace">Return to command center</Link>
              </Empty>
            )}
          <div className="workspace-footer">
            <span>DATRIXON AI CRM · REFERENCE IMPLEMENTATION</span>
            <span>
              <ShieldCheck size={12} /> Evidence before action.
            </span>
          </div>
        </main>
      </div>
      {dialog === "search" && (
        <Modal title="Search & commands" onClose={() => setDialog(null)}>
          <SearchDialog />
        </Modal>
      )}
      {dialog === "metric" && (
        <Modal
          title={`Explain this metric: ${metric}`}
          onClose={() => setDialog(null)}
        >
          <dl className="definition-list">
            <dt>Formula</dt>
            <dd>{metricDefinitions[metric]?.[0]}</dd>
            <dt>Source entities</dt>
            <dd>{metricDefinitions[metric]?.[1]}</dd>
            <dt>Interpretation</dt>
            <dd>{metricDefinitions[metric]?.[2]}</dd>
            <dt>Last computed</dt>
            <dd>{payload.as_of}</dd>
          </dl>
          <Link href="/workspace/signals">Inspect recent drivers →</Link>
        </Modal>
      )}
      {dialog === "opportunity" && (
        <Modal title="Create opportunity" onClose={() => setDialog(null)}>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const r = await perform({
                action: "create_opportunity",
                account_id: f.get("account_id"),
                name: f.get("name"),
                amount: Math.round(Number(f.get("amount")) * 100),
                close_date: f.get("close_date"),
                next_action: f.get("next_action"),
              });
              if (r) setDialog(null);
            }}
          >
            <label>
              Account
              <select required name="account_id">
                {d.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Opportunity name
              <input required name="name" maxLength={160} />
            </label>
            <label>
              Value · USD
              <input required type="number" min="0" step="0.01" name="amount" />
            </label>
            <label>
              Expected close date
              <input required type="date" name="close_date" />
            </label>
            <label>
              Next action
              <input required maxLength={400} name="next_action" />
            </label>
            <button className="button primary" disabled={busy}>
              Create in Discovery
            </button>
            {error && (
              <p className="red" role="alert">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
      {dialog === "deal" && selected && (
        <Modal
          title={selected.name}
          onClose={() => {
            setDialog(null);
            setSelected(null);
          }}
        >
          <div className="inline">
            <Badge>
              {d.accounts.find((a) => a.id === selected.account_id)?.name}
            </Badge>
            <b>{money(selected.amount)}</b>
            <Badge tone="amber">Risk {risk(selected, d).score} / 100</Badge>
          </div>
          <h3>Why this deal needs attention</h3>
          {risk(selected, d).factors.map((f) => (
            <p className="factor" key={f.label}>
              <span>
                {f.label}
                <small>{f.source}</small>
              </span>
              <b>+{f.points}</b>
            </p>
          ))}
          <p className="muted">
            Risk is a weighted attention score, not a probability. Deal age:{" "}
            {daysSince(selected.created_at)} days.
          </p>
          <p>
            <b>Decision criteria:</b> {selected.decision_criteria}
            <br />
            <b>Competitor:</b> {selected.competitor || "Not recorded"}
            <br />
            <b>Forecast category:</b> {selected.forecast_category}
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const r = await perform({
                action: "update_opportunity",
                id: selected.id,
                version: selected.version,
                stage_id: f.get("stage_id"),
                next_action: f.get("next_action"),
                close_date: f.get("close_date"),
              });
              if (r) setDialog(null);
            }}
          >
            <label>
              Stage
              <select name="stage_id" defaultValue={selected.stage_id}>
                {d.stages.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Expected close date
              <input
                type="date"
                required
                name="close_date"
                defaultValue={selected.close_date}
              />
            </label>
            <label>
              Next action
              <input
                required
                name="next_action"
                defaultValue={selected.next_action || ""}
                maxLength={400}
              />
            </label>
            {can(user.role, "write") && (
              <button disabled={busy} className="button primary">
                Confirm changes
              </button>
            )}
            {error && (
              <p className="red" role="alert">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
function SearchDialog() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    { id: string; type: string; label: string; account_id: string | null }[]
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!q) return;
    let active = true;
    const timer = setTimeout(() => {
      api<{ results: typeof results }>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => {
          if (active) setResults(r.results);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);
  return (
    <div className="search-dialog">
      <input
        autoFocus
        aria-label="Global search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search accounts, people, deals, notes…"
      />
      {error && <p className="error">{error}</p>}
      {q ? (
        results.map((r) => (
          <Link
            className="command-result"
            href={
              r.account_id
                ? `/workspace/accounts/${r.account_id}`
                : "/workspace/analytics"
            }
            key={r.type + r.id}
          >
            <Search size={16} />
            <span>
              {r.label}
              <small>
                {r.type} · {r.id}
              </small>
            </span>
          </Link>
        ))
      ) : (
        <>
          {navigation.slice(0, 8).map(([key, label, Icon]) => (
            <Link
              className="command-result"
              key={key}
              href={`/workspace/${key}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <small>
            Search is scoped to your role · Ctrl/⌘ K to open · Escape to close
          </small>
        </>
      )}
    </div>
  );
}
