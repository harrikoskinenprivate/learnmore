import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, studentAccessKeys, users } from "@/lib/db/schema";
import type { FormState } from "@/lib/types";
import { isUuid } from "@/lib/validation";

const ACCESS_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashAccessKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newAccessKey(): { token: string; keyHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, keyHash: hashAccessKey(token) };
}

export async function studentAccessUrl(token: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    throw new Error("Osoitetta ei voi muodostaa.");
  }
  const forwardedProto = headerList.get("x-forwarded-proto");
  const proto = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/avain/${token}`;
}

export async function redeemAccessKey(token: string): Promise<string | null> {
  if (!ACCESS_KEY_PATTERN.test(token)) {
    return null;
  }

  const rows = await db
    .select({
      studentId: studentAccessKeys.studentId,
      role: users.role,
    })
    .from(studentAccessKeys)
    .innerJoin(users, eq(users.id, studentAccessKeys.studentId))
    .where(eq(studentAccessKeys.keyHash, hashAccessKey(token)))
    .limit(1);

  const row = rows[0];
  if (!row || row.role !== "student") {
    return null;
  }

  return row.studentId;
}

export async function replaceStudentAccessKey(studentId: string): Promise<FormState> {
  await requireTeacher();

  if (!isUuid(studentId)) {
    return { error: "Oppilasta ei löydy." };
  }

  const students = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")))
    .limit(1);

  if (!students[0]) {
    return { error: "Oppilasta ei löydy." };
  }

  const { token, keyHash } = newAccessKey();
  const createdAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(studentAccessKeys)
      .values({ studentId, keyHash, createdAt })
      .onConflictDoUpdate({
        target: studentAccessKeys.studentId,
        set: { keyHash, createdAt },
      });
    await tx.delete(sessions).where(eq(sessions.userId, studentId));
  });

  return {
    message: "Linkki luotu.",
    accessUrl: await studentAccessUrl(token),
  };
}
