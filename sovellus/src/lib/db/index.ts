import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";

import { openPostgres } from "./connection";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL puuttuu.");
}

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof openPostgres> };

const sql =
  globalForDb.sql ??
  openPostgres(databaseUrl, Number(process.env.DATABASE_POOL_MAX ?? 5));

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export const db = drizzle(sql, { schema });
