import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

let _db: Database | null = null;

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });
  _db = db;
  return db;
}

export function getDb(): Database {
  if (!_db) {
    throw new Error("Database not initialized. server.ts must run first.");
  }
  return _db;
}

export { schema };