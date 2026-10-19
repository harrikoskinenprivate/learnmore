import { randomUUID } from "node:crypto";

import postgres from "postgres";

import { hashPassword } from "../src/lib/password";

const databaseUrl = process.env.DATABASE_URL;
const name = process.env.TEACHER_NAME?.trim() ?? "";
const email = process.env.TEACHER_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.TEACHER_PASSWORD ?? "";

if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu.");
  process.exit(1);
}

if (!name || !email || password.length < 8) {
  console.error(
    "Aseta TEACHER_NAME, TEACHER_EMAIL ja vähintään 8 merkin TEACHER_PASSWORD.",
  );
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function main(): Promise<void> {
  const teachers = await sql<{ email: string }[]>`
    SELECT email FROM users WHERE role = 'teacher' LIMIT 1
  `;

  if (teachers.length > 0) {
    console.log(`Opettaja on jo olemassa: ${teachers[0].email}`);
    await sql.end();
    return;
  }

  const passwordHash = await hashPassword(password);
  try {
    await sql`
      INSERT INTO users (id, email, name, password_hash, role)
      VALUES (${randomUUID()}, ${email}, ${name}, ${passwordHash}, 'teacher')
    `;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";
    if (code === "23505") {
      console.error("Sähköposti on jo käytössä.");
      process.exitCode = 1;
      await sql.end();
      return;
    }
    throw error;
  }

  console.log(`Opettaja luotu: ${email}`);
  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
