import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

function statements(body: string): string[] {
  return body
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function main(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const dir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await sql<{ id: string }[]>`
      SELECT id FROM schema_migrations WHERE id = ${file}
    `;
    if (applied.length > 0) {
      console.log(`Ohitetaan ${file}`);
      continue;
    }

    const body = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      for (const statement of statements(body)) {
        await tx.unsafe(statement);
      }
      await tx`INSERT INTO schema_migrations (id) VALUES (${file})`;
    });
    console.log(`Ajettiin ${file}`);
  }

  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
