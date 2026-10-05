import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import migration0 from "../drizzle/0000_harsh_speed_demon.sql?raw";
import migration1 from "../drizzle/0001_freezing_patriot.sql?raw";
import { browserDatabase } from "../lib/crm/browser-database";
import { audit, insert, loadData } from "../lib/crm/repository";
import { seedRows } from "../lib/crm/seed";
import { publicData } from "../lib/crm/security";
import { analytics } from "../lib/crm/intelligence";
import { mutate } from "../lib/crm/service";
import type { Session, User } from "../lib/crm/types";

const KEY = "datrixon-pages-v1";
async function initialize() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  let saved: { bytes: string; user: string } | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    /* Storage may be disabled. The in-memory demo still works. */
  }
  const sql = saved
    ? new SQL.Database(
        Uint8Array.from(atob(saved.bytes), (c) => c.charCodeAt(0)),
      )
    : new SQL.Database();
  if (!saved) {
    sql.run(migration0);
    sql.run(migration1);
  }
  const db = browserDatabase(sql);
  let userId = saved?.user || "manager";
  const workspace = "browser-synthetic";
  function persist() {
    const bytes = sql.export();
    // sql.js reopens on export; explicitly restore foreign-key enforcement.
    sql.run("PRAGMA foreign_keys=ON");
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ bytes: btoa(binary), user: userId }),
      );
    } catch {
      /* Persistence is best effort; visible UI labels this a tab-local demo. */
    }
  }
  async function session(): Promise<Session> {
    const user = await db
      .prepare("SELECT * FROM users WHERE workspace_id=? AND id=?")
      .bind(workspace, userId)
      .first<User>();
    if (!user) throw new Error("Start an isolated demo workspace to continue.");
    return {
      workspace_id: workspace,
      user,
      expires_at: "2099-01-01T00:00:00Z",
    };
  }
  return async function request(
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    if (path === "/api/demo") {
      const existing = await db
        .prepare("SELECT id FROM workspaces WHERE id=?")
        .bind(workspace)
        .first();
      if (!existing) {
        const now = new Date();
        const statements = [
          insert(db, "workspaces", {
            id: workspace,
            name: "Browser-local synthetic workspace",
            kind: "synthetic",
            created_at: now.toISOString(),
            expires_at: "2099-01-01T00:00:00Z",
          }),
        ];
        for (const [table, rows] of Object.entries(seedRows(workspace, now)))
          for (const row of rows) statements.push(insert(db, table, row));
        await db.batch(statements);
        persist();
      }
      return { ok: true };
    }
    const s = await session();
    if (path === "/api/actions") {
      const result = await mutate(db, s, body, crypto.randomUUID());
      persist();
      return result;
    }
    if (path === "/api/persona") {
      const id = (body as { user_id?: string })?.user_id;
      if (
        !id ||
        !(await db
          .prepare("SELECT id FROM users WHERE workspace_id=? AND id=?")
          .bind(workspace, id)
          .first())
      )
        throw new Error("Unknown demo persona.");
      await db.batch([
        audit(
          db,
          s,
          "demo.persona_changed",
          "users",
          id,
          "Browser-local role simulation; not authentication.",
          crypto.randomUUID(),
        ),
      ]);
      userId = id;
      persist();
      return { ok: true };
    }
    if (path === "/api/logout") {
      sessionStorage.removeItem(KEY);
      window.location.hash = "/";
      window.location.reload();
      return { ok: true };
    }
    const data = publicData(await loadData(db, workspace), s.user);
    if (path === "/api/workspace")
      return {
        data,
        user: s.user,
        expires_at: s.expires_at,
        as_of: new Date().toISOString(),
        metrics: analytics(data),
        synthetic: true,
      };
    if (path.startsWith("/api/search")) {
      const url = new URL(path, location.origin);
      const q = (url.searchParams.get("q") || "").slice(0, 100).toLowerCase();
      const page = Math.max(
        1,
        Math.min(100, Number(url.searchParams.get("page")) || 1),
      );
      const results = q
        ? (
            [
              "accounts",
              "contacts",
              "opportunities",
              "notes",
              "activities",
              "products",
              "cases",
            ] as const
          ).flatMap((type) =>
            data[type]
              .filter((row) => JSON.stringify(row).toLowerCase().includes(q))
              .map((row) => ({
                type,
                id: row.id,
                label:
                  "name" in row
                    ? row.name
                    : "subject" in row
                      ? row.subject
                      : "body" in row
                        ? row.body
                        : "Record",
                account_id:
                  "account_id" in row
                    ? row.account_id
                    : type === "accounts"
                      ? row.id
                      : null,
              })),
          )
        : [];
      return {
        results: results.slice((page - 1) * 20, page * 20),
        total: results.length,
        page,
        page_size: 20,
      };
    }
    throw new Error("Unknown demo operation.");
  };
}
let runtime: ReturnType<typeof initialize> | undefined;
// Serialize requests to prevent overlapping SQLite transactions in this tab.
let queue: Promise<unknown> = Promise.resolve();
export function demoApi(path: string, body?: unknown): Promise<unknown> {
  const result = queue.then(async () =>
    (await (runtime ??= initialize()))(path, body),
  );
  queue = result.catch(() => undefined);
  return result;
}
