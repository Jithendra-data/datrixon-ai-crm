import { serverProvider } from "../../../lib/crm/narrative.server";
import { env } from "cloudflare:workers";
import {
  type Database,
  insert,
  loadData,
  sessionFor,
  audit,
} from "../../../lib/crm/repository";
import {
  AppError,
  hashToken,
  newToken,
  publicData,
  requireSameOrigin,
} from "../../../lib/crm/security";
import { seedRows } from "../../../lib/crm/seed";
import { mutate } from "../../../lib/crm/service";
import { analytics } from "../../../lib/crm/intelligence";
import { z } from "zod";
export const dynamic = "force-dynamic";
function db() {
  if (!env.DB)
    throw new AppError(
      503,
      "Database unavailable. Apply migrations and configure DB.",
    );
  return env.DB as unknown as Database;
}
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};
async function limit(
  database: Database,
  key: string,
  max: number,
  expires: string,
) {
  const row = await database
    .prepare(
      "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(key, expires)
    .first<{ count: number }>();
  if (!row || row.count > max)
    throw new AppError(
      429,
      "Demo request limit reached. Please try again later.",
    );
}
async function handle(req: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  console.info(
    JSON.stringify({
      event: "request_started",
      request_id: requestId,
      method: req.method,
      path: new URL(req.url).pathname,
    }),
  );
  try {
    const path = new URL(req.url).pathname;
    const database = db();
    if (req.method === "GET" && path === "/api/health") {
      await database.prepare("SELECT 1").first();
      return Response.json(
        { status: "ok", database: "reachable", version: "1.0.0" },
        { headers },
      );
    }
    if (req.method === "POST") requireSameOrigin(req);
    if (req.method === "POST" && path === "/api/demo") {
      if (env.DEMO_ENABLED === "false")
        throw new AppError(403, "Demo provisioning is disabled.");
      // Resume valid sessions instead of creating another workspace on refresh.
      try {
        const current = await sessionFor(database, req);
        return Response.json(
          { ok: true, workspace_id: current.workspace_id },
          { headers },
        );
      } catch (error) {
        if (!(error instanceof AppError && error.status === 401)) throw error;
      }
      await limit(
        database,
        "provision:" + new Date().toISOString().slice(0, 10),
        100,
        new Date(Date.now() + 86400000).toISOString(),
      );
      const workspace = crypto.randomUUID();
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 3600000).toISOString();
      const token = newToken();
      const rows = seedRows(workspace, now);
      const statements = [
        insert(database, "workspaces", {
          id: workspace,
          name: "Datrixon synthetic workspace",
          kind: "synthetic",
          created_at: now.toISOString(),
          expires_at: expires,
        }),
      ];
      for (const [table, items] of Object.entries(rows))
        for (const row of items) statements.push(insert(database, table, row));
      statements.push(
        insert(database, "sessions", {
          token_hash: await hashToken(token),
          workspace_id: workspace,
          user_id: "manager",
          created_at: now.toISOString(),
          expires_at: expires,
        }),
      );
      await database.batch(statements);
      return Response.json(
        { ok: true, workspace_id: workspace },
        {
          headers: {
            ...headers,
            "Set-Cookie": `datrixon_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
          },
        },
      );
    }
    const session = await sessionFor(database, req);
    console.info(
      JSON.stringify({
        event: "session_resolved",
        request_id: requestId,
        duration_ms: Date.now() - started,
      }),
    );
    if (req.method === "POST")
      await limit(
        database,
        session.workspace_id + ":" + new Date().toISOString().slice(0, 16),
        30,
        new Date(Date.now() + 3600000).toISOString(),
      );
    if (req.method === "GET" && path === "/api/workspace") {
      const data = publicData(
        await loadData(database, session.workspace_id),
        session.user,
      );
      console.info(
        JSON.stringify({
          event: "workspace_loaded",
          request_id: requestId,
          duration_ms: Date.now() - started,
        }),
      );
      return Response.json(
        {
          data,
          user: session.user,
          expires_at: session.expires_at,
          as_of: new Date().toISOString(),
          metrics: analytics(data),
          ai: {
            provider: "deterministic",
            narrative_configured: !!serverProvider(
              env as unknown as Record<string, unknown>,
            ),
            mode: "Approved semantic queries; optional configured server narrative",
          },
          synthetic: true,
        },
        { headers },
      );
    }
    if (req.method === "GET" && path === "/api/search") {
      const q = (new URL(req.url).searchParams.get("q") || "")
        .slice(0, 100)
        .toLowerCase();
      const page = Math.max(
        1,
        Math.min(100, Number(new URL(req.url).searchParams.get("page")) || 1),
      );
      const data = publicData(
        await loadData(database, session.workspace_id),
        session.user,
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
      return Response.json(
        {
          results: results.slice((page - 1) * 20, page * 20),
          total: results.length,
          page,
          page_size: 20,
        },
        { headers },
      );
    }
    if (req.method === "POST") {
      if (Number(req.headers.get("content-length") || 0) > 12000)
        throw new AppError(413, "Request too large.");
      const raw = await req.text();
      if (raw.length > 12000) throw new AppError(413, "Request too large.");
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new AppError(400, "Invalid JSON.");
      }
      if (path === "/api/persona") {
        const parsed = z
          .object({ user_id: z.string().max(80) })
          .strict()
          .safeParse(body);
        if (!parsed.success) throw new AppError(400, "Invalid persona.");
        const workspace = await database
          .prepare("SELECT kind FROM workspaces WHERE id=?")
          .bind(session.workspace_id)
          .first<{ kind: string }>();
        if (workspace?.kind !== "synthetic" || env.DEMO_ENABLED === "false")
          throw new AppError(
            403,
            "Persona switching is restricted to synthetic demos.",
          );
        const user = await database
          .prepare("SELECT id FROM users WHERE workspace_id=? AND id=?")
          .bind(session.workspace_id, parsed.data.user_id)
          .first();
        if (!user) throw new AppError(404, "Persona not found.");
        const token = req.headers
          .get("cookie")!
          .split(";")
          .map((x) => x.trim())
          .find((x) => x.startsWith("datrixon_session="))!
          .slice(17);
        await database.batch([
          database
            .prepare("UPDATE sessions SET user_id=? WHERE token_hash=?")
            .bind(parsed.data.user_id, await hashToken(token)),
          audit(
            database,
            session,
            "demo.persona_changed",
            "users",
            parsed.data.user_id,
            "Synthetic role simulation only.",
            requestId,
          ),
        ]);
        return Response.json({ ok: true }, { headers });
      }
      if (path === "/api/actions")
        return Response.json(
          await mutate(
            database,
            session,
            body,
            requestId,
            serverProvider(env as unknown as Record<string, unknown>),
          ),
          {
            headers,
          },
        );
      if (path === "/api/logout") {
        const token = req.headers
          .get("cookie")!
          .split(";")
          .map((x) => x.trim())
          .find((x) => x.startsWith("datrixon_session="))!
          .slice(17);
        await database
          .prepare("DELETE FROM sessions WHERE token_hash=?")
          .bind(await hashToken(token))
          .run();
        return Response.json(
          { ok: true },
          {
            headers: {
              ...headers,
              "Set-Cookie":
                "datrixon_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
            },
          },
        );
      }
    }
    throw new AppError(404, "API route not found.");
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    console.error(
      JSON.stringify({
        event: "request_error",
        request_id: requestId,
        status,
        duration_ms: Date.now() - started,
        error_type: error instanceof Error ? error.name : "Unknown",
      }),
    );
    return Response.json(
      {
        error:
          status === 500
            ? "An internal error occurred. Retry or contact the operator."
            : (error as Error).message,
        request_id: requestId,
      },
      { status, headers },
    );
  }
}
export const GET = handle;
export const POST = handle;
