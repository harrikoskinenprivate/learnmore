import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { newAccessKey, studentAccessUrl } from "@/lib/access-keys";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { learningCards, studentAccessKeys, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import type { FormState, LearningCard, StudentListItem, StudentProfile } from "@/lib/types";
import {
  isUuid,
  normalizeEmail,
  validateEmail,
  validateName,
} from "@/lib/validation";

export async function listStudents(): Promise<StudentListItem[]> {
  await requireTeacher();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(asc(users.name));
}

function toLearningCard(row: {
  level: string | null;
  strengths: string | null;
  developmentAreas: string | null;
  goals: string | null;
  updatedAt: Date | null;
}): LearningCard {
  if (row.updatedAt === null) {
    return {
      level: "",
      strengths: "",
      developmentAreas: "",
      goals: "",
      updatedAt: null,
    };
  }

  return {
    level: row.level ?? "",
    strengths: row.strengths ?? "",
    developmentAreas: row.developmentAreas ?? "",
    goals: row.goals ?? "",
    updatedAt: row.updatedAt,
  };
}

export async function getStudentProfile(id: string): Promise<StudentProfile> {
  await requireTeacher();
  if (!isUuid(id)) {
    notFound();
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      level: learningCards.level,
      strengths: learningCards.strengths,
      developmentAreas: learningCards.developmentAreas,
      goals: learningCards.goals,
      cardUpdatedAt: learningCards.updatedAt,
      accessKeyStudentId: studentAccessKeys.studentId,
    })
    .from(users)
    .leftJoin(learningCards, eq(learningCards.studentId, users.id))
    .leftJoin(studentAccessKeys, eq(studentAccessKeys.studentId, users.id))
    .where(and(eq(users.id, id), eq(users.role, "student")))
    .limit(1);

  const row = rows[0];
  if (!row) {
    notFound();
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    hasAccessKey: row.accessKeyStudentId !== null,
    card: toLearningCard({
      level: row.level,
      strengths: row.strengths,
      developmentAreas: row.developmentAreas,
      goals: row.goals,
      updatedAt: row.cardUpdatedAt,
    }),
  };
}

export async function createStudent(input: {
  name: string;
  email: string;
}): Promise<FormState> {
  await requireTeacher();

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const nameError = validateName(name);
  if (nameError) {
    return { error: nameError };
  }
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  const id = randomUUID();
  const { token, keyHash } = newAccessKey();
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id,
        name,
        email,
        passwordHash,
        role: "student",
      });
      await tx.insert(studentAccessKeys).values({
        studentId: id,
        keyHash,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Tämä sähköposti on jo käytössä." };
    }
    throw error;
  }

  return {
    message: "Oppilas lisätty.",
    accessUrl: await studentAccessUrl(token),
  };
}

export async function removeStudent(id: string): Promise<FormState> {
  await requireTeacher();

  if (!isUuid(id)) {
    return { error: "Oppilasta ei löydy." };
  }

  const removed = await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.role, "student")))
    .returning({ id: users.id });

  if (!removed[0]) {
    return { error: "Oppilasta ei löydy." };
  }

  return { message: "Oppilas poistettu." };
}
