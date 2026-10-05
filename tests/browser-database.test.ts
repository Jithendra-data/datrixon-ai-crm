import test from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { readFileSync, readdirSync } from "node:fs";
import { browserDatabase } from "../lib/crm/browser-database";
import { insert, loadData } from "../lib/crm/repository";
import { seedRows } from "../lib/crm/seed";
import { mutate } from "../lib/crm/service";
import { analytics } from "../lib/crm/intelligence";
test("Pages SQLite adapter uses real migrations, shared services and transaction rollback", async () => {
  const SQL = await initSqlJs();
  const sql = new SQL.Database();
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sql.run(readFileSync(`drizzle/${file}`, "utf8"));
  const db = browserDatabase(sql);
  const now = new Date();
  const rows = seedRows("pages", now);
  const statements = [
    insert(db, "workspaces", {
      id: "pages",
      name: "Test",
      kind: "synthetic",
      created_at: now.toISOString(),
      expires_at: "2099-01-01",
    }),
  ];
  for (const [table, items] of Object.entries(rows))
    for (const row of items) statements.push(insert(db, table, row));
  await db.batch(statements);
  const data = await loadData(db, "pages");
  assert.equal(analytics(data).pipeline, 247900000);
  const session = {
    workspace_id: "pages",
    user: data.users.find((u) => u.id === "manager")!,
    expires_at: "2099-01-01",
  };
  await mutate(
    db,
    session,
    {
      action: "create_opportunity",
      account_id: "a1",
      name: "Browser service test",
      amount: 100000,
      close_date: "2030-01-01",
      next_action: "Schedule meeting",
    },
    "pages-test",
  );
  assert.equal(
    (await loadData(db, "pages")).opportunities.length,
    data.opportunities.length + 1,
  );
  await assert.rejects(
    db.batch([
      db.prepare("UPDATE accounts SET name='Should roll back' WHERE id='a1'"),
      db.prepare(
        "INSERT INTO contacts(workspace_id,id,account_id,name) VALUES('pages','bad','missing','Broken')",
      ),
    ]),
  );
  assert.notEqual(
    (await loadData(db, "pages")).accounts.find((a) => a.id === "a1")!.name,
    "Should roll back",
  );
  const bytes = sql.export();
  const restored = new SQL.Database(bytes);
  assert.equal(
    (await loadData(browserDatabase(restored), "pages")).opportunities.length,
    data.opportunities.length + 1,
  );
  sql.close();
  restored.close();
});
