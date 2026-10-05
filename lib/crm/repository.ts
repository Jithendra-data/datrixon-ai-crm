import type { Dataset, Session, User } from "./types";
import { AppError, hashToken } from "./security";
export type SqlValue = string | number | null;
export interface Statement {
  bind(...values: SqlValue[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}
export const tableNames: (keyof Dataset)[] = [
  "accounts",
  "contacts",
  "opportunities",
  "activities",
  "users",
  "stages",
  "tasks",
  "cases",
  "notes",
  "products",
  "orders",
  "order_lines",
  "stage_history",
  "stakeholders",
  "recommendations",
  "agent_runs",
  "audit_events",
  "quality_issues",
  "workflow_rules",
  "workflow_runs",
  "notifications",
  "memories",
  "ai_requests",
  "approvals",
  "leads",
  "campaigns",
  "quotes",
  "quote_lines",
];
export async function loadData(
  db: Database,
  workspace: string,
): Promise<Dataset> {
  // One transactional read batch avoids 28 separate database round trips and
  // gives analytics a consistent snapshot of the workspace.
  const batches = (await db.batch(
    tableNames.map((table) =>
      db
        .prepare(
          `SELECT * FROM ${table} WHERE workspace_id = ? ORDER BY created_at DESC, id LIMIT 2001`,
        )
        .bind(workspace),
    ),
  )) as { results: unknown[] }[];
  const results = tableNames.map((table, index) => {
    const rows = batches[index].results;
    if (rows.length > 2000)
      throw new AppError(
        422,
        "Reference workspace capacity reached. Analytics will not silently truncate records.",
      );
    return [table, rows];
  });
  const data = Object.fromEntries(results) as Dataset;
  data.stages.sort((a, b) => a.position - b.position);
  return data;
}
export function insert(
  db: Database,
  table: string,
  row: Record<string, SqlValue>,
  ignore = false,
) {
  if (
    ![
      ...tableNames,
      "teams",
      "territories",
      "tags",
      "account_tags",
      "data_sources",
      "sessions",
      "workspaces",
    ].includes(table)
  )
    throw new Error("Unknown table");
  const cols = Object.keys(row);
  if (cols.some((c) => !/^[a-z_]+$/.test(c))) throw new Error("Invalid column");
  return db
    .prepare(
      `INSERT ${ignore ? "OR IGNORE " : ""}INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
    )
    .bind(...Object.values(row));
}
export function baseRow(
  workspace: string,
  id = crypto.randomUUID(),
  now = new Date().toISOString(),
) {
  return {
    workspace_id: workspace,
    id,
    created_at: now,
    updated_at: now,
    source: "application",
    metadata: "{}",
  };
}
export function audit(
  db: Database,
  s: Session,
  action: string,
  entity: string,
  id: string,
  detail: string,
  requestId: string,
) {
  return insert(db, "audit_events", {
    ...baseRow(s.workspace_id),
    actor_id: s.user.id,
    action,
    entity_type: entity,
    entity_id: id,
    detail,
    request_id: requestId,
  });
}
export async function sessionFor(
  db: Database,
  request: Request,
): Promise<Session> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("datrixon_session="))
    ?.slice(17);
  if (!token || token.length > 200)
    throw new AppError(401, "Start an isolated demo workspace to continue.");
  const s = await db
    .prepare(
      "SELECT workspace_id,user_id,expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?",
    )
    .bind(await hashToken(token), new Date().toISOString())
    .first<{ workspace_id: string; user_id: string; expires_at: string }>();
  if (!s)
    throw new AppError(
      401,
      "Your demo session has expired. Start a new workspace.",
    );
  const user = await db
    .prepare("SELECT * FROM users WHERE workspace_id = ? AND id = ?")
    .bind(s.workspace_id, s.user_id)
    .first<User>();
  if (!user) throw new AppError(401, "Invalid session");
  return { ...s, user };
}
