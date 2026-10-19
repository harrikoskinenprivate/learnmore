"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { replaceStudentAccessKey } from "@/lib/access-keys";
import { saveLearningCard } from "@/lib/learning-cards";
import { createStudent, removeStudent } from "@/lib/students";
import type { FormState } from "@/lib/types";

export async function addStudent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await createStudent({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!result.error) {
    revalidatePath("/");
  }

  return result;
}

export async function renewStudentAccessKey(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const result = await replaceStudentAccessKey(id);

  if (!result.error) {
    revalidatePath("/");
    revalidatePath(`/oppilaat/${id}`);
  }

  return result;
}

export async function saveStudentLearningCard(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const result = await saveLearningCard({
    studentId: id,
    level: String(formData.get("level") ?? ""),
    strengths: String(formData.get("strengths") ?? ""),
    developmentAreas: String(formData.get("developmentAreas") ?? ""),
    goals: String(formData.get("goals") ?? ""),
  });

  if (!result.error) {
    revalidatePath("/");
    revalidatePath(`/oppilaat/${id}`);
  }

  return result;
}

export async function deleteStudent(formData: FormData): Promise<void> {
  const result = await removeStudent(String(formData.get("id") ?? ""));
  revalidatePath("/");
  if (!result.error) {
    redirect("/");
  }
}
