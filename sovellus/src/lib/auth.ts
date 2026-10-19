import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { readSessionUserId } from "@/lib/session";
import type { CurrentUser } from "@/lib/types";

export async function getOptionalUser(): Promise<CurrentUser | null> {
  const userId = await readSessionUserId();
  if (!userId) {
    return null;
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/kirjaudu");
  }
  return user;
}

export async function requireTeacher(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "teacher") {
    redirect("/");
  }
  return user;
}
