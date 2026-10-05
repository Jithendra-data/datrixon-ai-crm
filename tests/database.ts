import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import type { Database, Statement, SqlValue } from "../lib/crm/repository";
export function testDatabase() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync("drizzle")
    .filter((x) => x.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(`drizzle/${f}`, "utf8"));
  class Prepared implements Statement {
    constructor(
      readonly query: string,
      readonly values: SqlValue[] = [],
    ) {}
    bind(...v: SqlValue[]) {
      return new Prepared(this.query, v);
    }
    async all<T>() {
      return { results: sql.prepare(this.query).all(...this.values) as T[] };
    }
    async first<T>() {
      return (sql.prepare(this.query).get(...this.values) ?? null) as T | null;
    }
    async run() {
      if (/^\s*SELECT\b/i.test(this.query)) return this.all();
      const r = sql.prepare(this.query).run(...this.values);
      return { success: true, meta: { changes: Number(r.changes) } };
    }
  }
  const db: Database = {
    prepare: (q) => new Prepared(q),
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sql.exec("COMMIT");
        return out;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, sql };
}
