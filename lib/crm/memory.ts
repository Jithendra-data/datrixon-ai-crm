import type { Dataset } from "./types";
import { accountBrief, health, risk, isOpen, DAY } from "./intelligence";
export function accountMemory(d: Dataset, accountId: string, now = new Date()) {
  const a = d.accounts.find((x) => x.id === accountId)!;
  const deals = d.opportunities.filter((o) => o.account_id === accountId);
  const interactions = d.activities
    .filter(
      (x) => x.account_id === accountId && x.occurred_at <= now.toISOString(),
    )
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const brief = accountBrief(a, d, now);
  return {
    version: 1,
    generated_at: now.toISOString(),
    method: "deterministic structured memory",
    summary: brief.summary,
    health: health(a, d, now).score,
    priorities: deals.filter(isOpen).map((o) => ({
      text: o.next_action || "Next action not recorded",
      source: `opportunities:${o.id}`,
    })),
    decision_criteria: deals.map((o) => ({
      text: o.decision_criteria,
      source: `opportunities:${o.id}`,
    })),
    stakeholders: d.contacts
      .filter((c) => c.account_id === accountId)
      .map((c) => ({
        name: c.name,
        role: c.title,
        influence: c.influence,
        source: `contacts:${c.id}`,
      })),
    risks: deals.filter(isOpen).map((o) => ({
      name: o.name,
      score: risk(o, d, now).score,
      factors: risk(o, d, now).factors,
      source: `opportunities:${o.id}`,
    })),
    recent_interactions: interactions.slice(0, 5).map((x) => ({
      subject: x.subject,
      date: x.occurred_at,
      source: `activities:${x.id}`,
    })),
    unknowns: [
      "Customer pain points and objections are not inferred from free text.",
      "Product adoption and verified sentiment are not available.",
    ],
    evidence: brief.evidence,
    fingerprint: memoryFingerprint(d, accountId),
  };
}
export function memoryFingerprint(d: Dataset, id: string) {
  return JSON.stringify(
    [
      "accounts",
      "contacts",
      "opportunities",
      "activities",
      "cases",
      "notes",
      "orders",
      "tasks",
    ]
      .flatMap((table) => {
        const rows = d[table as "activities"] as unknown as {
          id: string;
          account_id?: string;
          updated_at: string;
        }[];
        return rows
          .filter(
            (x) => x.account_id === id || (table === "accounts" && x.id === id),
          )
          .map((x) => `${table}:${x.id}:${x.updated_at}`);
      })
      .sort(),
  );
}
export function memoryStatus(
  metadata: string,
  d: Dataset,
  id: string,
  now = new Date(),
) {
  try {
    const m = JSON.parse(metadata).structured;
    if (!m) return "Legacy memory: refresh required";
    return m.fingerprint !== memoryFingerprint(d, id) ||
      now.getTime() - Date.parse(m.generated_at) > 7 * DAY
      ? "Stale: records changed or older than seven days"
      : "Current against recorded source versions";
  } catch {
    return "Unreadable memory: refresh required";
  }
}
