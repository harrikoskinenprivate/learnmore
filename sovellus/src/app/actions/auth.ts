"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import type { FormState } from "@/lib/types";
import { normalizeEmail } from "@/lib/validation";

const dummyHashPromise = hashPassword("ei-kaytossa-oleva-salasana");

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Tarkista sähköposti ja salasana." };
  }

  const rows = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, await dummyHashPromise);

  if (!user || !passwordOk || user.role !== "teacher") {
    return { error: "Sähköposti tai salasana on väärin." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/kirjaudu");
}
