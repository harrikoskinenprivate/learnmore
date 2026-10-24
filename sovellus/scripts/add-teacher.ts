import { randomUUID } from "node:crypto";

import postgres from "postgres";

import { hashPassword } from "../src/lib/password";
import {
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
} from "../src/lib/validation";

const databaseUrl = process.env.DATABASE_URL;
const name = process.env.TEACHER_NAME?.trim() ?? "";
const email = normalizeEmail(process.env.TEACHER_EMAIL ?? "");
const password = process.env.TEACHER_PASSWORD ?? "";

if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu.");
  process.exit(1);
}

const inputError =
  validateName(name) ?? validateEmail(email) ?? validatePassword(password);

if (inputError) {
  console.error(inputError);
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function main(): Promise<void> {
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
