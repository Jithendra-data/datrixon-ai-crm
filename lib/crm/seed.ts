import { syntheticHistory, snapshotRows } from "./history";
import type { Dataset } from "./types";
import { deriveRecommendations, quality, agentCatalog } from "./agents";
import { DAY } from "./intelligence";
export type SeedRow = Record<string, string | number | null>;
export function seedRows(
  workspace: string,
  now = new Date(),
): Record<string, SeedRow[]> {
  const at = (days: number) =>
    new Date(now.getTime() - days * DAY).toISOString();
  const date = (days: number) => at(days).slice(0, 10);
  const base = (id: string, days = 90) => ({
    workspace_id: workspace,
    id,
    created_at: at(days),
    updated_at: at(0),
    source: "synthetic-seed-v1",
    metadata: "{}",
  });
  const rows: Record<string, SeedRow[]> = {
    teams: [{ ...base("revenue"), name: "Revenue & Customer Operations" }],
    territories: [
      { ...base("north-america"), name: "North America" },
      { ...base("emea"), name: "EMEA" },
    ],
  };
  const personas = [
    ["admin", "Morgan Chen", "Administrator"],
    ["ceo", "Elena Vasquez", "Executive"],
    ["manager", "Julian Park", "Sales Manager"],
    ["maya", "Maya Thompson", "Sales Representative"],
    ["owen", "Owen Brooks", "Sales Representative"],
    ["cs", "Priya Shah", "Customer Success"],
    ["support", "Theo Martin", "Support"],
    ["analyst", "Alex Rivera", "Analyst"],
  ];
  rows.users = personas.map(([id, name, role]) => ({
    ...base(id),
    name,
    email: `${id}@datrixon.example`,
    role,
    team_id: "revenue",
  }));
  rows.stages = [
    ["discovery", "Discovery", 10],
    ["qualified", "Qualified", 25],
    ["proposal", "Proposal", 50],
    ["negotiation", "Negotiation", 75],
    ["won", "Closed won", 100],
    ["lost", "Closed lost", 0],
  ].map(([id, name, probability], i) => ({
    ...base(String(id)),
    name: String(name),
    position: i,
    probability: Number(probability),
    is_closed: i >= 4 ? 1 : 0,
  }));
  const companies = [
    [
      "a1",
      "Meridian Robotics",
      "Industrial automation",
      "maya",
      "Scale predictive maintenance across 12 facilities",
    ],
    [
      "a2",
      "Northstar BioSystems",
      "Life sciences",
      "owen",
      "Standardize regulated customer operations",
    ],
    [
      "a3",
      "Cobalt Freight",
      "Logistics",
      "maya",
      "Unify shipment visibility and partner data",
    ],
    [
      "a4",
      "Verdant Energy",
      "Renewable energy",
      "owen",
      "Accelerate commercial project approvals",
    ],
    [
      "a5",
      "Helix Financial",
      "Financial services",
      "maya",
      "Reduce manual compliance handoffs",
    ],
    [
      "a6",
      "Atlas Precision",
      "Manufacturing",
      "owen",
      "Connect quoting to production capacity",
    ],
    [
      "a7",
      "Solstice Health",
      "Healthcare",
      "maya",
      "Improve network account coordination",
    ],
    [
      "a8",
      "Harborline Systems",
      "Technology",
      "owen",
      "Consolidate disconnected customer tools",
    ],
    [
      "a9",
      "Luma Materials",
      "Advanced materials",
      "maya",
      "Expand enterprise account coverage",
    ],
    [
      "a10",
      "Evergreen Foods",
      "Food distribution",
      "owen",
      "Make demand commitments more reliable",
    ],
    [
      "a11",
      "Aster Aerospace",
      "Aerospace",
      "maya",
      "Build traceable supplier relationships",
    ],
    [
      "a12",
      "Cobalt Freight Europe",
      "Logistics",
      "",
      "Unify regional account records",
    ],
  ];
  rows.accounts = companies.map(
    ([id, name, industry, owner, priorities], i) => ({
      ...base(id, 360),
      name,
      domain:
        i === 11
          ? "cobaltfreight.example"
          : name.toLowerCase().replace(/[^a-z]/g, "") + ".example",
      industry,
      owner_id: owner || null,
      territory_id: i === 11 ? "emea" : "north-america",
      status: i < 9 ? "customer" : "prospect",
      employees: 180 + i * 127,
      renewal_date: date(-20 - i * 6),
      priorities,
    }),
  );
  const names = [
    "Aria Bennett",
    "Luca Moreno",
    "Nadia Reed",
    "Ethan Cole",
    "Sofia Patel",
    "Miles Foster",
    "Amara Wilson",
    "Leo Sullivan",
    "Isla Hayes",
    "Kai Morgan",
    "Zoe Ellis",
    "Noah Blake",
  ];
  rows.contacts = companies.flatMap(([id, , ,], i) =>
    [0, 1].map((j) => ({
      ...base(`c${i}-${j}`),
      account_id: id,
      name: names[(i + j) % names.length],
      email:
        i === 8 && j === 1
          ? null
          : `${names[(i + j) % names.length].toLowerCase().replace(" ", ".")}.${i}${j}@${rows.accounts[i].domain}`,
      title: j === 0 ? "VP Operations" : "Director of Technology",
      influence: j === 0 ? "decision maker" : "technical champion",
    })),
  );
  rows.contacts.push(
    { ...rows.contacts[0], id: "c-duplicate", name: "Aria B. Bennett" },
    {
      ...base("c-orphan"),
      account_id: null,
      name: "Samira West",
      email: null,
      title: "Procurement Lead",
      influence: "influencer",
    },
  );
  const deals = [
    [
      "Operations intelligence rollout",
      285000,
      "negotiation",
      -12,
      43,
      "commit",
    ],
    ["Enterprise customer platform", 420000, "proposal", -18, 36, "best_case"],
    ["Network visibility expansion", 165000, "qualified", 5, 48, "pipeline"],
    ["Commercial operations suite", 240000, "negotiation", -25, 12, "commit"],
    ["Risk operations pilot", 125000, "proposal", -35, 18, "best_case"],
    ["Connected quoting initiative", 96000, "qualified", -50, 20, "pipeline"],
    ["Care network expansion", 310000, "discovery", -75, 14, "pipeline"],
    ["Customer data consolidation", 180000, "proposal", -30, 22, "best_case"],
    ["Strategic account program", 72000, "discovery", -60, 16, "pipeline"],
    ["Distribution operations pilot", 138000, "qualified", -45, 21, "pipeline"],
    ["Supplier intelligence platform", 360000, "negotiation", -8, 40, "commit"],
    ["Regional data alignment", 88000, "discovery", -80, 12, "pipeline"],
  ];
  rows.opportunities = deals.map(
    ([name, amount, stage, close, age, forecast], i) => ({
      ...base(`o${i + 1}`, 90 + i * 3),
      account_id: `a${i + 1}`,
      owner_id: i % 2 ? "owen" : "maya",
      stage_id: String(stage),
      name: String(name),
      amount: Number(amount) * 100,
      close_date: date(Number(close)),
      stage_entered_at: at(Number(age)),
      next_action:
        i % 3 === 0
          ? null
          : [
              "Confirm procurement timeline",
              "Schedule technical validation",
              "Review stakeholder requirements",
            ][i % 3],
      forecast_category: String(forecast),
      competitor: i % 2 ? "Internal build" : "Incumbent platform",
      decision_criteria:
        "Time to value, integration effort, auditability and total ownership cost",
      close_date_changes: i < 3 ? 3 : 0,
      version: 1,
    }),
  );
  for (let i = 0; i < 12; i++)
    rows.opportunities.push({
      ...base(`closed-${i}`, 210 + i * 7),
      account_id: `a${(i % 9) + 1}`,
      owner_id: i % 2 ? "owen" : "maya",
      stage_id: i % 4 === 0 ? "lost" : "won",
      name: `${companies[i % 9][1]} — ${i % 2 ? "foundation deployment" : "regional expansion"}`,
      amount: (45000 + i * 14000) * 100,
      close_date: date(35 + i * 5),
      stage_entered_at: at(35 + i * 5),
      next_action: null,
      forecast_category: i % 4 === 0 ? "omitted" : "closed",
      competitor: null,
      decision_criteria: "Operational fit and implementation capacity",
      close_date_changes: 0,
      version: 1,
    });
  rows.activities = [];
  for (let i = 0; i < 12; i++) {
    const stale = [0, 1, 2, 10].includes(i);
    for (let j = 0; j < 8; j++) {
      const days = i === 0 ? 34 + j * 4 : stale ? 22 + j * 4 : 2 + j * 5;
      rows.activities.push({
        ...base(`activity-${i}-${j}`, days),
        account_id: `a${i + 1}`,
        opportunity_id: `o${i + 1}`,
        owner_id: i % 2 ? "owen" : "maya",
        kind: ["meeting", "email", "call"][j % 3],
        subject: [
          "Architecture review",
          "Procurement follow-up",
          "Success planning session",
          "Technical validation",
        ][j % 4],
        body: [
          "Customer requested a documented integration plan and named implementation owner.",
          "Budget review remains open. Procurement needs a revised timeline.",
          "Operations sponsor confirmed priorities; technical champion is reviewing requirements.",
        ][j % 3],
        occurred_at: at(days),
        sentiment: j % 4 ? "positive" : "neutral",
      });
    }
  }
  rows.stakeholders = rows.opportunities
    .filter((o) => String(o.id).startsWith("o"))
    .flatMap((o, i) =>
      [0, ...(i % 3 ? [1] : [])].map((j) => ({
        ...base(`sh-${i}-${j}`),
        opportunity_id: o.id,
        contact_id: `c${i}-${j}`,
        role: j ? "champion" : "economic buyer",
      })),
    );
  rows.tasks = companies.map(([id, name, , owner], i) => ({
    ...base(`task-${i}`, 8),
    account_id: id,
    owner_id: owner || "manager",
    title: `${["Confirm decision process", "Prepare solution review", "Resolve open questions"][i % 3]} · ${name}`,
    due_date: date(i % 3 === 0 ? 4 : -i - 1),
    status: "open",
    recommendation_id: null,
  }));
  rows.notes = companies.map(([id, , , owner, priorities], i) => ({
    ...base(`note-${i}`, 7),
    account_id: id,
    author_id: owner || "manager",
    body: `Account priority: ${priorities}. Source: synthetic discovery workshop. Validate assumptions in the next meeting.`,
  }));
  rows.products = [
    {
      ...base("p1"),
      name: "Customer Intelligence Suite",
      sku: "CI-ANNUAL",
      price: 4800000,
    },
    {
      ...base("p2"),
      name: "Operations Integration",
      sku: "OI-SETUP",
      price: 2400000,
    },
    {
      ...base("p3"),
      name: "Advisory Success Plan",
      sku: "AS-ANNUAL",
      price: 1200000,
    },
  ];
  rows.orders = [];
  rows.order_lines = [];
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 3; j++) {
      rows.orders.push({
        ...base(`order-${i}-${j}`, 30 + j * 90),
        account_id: `a${i + 1}`,
        status: "paid",
        ordered_at: at(30 + j * 90),
      });
      rows.order_lines.push({
        ...base(`line-${i}-${j}`),
        order_id: `order-${i}-${j}`,
        product_id: `p${j + 1}`,
        quantity: 1 + (i % 3),
        unit_price: rows.products[j].price,
      });
    }
  rows.quotes = [
    {
      ...base("quote-1", 7),
      opportunity_id: "o1",
      status: "draft",
      expires_at: at(-14),
    },
  ];
  rows.quote_lines = [
    {
      ...base("ql1", 7),
      quote_id: "quote-1",
      product_id: "p1",
      quantity: 5,
      unit_price: 4800000,
    },
  ];
  rows.cases = [
    ["a1", "API synchronization failures", "critical", "open"],
    ["a2", "Data retention policy clarification", "high", "in_progress"],
    ["a3", "Delayed partner feed", "critical", "open"],
    ["a5", "Report export formatting", "low", "resolved"],
    ["a11", "Supplier onboarding blocked", "high", "open"],
  ].map(([account_id, subject, severity, status], i) => ({
    ...base(`case-${i}`, i + 2),
    account_id,
    owner_id: "support",
    subject,
    severity,
    status,
  }));
  rows.campaigns = [
    {
      ...base("campaign1"),
      name: "Operations Intelligence Forum",
      channel: "executive event",
      status: "active",
    },
  ];
  rows.leads = [
    "Cascade Instruments",
    "Praxis Mobility",
    "Seabrook Analytics",
    "Echelon Packaging",
  ].map((company, i) => ({
    ...base(`lead-${i}`, i + 1),
    name: ["Avery Stone", "Riley Torres", "Jordan Kim", "Taylor Grant"][i],
    company,
    email:
      i === 2
        ? null
        : `operations@${company.split(" ")[0].toLowerCase()}.example`,
    owner_id: i % 2 ? "owen" : "maya",
    campaign_id: "campaign1",
    status: "new",
    estimated_value: (90000 + i * 45000) * 100,
  }));
  rows.tags = [{ ...base("strategic"), name: "Strategic account" }];
  rows.account_tags = [
    { ...base("tag-a1"), account_id: "a1", tag_id: "strategic" },
  ];
  rows.data_sources = [
    {
      ...base("synthetic"),
      name: "Synthetic scenario generator v1",
      kind: "synthetic",
      last_sync_at: at(0),
    },
  ];
  rows.stage_history = [
    ["o1", "proposal", "negotiation", 50, 75],
    ["o2", "negotiation", "proposal", 75, 50],
    ["o3", "proposal", "qualified", 50, 25],
    ["o4", "proposal", "negotiation", 50, 75],
  ].map(
    (
      [opportunity_id, from_stage, to_stage, old_probability, new_probability],
      i,
    ) => ({
      ...base(`history-${i}`, i + 1),
      opportunity_id: String(opportunity_id),
      from_stage: String(from_stage),
      to_stage: String(to_stage),
      old_probability: Number(old_probability),
      new_probability: Number(new_probability),
      amount: rows.opportunities.find((o) => o.id === opportunity_id)!.amount,
      actor_id: "manager",
    }),
  );
  // Current stage age must reconcile with its most recent historical transition.
  for (const event of rows.stage_history) {
    const opportunity = rows.opportunities.find(
      (o) => o.id === event.opportunity_id,
    );
    if (opportunity) opportunity.stage_entered_at = event.created_at;
  }
  rows.workflow_rules = [
    ["stale", "Flag inactive opportunities", "inactive_14d", "notify"],
    ["overdue", "Flag overdue close dates", "past_close_date", "notify"],
    ["critical", "Surface support escalation", "critical_case", "notify"],
    ["review", "Enterprise negotiation review", "negotiation", "review_task"],
  ].map(([id, name, condition, action]) => ({
    ...base(id),
    name,
    definition: JSON.stringify({ condition, action }),
    enabled: 1,
  }));
  for (const key of [
    "recommendations",
    "agent_runs",
    "quality_issues",
    "audit_events",
    "workflow_runs",
    "notifications",
    "memories",
    "ai_requests",
    "approvals",
    "intelligence_snapshots",
    "recommendation_feedback",
    "ingestion_events",
    "activity_contacts",
  ])
    rows[key] = [];
  const data = rows as unknown as Dataset;
  rows.recommendations = deriveRecommendations(data, now).map((r) => ({
    ...base(r.id, 0),
    ...r,
    status: "pending",
    snoozed_until: null,
    outcome: null,
  }));
  rows.quality_issues = quality(data, now).map((i) => ({
    ...base(i.id, 0),
    ...i,
    status: "open",
  }));
  rows.agent_runs = agentCatalog
    .filter((a) => !["Lead Qualification", "Forecast"].includes(a.name))
    .map((a, i) => ({
      ...base(`initial-agent-${i}`, 0),
      agent: a.name,
      trigger: "synthetic workspace initialization",
      records_reviewed:
        a.name === "Customer Health"
          ? rows.accounts.length
          : ["Duplicate Detection", "CRM Data Quality"].includes(a.name)
            ? rows.accounts.length +
              rows.contacts.length +
              rows.opportunities.length
            : rows.opportunities.length,
      result: [
        "Duplicate Detection",
        "CRM Data Quality",
        "Pipeline Hygiene",
      ].includes(a.name)
        ? `${rows.quality_issues.filter((q) => a.name === "CRM Data Quality" || (a.name === "Duplicate Detection" ? String(q.kind).startsWith("duplicate") : q.entity_type === "opportunities")).length} source-backed quality findings.`
        : `${rows.recommendations.filter((r) => r.agent === a.name).length} recommendation candidates generated.`,
      confidence: "Rule coverage only; not statistical confidence",
      status: "completed",
      approval_required: 1,
    }));
  rows.audit_events = [
    {
      ...base("seed-audit", 0),
      actor_id: "system",
      action: "workspace.seeded",
      entity_type: "workspaces",
      entity_id: workspace,
      detail: "Isolated synthetic scenario initialized. No real customer data.",
      request_id: crypto.randomUUID(),
    },
  ];
  rows.intelligence_snapshots = [
    ...syntheticHistory(data, workspace, now),
    ...snapshotRows(data, workspace, now),
  ];
  return rows;
}
