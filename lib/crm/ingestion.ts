import { z } from "zod";
import type { Dataset, Session } from "./types";
import { baseRow, insert, audit, type Database } from "./repository";
import { AppError } from "./security";
import { accountMemory } from "./memory";
import { snapshotRows } from "./history";
export const emailSchema = z
  .object({
    action: z.literal("import_email"),
    external_id: z.string().trim().min(1).max(120),
    from: z.string().email().max(254),
    subject: z.string().trim().min(1).max(160),
    body: z.string().max(2000),
    occurred_at: z.string().datetime(),
  })
  .strict();
export async function ingestEmail(
  db: Database,
  s: Session,
  d: Dataset,
  event: z.infer<typeof emailSchema>,
  requestId: string,
) {
  const existing = d.ingestion_events.find(
    (x) => x.provider === "demo-email" && x.external_id === event.external_id,
  );
  const canonical = JSON.stringify({
    ...event,
    from: event.from.toLowerCase(),
  });
  if (existing) {
    if (JSON.parse(existing.metadata).input !== canonical)
      throw new AppError(
        409,
        "External ID already used for different content.",
      );
    return { ok: true, duplicate: true };
  }
  if (Date.parse(event.occurred_at) > Date.now())
    throw new AppError(400, "Future email timestamps are not accepted.");
  const contacts = d.contacts.filter(
    (c) => c.email?.toLowerCase() === event.from.toLowerCase(),
  );
  if (contacts.length !== 1 || !contacts[0].account_id)
    throw new AppError(
      409,
      "Email must match exactly one accessible contact linked to an account. No automatic fuzzy assignment.",
    );
  const contact = contacts[0],
    accountId = contact.account_id!;
  const now = new Date(),
    activityId = crypto.randomUUID();
  const activity = {
    ...baseRow(s.workspace_id, activityId, now.toISOString()),
    source: "demo-email",
    account_id: accountId,
    opportunity_id: null,
    owner_id: s.user.id,
    kind: "email",
    subject: event.subject,
    body: event.body,
    occurred_at: event.occurred_at,
    sentiment: "unknown",
  };
  const after = { ...d, activities: [...d.activities, activity] };
  const memory = accountMemory(after, accountId, now);
  const statements = [
    insert(db, "activities", activity),
    insert(db, "ingestion_events", {
      ...baseRow(s.workspace_id),
      source: "demo-email",
      metadata: JSON.stringify({ input: canonical }),
      provider: "demo-email",
      external_id: event.external_id,
      account_id: accountId,
      contact_id: contact.id,
      activity_id: activityId,
      received_at: now.toISOString(),
      status: "captured",
    }),
    insert(db, "activity_contacts", {
      ...baseRow(s.workspace_id),
      activity_id: activityId,
      contact_id: contact.id,
    }),
    insert(db, "memories", {
      ...baseRow(s.workspace_id),
      account_id: accountId,
      summary: memory.summary,
      evidence: JSON.stringify(memory.evidence),
      method: memory.method,
      metadata: JSON.stringify({ structured: memory }),
    }),
    audit(
      db,
      s,
      "email.demo_ingested",
      "activities",
      activityId,
      "Unverified synthetic email import; exact contact match; no outbound delivery.",
      requestId,
    ),
  ];
  if (d.intelligence_snapshots.length < 1800)
    for (const row of snapshotRows(
      { ...after, accounts: d.accounts.filter((a) => a.id === accountId) },
      s.workspace_id,
      now,
    ))
      statements.push(insert(db, "intelligence_snapshots", row));
  await db.batch(statements);
  return {
    ok: true,
    duplicate: false,
    account_id: accountId,
    activity_id: activityId,
  };
}
