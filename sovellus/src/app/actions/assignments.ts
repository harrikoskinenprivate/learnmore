"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAssignment,
  publishToStudents,
  returnAssignment,
  reviewReturn,
  saveDraft,
  saveTextResponse,
  updateAssignmentDeadline,
} from "@/lib/assignments";
import type { FormState } from "@/lib/types";

export async function addAssignment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const titles = formData.getAll("linkTitle").map((value) => String(value));
  const urls = formData.getAll("linkUrl").map((value) => String(value));
  const linkCount = Math.max(titles.length, urls.length);
  const links = Array.from({ length: linkCount }, (_, index) => ({
    title: titles[index] ?? "",
    url: urls[index] ?? "",
  }));

  const result = await createAssignment({
    title: String(formData.get("title") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
    links,
    responseKind: String(formData.get("responseKind") ?? ""),
    studentIds: formData.getAll("studentId").map((value) => String(value)),
    mediaIds: formData.getAll("mediaId").map((value) => String(value)),
    deadline: String(formData.get("deadline") ?? ""),
    publish: formData.get("intent") === "publish",
  });

  if (result.error || !result.id) {
    return { error: result.error ?? "Tehtävää ei voitu tallentaa." };
  }

  revalidatePath("/tehtavat");
  revalidatePath("/");
  redirect(`/tehtavat/${result.id}`);
}

export async function saveAssignmentDraft(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const answersByQuestion = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer:")) {
      answersByQuestion.set(key.slice("answer:".length), String(value));
    }
  }

  const returning = formData.get("intent") === "return";
  const result = returning
    ? await returnAssignment({
        assignmentId,
        answersByQuestion,
        body: String(formData.get("body") ?? ""),
      })
    : await saveDraft({ assignmentId, answersByQuestion });
  if (!result.error) {
    revalidatePath(`/tehtavat/${assignmentId}`);
    revalidatePath("/");
    revalidatePath("/tehtavat");
  }
  return result;
}

export async function autosaveTextResponse(
  assignmentId: string,
  body: string,
): Promise<FormState> {
  return saveTextResponse(assignmentId, body);
}

export async function publishAssignment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const result = await publishToStudents({
    assignmentId,
    studentIds: formData.getAll("studentId").map((value) => String(value)),
  });
  if (!result.error) {
    revalidatePath(`/tehtavat/${assignmentId}`);
    revalidatePath("/");
    revalidatePath("/tehtavat");
  }
  return result;
}

export async function saveAssignmentDeadline(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const result = await updateAssignmentDeadline({
    assignmentId,
    deadline: String(formData.get("deadline") ?? ""),
  });
  if (!result.error) {
    revalidatePath(`/tehtavat/${assignmentId}`);
    revalidatePath("/tehtavat");
  }
  return result;
}

export async function markAssignmentReviewed(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const result = await reviewReturn({
    assignmentId,
    studentId: String(formData.get("studentId") ?? ""),
  });
  if (!result.error) {
    revalidatePath(`/tehtavat/${assignmentId}`);
    revalidatePath("/tehtavat");
    revalidatePath("/");
  }
  return result;
}
