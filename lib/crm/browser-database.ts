import type { Database as SQLiteDatabase } from "sql.js";
import type { Database, Statement, SqlValue } from "./repository";

/** Real SQLite transactions, shared by the Pages demo and its adapter tests. */
export function browserDatabase(sql: SQLiteDatabase): Database {
  sql.run("PRAGMA foreign_keys=ON");
  class Prepared implements Statement {
    constructor(
      readonly query: string,
      readonly values: SqlValue[] = [],
    ) {}
    bind(...values: SqlValue[]) {
      return new Prepared(this.query, values);
    }
    async all<T>() {
      const statement = sql.prepare(this.query);
      try {
        statement.bind(this.values);
        const results: T[] = [];
        while (statement.step()) results.push(statement.getAsObject() as T);
        return { results };
      } finally {
        statement.free();
      }
    }
    async first<T>() {
      return (await this.all<T>()).results[0] ?? null;
    }
    async run() {
      if (/^\s*SELECT\b/i.test(this.query)) return this.all();
      sql.run(this.query, this.values);
      return { success: true, meta: { changes: sql.getRowsModified() } };
    }
  }
  return {
    prepare: (query) => new Prepared(query),
    async batch(statements) {
      sql.run("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.run("COMMIT");
        return results;
      } catch (error) {
        sql.run("ROLLBACK");
        throw error;
      }
    },
  };
}
