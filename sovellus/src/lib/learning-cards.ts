import "server-only";

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireTeacher, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { learningCards, users } from "@/lib/db/schema";
import type { FormState, LearningCard } from "@/lib/types";
import {
  isUuid,
  validateLearningCardLevel,
  validateLearningCardText,
} from "@/lib/validation";

const emptyCard: LearningCard = {
  level: "",
  strengths: "",
  developmentAreas: "",
  goals: "",
  updatedAt: null,
};

export async function getOwnLearningCard(): Promise<LearningCard> {
  const user = await requireUser();
  if (user.role !== "student") {
    notFound();
  }

  const rows = await db
    .select({
      level: learningCards.level,
      strengths: learningCards.strengths,
      developmentAreas: learningCards.developmentAreas,
      goals: learningCards.goals,
      updatedAt: learningCards.updatedAt,
    })
    .from(learningCards)
    .where(eq(learningCards.studentId, user.id))
    .limit(1);

  return rows[0] ?? emptyCard;
}

export async function saveLearningCard(input: {
  studentId: string;
  level: string;
  strengths: string;
  developmentAreas: string;
  goals: string;
}): Promise<FormState> {
  await requireTeacher();

  if (!isUuid(input.studentId)) {
    return { error: "Oppilasta ei löydy." };
  }

  const level = input.level.trim();
  const strengths = input.strengths.trim();
  const developmentAreas = input.developmentAreas.trim();
  const goals = input.goals.trim();

  const levelError = validateLearningCardLevel(level);
  if (levelError) {
    return { error: levelError };
  }
  const strengthsError = validateLearningCardText(strengths, "Vahvuudet");
  if (strengthsError) {
    return { error: strengthsError };
  }
  const developmentError = validateLearningCardText(developmentAreas, "Kehityskohteet");
  if (developmentError) {
    return { error: developmentError };
  }
  const goalsError = validateLearningCardText(goals, "Tavoitteet");
  if (goalsError) {
    return { error: goalsError };
  }

  const students = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, input.studentId), eq(users.role, "student")))
    .limit(1);

  if (!students[0]) {
    return { error: "Oppilasta ei löydy." };
  }

  const updatedAt = new Date();
  await db
    .insert(learningCards)
    .values({
      studentId: input.studentId,
      level,
      strengths,
      developmentAreas,
      goals,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: learningCards.studentId,
      set: {
        level,
        strengths,
        developmentAreas,
        goals,
        updatedAt,
      },
    });

  return { message: "Oppijakortti tallennettu." };
}
