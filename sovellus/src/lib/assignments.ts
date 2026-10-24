import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";

import { requireTeacher, requireUser } from "@/lib/auth";
import { studentTaskLabel, withFeedback } from "@/lib/assignment-labels";
import { formatDeadline, isLate, parseDeadlineInput } from "@/lib/deadline";
import {
  attachMedia,
  listAssignmentMedia,
  MediaError,
  replaceDraftInstructionVideo,
  validateMediaSelection,
} from "@/lib/media";
import { db } from "@/lib/db";
import {
  answers,
  assignmentLinks,
  assignmentMedia,
  assignmentQuestions,
  assignmentResponses,
  assignmentStudents,
  assignments,
  users,
} from "@/lib/db/schema";
import type {
  ArchivedAssignmentPage,
  ArchiveCursor,
  AssignmentMediaItem,
  FormState,
  LinkedAssignment,
  MediaKind,
  ResponseKind,
  StoredResponse,
  StudentAssignmentDetail,
  StudentAssignmentListItem,
  TeacherAssignmentDetail,
  TeacherDraftListItem,
  TeacherWorkItem,
} from "@/lib/types";
import { ARCHIVE_PAGE_SIZE } from "@/lib/types";
import {
  isUuid,
  validateAnswer,
  validateInstructions,
  validateLinkTitle,
  validateTitle,
  validateUrl,
} from "@/lib/validation";

const MAX_LINKS = 15;
const parentAssignment = alias(assignments, "parent_assignment");

function isResponseKind(value: string): value is ResponseKind {
  return value === "text" || value === "image" || value === "video" || value === "audio";
}

function readyMedia(row: {
  mediaId: string | null;
  kind: MediaKind | null;
  mime: string | null;
  status: "pending" | "ready" | null;
} | undefined): AssignmentMediaItem | null {
  if (!row?.mediaId || row.status !== "ready" || !row.kind || !row.mime) {
    return null;
  }
  return { id: row.mediaId, kind: row.kind, mime: row.mime };
}

export type AssignmentLinkInput = { title: string; url: string };

export async function listTeacherDrafts(): Promise<TeacherDraftListItem[]> {
  await requireTeacher();

  return db
    .select({
      id: assignments.id,
      title: assignments.title,
      createdAt: assignments.createdAt,
      deadline: assignments.deadline,
      parentTitle: parentAssignment.title,
    })
    .from(assignments)
    .leftJoin(parentAssignment, eq(parentAssignment.id, assignments.parentAssignmentId))
    .where(eq(assignments.status, "draft"))
    .orderBy(asc(assignments.createdAt));
}

export async function listTeacherWork(): Promise<TeacherWorkItem[]> {
  await requireTeacher();
  const now = new Date();

  const rows = await db
    .select({
      assignmentId: assignments.id,
      title: assignments.title,
      createdAt: assignments.createdAt,
      deadline: assignments.deadline,
      studentId: users.id,
      studentName: users.name,
      returnedAt: assignmentStudents.returnedAt,
      reviewedAt: assignmentStudents.reviewedAt,
      parentTitle: parentAssignment.title,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .innerJoin(users, eq(users.id, assignmentStudents.studentId))
    .leftJoin(parentAssignment, eq(parentAssignment.id, assignments.parentAssignmentId))
    .where(and(eq(assignments.status, "published"), isNull(assignments.archivedAt)))
    .orderBy(asc(assignments.createdAt), asc(users.name));

  return rows.map((row) => ({
    ...row,
    late: isLate(row.deadline, row.returnedAt, now),
  }));
}

export async function listTeacherAssignmentsForStudent(
  studentId: string,
): Promise<TeacherWorkItem[]> {
  await requireTeacher();
  if (!isUuid(studentId)) {
    notFound();
  }

  const now = new Date();
  const rows = await db
    .select({
      assignmentId: assignments.id,
      title: assignments.title,
      createdAt: assignments.createdAt,
      deadline: assignments.deadline,
      studentId: users.id,
      studentName: users.name,
      returnedAt: assignmentStudents.returnedAt,
      reviewedAt: assignmentStudents.reviewedAt,
      parentTitle: parentAssignment.title,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .innerJoin(users, eq(users.id, assignmentStudents.studentId))
    .leftJoin(parentAssignment, eq(parentAssignment.id, assignments.parentAssignmentId))
    .where(
      and(
        eq(assignmentStudents.studentId, studentId),
        eq(assignments.status, "published"),
        isNull(assignments.archivedAt),
      ),
    );

  return rows.map((row) => ({
    ...row,
    late: isLate(row.deadline, row.returnedAt, now),
  }));
}

export async function listStudentAssignments(): Promise<StudentAssignmentListItem[]> {
  const user = await requireUser();
  if (user.role !== "student") {
    notFound();
  }

  const now = new Date();
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      createdAt: assignments.createdAt,
      deadline: assignments.deadline,
      returnedAt: assignmentStudents.returnedAt,
      reviewedAt: assignmentStudents.reviewedAt,
      parentTitle: parentAssignment.title,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .leftJoin(parentAssignment, eq(parentAssignment.id, assignments.parentAssignmentId))
    .where(
      and(
        eq(assignmentStudents.studentId, user.id),
        eq(assignments.status, "published"),
        isNull(assignments.archivedAt),
      ),
    )
    .orderBy(asc(assignments.createdAt));

  const [drafts, responses] = await Promise.all([
    db
      .select({
        assignmentId: answers.assignmentId,
        body: answers.body,
      })
      .from(answers)
      .where(eq(answers.studentId, user.id)),
    db
      .select({
        assignmentId: assignmentResponses.assignmentId,
        body: assignmentResponses.body,
        status: assignmentMedia.status,
      })
      .from(assignmentResponses)
      .leftJoin(assignmentMedia, eq(assignmentMedia.id, assignmentResponses.mediaId))
      .where(eq(assignmentResponses.studentId, user.id)),
  ]);

  const draftIds = new Set(
    drafts.filter((row) => row.body.trim().length > 0).map((row) => row.assignmentId),
  );
  for (const response of responses) {
    if (response.body.trim().length > 0 || response.status === "ready") {
      draftIds.add(response.assignmentId);
    }
  }

  return rows.map((row) => ({
    ...row,
    hasDraft: draftIds.has(row.id),
    late: isLate(row.deadline, row.returnedAt, now),
  }));
}

function formatArchiveDate(value: Date): string {
  return new Intl.DateTimeFormat("fi-FI", { dateStyle: "medium" }).format(value);
}

function archiveCursorFilter(cursor?: ArchiveCursor) {
  if (!cursor) {
    return undefined;
  }
  const archivedAt = new Date(cursor.archivedAt);
  if (!isUuid(cursor.id) || Number.isNaN(archivedAt.getTime())) {
    return undefined;
  }
  return or(
    lt(assignments.archivedAt, archivedAt),
    and(eq(assignments.archivedAt, archivedAt), lt(assignments.id, cursor.id)),
  );
}

export async function listArchivedAssignments(
  cursor?: ArchiveCursor,
): Promise<ArchivedAssignmentPage> {
  const user = await requireUser();
  if (cursor && !archiveCursorFilter(cursor)) {
    return { items: [], nextCursor: null };
  }
  const cursorFilter = archiveCursorFilter(cursor);
  const where = cursorFilter
    ? and(
        eq(assignments.status, "published"),
        isNotNull(assignments.archivedAt),
        cursorFilter,
      )
    : and(eq(assignments.status, "published"), isNotNull(assignments.archivedAt));

  if (user.role === "teacher") {
    const rows = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        deadline: assignments.deadline,
        archivedAt: assignments.archivedAt,
        parentTitle: parentAssignment.title,
      })
      .from(assignments)
      .leftJoin(parentAssignment, eq(parentAssignment.id, assignments.parentAssignmentId))
      .where(where)
      .orderBy(desc(assignments.archivedAt), desc(assignments.id))
      .limit(ARCHIVE_PAGE_SIZE + 1);

    const page = rows.slice(0, ARCHIVE_PAGE_SIZE);
    const last = rows.length > ARCHIVE_PAGE_SIZE ? page[page.length - 1] : null;
    return {
      items: page.flatMap((row) => {
        if (!row.archivedAt) {
          return [];
        }
        const deadline = row.deadline ? ` · Määräaika ${formatDeadline(row.deadline)}` : "";
        return [
          {
            id: row.id,
            title: row.title,
            meta: withFeedback(
              row.parentTitle,
              `Arkistoitu ${formatArchiveDate(row.archivedAt)}${deadline}`,
            ),
          },
        ];
      }),
      nextCursor:
        last?.archivedAt != null
          ? { archivedAt: last.archivedAt.toISOString(), id: last.id }
          : null,
    };
  }

  if (user.role !== "student") {
    notFound();
  }

  const now = new Date();
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      deadline: assignments.deadline,
      archivedAt: assignments.archivedAt,
      returnedAt: assignmentStudents.returnedAt,
      reviewedAt: assignmentStudents.reviewedAt,
      parentTitle: parentAssignment.title,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .leftJoin(parentAssignment, eq(parentAssignment.id, assignments.parentAssignmentId))
    .where(and(eq(assignmentStudents.studentId, user.id), where))
    .orderBy(desc(assignments.archivedAt), desc(assignments.id))
    .limit(ARCHIVE_PAGE_SIZE + 1);

  const page = rows.slice(0, ARCHIVE_PAGE_SIZE);
  const ids = page.map((row) => row.id);
  const draftIds = await draftIdsForStudent(user.id, ids);
  const last = rows.length > ARCHIVE_PAGE_SIZE ? page[page.length - 1] : null;

  return {
    items: page.flatMap((row) => {
      if (!row.archivedAt) {
        return [];
      }
      const deadline = row.deadline ? ` · Määräaika ${formatDeadline(row.deadline)}` : "";
      const label = studentTaskLabel({
        hasDraft: draftIds.has(row.id),
        returnedAt: row.returnedAt,
        reviewedAt: row.reviewedAt,
        late: isLate(row.deadline, row.returnedAt, now),
      });
      return [
        {
          id: row.id,
          title: row.title,
          meta: withFeedback(
            row.parentTitle,
            `${label} · Arkistoitu ${formatArchiveDate(row.archivedAt)}${deadline}`,
          ),
        },
      ];
    }),
    nextCursor:
      last?.archivedAt != null
        ? { archivedAt: last.archivedAt.toISOString(), id: last.id }
        : null,
  };
}

async function draftIdsForStudent(studentId: string, assignmentIds: string[]): Promise<Set<string>> {
  if (assignmentIds.length === 0) {
    return new Set();
  }

  const [drafts, responses] = await Promise.all([
    db
      .select({
        assignmentId: answers.assignmentId,
        body: answers.body,
      })
      .from(answers)
      .where(and(eq(answers.studentId, studentId), inArray(answers.assignmentId, assignmentIds))),
    db
      .select({
        assignmentId: assignmentResponses.assignmentId,
        body: assignmentResponses.body,
        status: assignmentMedia.status,
      })
      .from(assignmentResponses)
      .leftJoin(assignmentMedia, eq(assignmentMedia.id, assignmentResponses.mediaId))
      .where(
        and(
          eq(assignmentResponses.studentId, studentId),
          inArray(assignmentResponses.assignmentId, assignmentIds),
        ),
      ),
  ]);

  const draftIds = new Set(
    drafts.filter((row) => row.body.trim().length > 0).map((row) => row.assignmentId),
  );
  for (const response of responses) {
    if (response.body.trim().length > 0 || response.status === "ready") {
      draftIds.add(response.assignmentId);
    }
  }
  return draftIds;
}

export async function getTeacherAssignment(id: string): Promise<TeacherAssignmentDetail> {
  await requireTeacher();
  if (!isUuid(id)) {
    notFound();
  }

  const assignmentRows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      instructions: assignments.instructions,
      status: assignments.status,
      archivedAt: assignments.archivedAt,
      responseKind: assignments.responseKind,
      parentAssignmentId: assignments.parentAssignmentId,
      deadline: assignments.deadline,
      createdAt: assignments.createdAt,
    })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  const assignment = assignmentRows[0];
  if (!assignment) {
    notFound();
  }

  const now = new Date();
  const [links, questions, recipients, savedAnswers, responses] = await Promise.all([
    db
      .select({
        id: assignmentLinks.id,
        title: assignmentLinks.title,
        url: assignmentLinks.url,
      })
      .from(assignmentLinks)
      .where(eq(assignmentLinks.assignmentId, id))
      .orderBy(asc(assignmentLinks.sortOrder)),
    db
      .select({
        id: assignmentQuestions.id,
        prompt: assignmentQuestions.prompt,
      })
      .from(assignmentQuestions)
      .where(eq(assignmentQuestions.assignmentId, id))
      .orderBy(asc(assignmentQuestions.sortOrder)),
    db
      .select({
        id: users.id,
        name: users.name,
        returnedAt: assignmentStudents.returnedAt,
        reviewedAt: assignmentStudents.reviewedAt,
      })
      .from(assignmentStudents)
      .innerJoin(users, eq(users.id, assignmentStudents.studentId))
      .where(eq(assignmentStudents.assignmentId, id))
      .orderBy(asc(users.name)),
    db
      .select({
        studentId: answers.studentId,
        questionId: answers.questionId,
        body: answers.body,
      })
      .from(answers)
      .where(eq(answers.assignmentId, id)),
    db
      .select({
        studentId: assignmentResponses.studentId,
        body: assignmentResponses.body,
        mediaId: assignmentMedia.id,
        kind: assignmentMedia.kind,
        mime: assignmentMedia.mime,
        status: assignmentMedia.status,
      })
      .from(assignmentResponses)
      .leftJoin(assignmentMedia, eq(assignmentMedia.id, assignmentResponses.mediaId))
      .where(eq(assignmentResponses.assignmentId, id)),
  ]);

  const responseByStudent = new Map(responses.map((row) => [row.studentId, row]));

  const media = await listAssignmentMedia(id);
  const context = await loadParentAndFeedback(id, assignment.parentAssignmentId);

  return {
    ...assignment,
    parent: context.parent,
    feedback: context.feedback,
    links,
    media,
    questions,
    students: recipients.map((student) => ({
      ...student,
      late: isLate(assignment.deadline, student.returnedAt, now),
      answers:
        student.returnedAt && !assignment.responseKind
          ? questions.map((question) => ({
              questionId: question.id,
              prompt: question.prompt,
              body:
                savedAnswers.find(
                  (answer) =>
                    answer.studentId === student.id && answer.questionId === question.id,
                )?.body ?? "",
            }))
          : [],
      response:
        student.returnedAt && assignment.responseKind
          ? {
              body: responseByStudent.get(student.id)?.body ?? "",
              media: readyMedia(responseByStudent.get(student.id)),
            }
          : null,
    })),
  };
}

export async function getTeacherStudentWork(studentId: string, assignmentId: string) {
  if (!isUuid(studentId) || !isUuid(assignmentId)) {
    notFound();
  }

  const assignment = await getTeacherAssignment(assignmentId);
  const student = assignment.students.find((item) => item.id === studentId);
  if (!student) {
    notFound();
  }

  const context = await loadParentAndFeedback(
    assignment.id,
    assignment.parent?.id ?? null,
    studentId,
  );
  return { ...assignment, feedback: context.feedback, student };
}

export async function getStudentAssignment(id: string): Promise<StudentAssignmentDetail> {
  const user = await requireUser();
  if (user.role !== "student" || !isUuid(id)) {
    notFound();
  }

  const allowed = await db
    .select({
      returnedAt: assignmentStudents.returnedAt,
      reviewedAt: assignmentStudents.reviewedAt,
      archivedAt: assignments.archivedAt,
      deadline: assignments.deadline,
      responseKind: assignments.responseKind,
      parentAssignmentId: assignments.parentAssignmentId,
      id: assignments.id,
      title: assignments.title,
      instructions: assignments.instructions,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .where(
      and(
        eq(assignmentStudents.assignmentId, id),
        eq(assignmentStudents.studentId, user.id),
        eq(assignments.status, "published"),
      ),
    )
    .limit(1);

  const assignment = allowed[0];
  if (!assignment) {
    notFound();
  }

  const [links, questions, saved, media, responseRows] = await Promise.all([
    db
      .select({
        id: assignmentLinks.id,
        title: assignmentLinks.title,
        url: assignmentLinks.url,
      })
      .from(assignmentLinks)
      .where(eq(assignmentLinks.assignmentId, id))
      .orderBy(asc(assignmentLinks.sortOrder)),
    db
      .select({
        id: assignmentQuestions.id,
        prompt: assignmentQuestions.prompt,
      })
      .from(assignmentQuestions)
      .where(eq(assignmentQuestions.assignmentId, id))
      .orderBy(asc(assignmentQuestions.sortOrder)),
    db
      .select({
        questionId: answers.questionId,
        body: answers.body,
      })
      .from(answers)
      .where(and(eq(answers.assignmentId, id), eq(answers.studentId, user.id))),
    listAssignmentMedia(id),
    db
      .select({
        body: assignmentResponses.body,
        mediaId: assignmentMedia.id,
        kind: assignmentMedia.kind,
        mime: assignmentMedia.mime,
        status: assignmentMedia.status,
      })
      .from(assignmentResponses)
      .leftJoin(assignmentMedia, eq(assignmentMedia.id, assignmentResponses.mediaId))
      .where(
        and(
          eq(assignmentResponses.assignmentId, id),
          eq(assignmentResponses.studentId, user.id),
        ),
      )
      .limit(1),
  ]);

  const context = await loadParentAndFeedback(id, assignment.parentAssignmentId, user.id);
  const answerByQuestion = new Map(saved.map((row) => [row.questionId, row.body]));
  const response: StoredResponse = {
    body: responseRows[0]?.body ?? "",
    media: readyMedia(responseRows[0]),
  };
  const hasQuestionDraft = [...answerByQuestion.values()].some((body) => body.trim().length > 0);
  const hasTypedDraft =
    assignment.responseKind === "text"
      ? response.body.trim().length > 0
      : response.media !== null;

  return {
    id: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions,
    deadline: assignment.deadline,
    links,
    media,
    responseKind: assignment.responseKind,
    parent: context.parent,
    feedback: context.feedback,
    questions: questions.map((question) => ({
      ...question,
      answer: answerByQuestion.get(question.id) ?? "",
    })),
    response,
    hasDraft: assignment.responseKind ? hasTypedDraft : hasQuestionDraft,
    returnedAt: assignment.returnedAt,
    reviewedAt: assignment.reviewedAt,
    archivedAt: assignment.archivedAt,
    late: isLate(assignment.deadline, assignment.returnedAt, new Date()),
  };
}

export async function createAssignment(input: {
  title: string;
  instructions: string;
  links: AssignmentLinkInput[];
  responseKind: string;
  studentIds: string[];
  mediaIds: string[];
  deadline: string;
  publish: boolean;
  parentAssignmentId?: string;
}): Promise<FormState & { id?: string }> {
  const teacher = await requireTeacher();

  const title = input.title.trim();
  const instructions = input.instructions.trim();
  const titleError = validateTitle(title);
  if (titleError) {
    return { error: titleError };
  }
  const instructionsError = validateInstructions(instructions);
  if (instructionsError) {
    return { error: instructionsError };
  }

  const links: AssignmentLinkInput[] = [];
  for (const link of input.links) {
    const linkTitle = link.title.trim();
    const url = link.url.trim();
    if (!linkTitle && !url) {
      continue;
    }
    const linkTitleError = validateLinkTitle(linkTitle);
    if (linkTitleError) {
      return { error: linkTitleError };
    }
    const urlError = validateUrl(url);
    if (urlError) {
      return { error: urlError };
    }
    links.push({ title: linkTitle, url });
  }
  if (links.length > MAX_LINKS) {
    return { error: "Linkkejä voi olla enintään 15." };
  }

  if (!isResponseKind(input.responseKind)) {
    return { error: "Valitse palautustapa." };
  }
  const responseKind = input.responseKind;

  const deadline = parseDeadlineInput(input.deadline);
  if (deadline === "invalid") {
    return { error: "Anna kelvollinen määräaika." };
  }

  const studentIds = [...new Set(input.studentIds.filter(isUuid))];
  if (input.publish && studentIds.length < 1) {
    return { error: "Valitse vähintään yksi oppilas." };
  }

  const students =
    studentIds.length === 0
      ? []
      : await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "student"), inArray(users.id, studentIds)));

  if (input.publish && students.length !== studentIds.length) {
    return { error: "Valitse oppilaat uudelleen." };
  }

  const parentAssignmentId = input.parentAssignmentId?.trim() ?? "";
  const parentError = await feedbackStudentError(
    parentAssignmentId,
    input.publish ? studentIds : [],
  );
  if (parentError) {
    return { error: parentError };
  }

  let mediaIds: string[];
  try {
    mediaIds = await validateMediaSelection(teacher.id, input.mediaIds);
  } catch (error) {
    if (error instanceof MediaError) {
      return { error: error.message };
    }
    throw error;
  }

  const assignmentId = randomUUID();
  try {
    await db.transaction(async (tx) => {
    await tx.insert(assignments).values({
      id: assignmentId,
      title,
      instructions,
      createdBy: teacher.id,
      status: input.publish ? "published" : "draft",
      responseKind,
      parentAssignmentId: parentAssignmentId || null,
      deadline,
    });

    if (links.length > 0) {
      await tx.insert(assignmentLinks).values(
        links.map((link, index) => ({
          id: randomUUID(),
          assignmentId,
          title: link.title,
          url: link.url,
          sortOrder: index,
        })),
      );
    }

    if (input.publish) {
      await tx.insert(assignmentStudents).values(
        studentIds.map((studentId) => ({
          assignmentId,
          studentId,
        })),
      );
    }

      if (mediaIds.length > 0) {
        await attachMedia(tx, {
          assignmentId,
          teacherId: teacher.id,
          mediaIds,
        });
      }
    });
  } catch (error) {
    if (error instanceof MediaError) {
      return { error: error.message };
    }
    throw error;
  }

  return { id: assignmentId, message: input.publish ? "Tehtävä julkaistu." : "Luonnos tallennettu." };
}

export async function saveDraft(input: {
  assignmentId: string;
  answersByQuestion: Map<string, string>;
}): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "student" || !isUuid(input.assignmentId)) {
    return { error: "Tehtävää ei löydy." };
  }

  const allowed = await db
    .select({
      returnedAt: assignmentStudents.returnedAt,
      archivedAt: assignments.archivedAt,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .where(
      and(
        eq(assignmentStudents.assignmentId, input.assignmentId),
        eq(assignmentStudents.studentId, user.id),
        eq(assignments.status, "published"),
      ),
    )
    .limit(1);

  if (!allowed[0]) {
    return { error: "Tehtävää ei löydy." };
  }
  if (allowed[0].archivedAt) {
    return { error: "Tehtävä on arkistoitu." };
  }
  if (allowed[0].returnedAt) {
    return { error: "Tehtävä on jo palautettu." };
  }

  const questions = await db
    .select({ id: assignmentQuestions.id })
    .from(assignmentQuestions)
    .where(eq(assignmentQuestions.assignmentId, input.assignmentId));

  const bodies = new Map<string, string>();
  for (const question of questions) {
    const body = input.answersByQuestion.get(question.id) ?? "";
    const answerError = validateAnswer(body);
    if (answerError) {
      return { error: answerError };
    }
    bodies.set(question.id, body);
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const question of questions) {
      const body = bodies.get(question.id) ?? "";
      await tx
        .insert(answers)
        .values({
          id: randomUUID(),
          assignmentId: input.assignmentId,
          questionId: question.id,
          studentId: user.id,
          body,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [answers.studentId, answers.questionId],
          set: { body, updatedAt: now },
        });
    }
  });

  return { message: "Luonnos tallennettu." };
}

export async function saveTextResponse(assignmentId: string, body: string): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "student" || !isUuid(assignmentId)) {
    return { error: "Tehtävää ei löydy." };
  }
  const answerError = validateAnswer(body);
  if (answerError) {
    return { error: answerError };
  }

  const saved = await db.transaction(async (tx) => {
    const open = await lockOpenResponse(tx, assignmentId, user.id);
    if (open === "missing") {
      return "missing" as const;
    }
    if (open === "archived") {
      return "archived" as const;
    }
    if (open === "returned") {
      return "returned" as const;
    }
    if (open.responseKind !== "text") {
      return "missing" as const;
    }
    const now = new Date();
    await tx
      .insert(assignmentResponses)
      .values({
        assignmentId,
        studentId: user.id,
        body,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assignmentResponses.assignmentId, assignmentResponses.studentId],
        set: { body, updatedAt: now },
      });
    return "saved" as const;
  });

  if (saved === "missing") {
    return { error: "Tehtävää ei löydy." };
  }
  if (saved === "archived") {
    return { error: "Tehtävä on arkistoitu." };
  }
  if (saved === "returned") {
    return { error: "Tehtävä on jo palautettu." };
  }
  return { message: "Tallennettu" };
}

export async function returnAssignment(input: {
  assignmentId: string;
  answersByQuestion: Map<string, string>;
  body?: string;
}): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "student" || !isUuid(input.assignmentId)) {
    return { error: "Tehtävää ei löydy." };
  }

  const rows = await db
    .select({
      responseKind: assignments.responseKind,
      archivedAt: assignments.archivedAt,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .where(
      and(
        eq(assignmentStudents.assignmentId, input.assignmentId),
        eq(assignmentStudents.studentId, user.id),
        eq(assignments.status, "published"),
      ),
    )
    .limit(1);
  const kind = rows[0]?.responseKind;
  if (!rows[0]) {
    return { error: "Tehtävää ei löydy." };
  }
  if (rows[0].archivedAt) {
    return { error: "Tehtävä on arkistoitu." };
  }
  if (kind === "text") {
    return returnText(user.id, input.assignmentId, input.body ?? "");
  }
  if (kind === "image" || kind === "video" || kind === "audio") {
    return returnMedia(user.id, input.assignmentId, kind);
  }

  const draft = await saveDraft(input);
  if (draft.error) {
    return draft;
  }

  const saved = await db
    .select({ body: answers.body })
    .from(answers)
    .where(and(eq(answers.assignmentId, input.assignmentId), eq(answers.studentId, user.id)));

  if (!saved.some((row) => row.body.trim().length > 0)) {
    return { error: "Kirjoita vastaus ennen palautusta." };
  }

  const updated = await db
    .update(assignmentStudents)
    .set({ returnedAt: new Date() })
    .where(
      and(
        eq(assignmentStudents.assignmentId, input.assignmentId),
        eq(assignmentStudents.studentId, user.id),
        isNull(assignmentStudents.returnedAt),
      ),
    )
    .returning({ returnedAt: assignmentStudents.returnedAt });

  if (!updated[0]) {
    return { error: "Tehtävä on jo palautettu." };
  }

  return { message: "Tehtävä palautettu." };
}

async function returnText(studentId: string, assignmentId: string, body: string): Promise<FormState> {
  const answerError = validateAnswer(body);
  if (answerError) {
    return { error: answerError };
  }

  return db.transaction(async (tx) => {
    const open = await lockOpenResponse(tx, assignmentId, studentId);
    if (open === "missing" || open === "archived") {
      return { error: open === "archived" ? "Tehtävä on arkistoitu." : "Tehtävää ei löydy." };
    }
    if (open === "returned" || open.responseKind !== "text") {
      return { error: open === "returned" ? "Tehtävä on jo palautettu." : "Tehtävää ei löydy." };
    }
    const now = new Date();
    await tx
      .insert(assignmentResponses)
      .values({
        assignmentId,
        studentId,
        body,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assignmentResponses.assignmentId, assignmentResponses.studentId],
        set: { body, updatedAt: now },
      });
    if (body.trim().length < 1) {
      return { error: "Kirjoita vastaus ennen palautusta." };
    }
    await tx
      .update(assignmentStudents)
      .set({ returnedAt: now })
      .where(
        and(
          eq(assignmentStudents.assignmentId, assignmentId),
          eq(assignmentStudents.studentId, studentId),
          isNull(assignmentStudents.returnedAt),
        ),
      );
    return { message: "Tehtävä palautettu." };
  });
}

function missingMediaMessage(kind: "image" | "video" | "audio"): string {
  if (kind === "image") {
    return "Lisää kuva ennen palautusta.";
  }
  if (kind === "video") {
    return "Lisää video ennen palautusta.";
  }
  return "Lisää äänite ennen palautusta.";
}

async function returnMedia(
  studentId: string,
  assignmentId: string,
  kind: "image" | "video" | "audio",
): Promise<FormState> {
  return db.transaction(async (tx) => {
    const open = await lockOpenResponse(tx, assignmentId, studentId);
    if (open === "missing" || open === "archived") {
      return { error: open === "archived" ? "Tehtävä on arkistoitu." : "Tehtävää ei löydy." };
    }
    if (open === "returned") {
      return { error: "Tehtävä on jo palautettu." };
    }
    if (open.responseKind !== kind) {
      return { error: "Tehtävää ei löydy." };
    }
    const media = await tx
      .select({ id: assignmentMedia.id })
      .from(assignmentResponses)
      .innerJoin(assignmentMedia, eq(assignmentMedia.id, assignmentResponses.mediaId))
      .where(
        and(
          eq(assignmentResponses.assignmentId, assignmentId),
          eq(assignmentResponses.studentId, studentId),
          eq(assignmentMedia.status, "ready"),
          eq(assignmentMedia.kind, kind),
          eq(assignmentMedia.studentId, studentId),
        ),
      )
      .limit(1);
    if (!media[0]) {
      return { error: missingMediaMessage(kind) };
    }
    await tx
      .update(assignmentStudents)
      .set({ returnedAt: new Date() })
      .where(
        and(
          eq(assignmentStudents.assignmentId, assignmentId),
          eq(assignmentStudents.studentId, studentId),
          isNull(assignmentStudents.returnedAt),
        ),
      );
    return { message: "Tehtävä palautettu." };
  });
}

async function lockOpenResponse(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  assignmentId: string,
  studentId: string,
): Promise<{ responseKind: ResponseKind | null } | "missing" | "returned" | "archived"> {
  await tx.execute(sql`
    SELECT returned_at
    FROM assignment_students
    WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}
    FOR UPDATE
  `);
  const rows = await tx
    .select({
      responseKind: assignments.responseKind,
      returnedAt: assignmentStudents.returnedAt,
      archivedAt: assignments.archivedAt,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .where(
      and(
        eq(assignmentStudents.assignmentId, assignmentId),
        eq(assignmentStudents.studentId, studentId),
        eq(assignments.status, "published"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return "missing";
  }
  if (row.archivedAt) {
    return "archived";
  }
  if (row.returnedAt) {
    return "returned";
  }
  return { responseKind: row.responseKind };
}

export async function setDraftInstructionVideo(input: {
  assignmentId: string;
  mediaId: string | null;
}): Promise<FormState> {
  const teacher = await requireTeacher();
  if (!isUuid(input.assignmentId) || (input.mediaId !== null && !isUuid(input.mediaId))) {
    return { error: "Tehtävää ei löydy." };
  }

  const rows = await db
    .select({ status: assignments.status })
    .from(assignments)
    .where(eq(assignments.id, input.assignmentId))
    .limit(1);
  if (!rows[0]) {
    return { error: "Tehtävää ei löydy." };
  }
  if (rows[0].status !== "draft") {
    return { error: "Vain luonnosta voi muuttaa." };
  }

  try {
    await replaceDraftInstructionVideo({
      teacherId: teacher.id,
      assignmentId: input.assignmentId,
      mediaId: input.mediaId,
    });
  } catch (error) {
    if (error instanceof MediaError) {
      return { error: error.message };
    }
    throw error;
  }

  return {
    message: input.mediaId ? "Ohjevideo tallennettu." : "Ohjevideo poistettu.",
  };
}

export async function setAssignmentArchived(input: {
  assignmentId: string;
  archived: boolean;
}): Promise<FormState> {
  await requireTeacher();
  if (!isUuid(input.assignmentId)) {
    return { error: "Tehtävää ei löydy." };
  }

  const rows = await db
    .select({
      status: assignments.status,
      archivedAt: assignments.archivedAt,
    })
    .from(assignments)
    .where(eq(assignments.id, input.assignmentId))
    .limit(1);
  const assignment = rows[0];
  if (!assignment) {
    return { error: "Tehtävää ei löydy." };
  }
  if (assignment.status !== "published") {
    return { error: "Vain julkaistu tehtävä voidaan arkistoida." };
  }
  if (input.archived && assignment.archivedAt) {
    return { message: "Tehtävä on jo arkistoitu." };
  }
  if (!input.archived && !assignment.archivedAt) {
    return { message: "Tehtävä on jo aktiivinen." };
  }

  await db
    .update(assignments)
    .set({ archivedAt: input.archived ? new Date() : null })
    .where(eq(assignments.id, input.assignmentId));

  return {
    message: input.archived ? "Tehtävä arkistoitu." : "Tehtävä palautettu aktiiviseksi.",
  };
}

export async function publishToStudents(input: {
  assignmentId: string;
  studentIds: string[];
}): Promise<FormState> {
  await requireTeacher();
  if (!isUuid(input.assignmentId)) {
    return { error: "Tehtävää ei löydy." };
  }

  const studentIds = [...new Set(input.studentIds.filter(isUuid))];
  if (studentIds.length < 1) {
    return { error: "Valitse vähintään yksi oppilas." };
  }

  const assignmentRows = await db
    .select({
      id: assignments.id,
      parentAssignmentId: assignments.parentAssignmentId,
    })
    .from(assignments)
    .where(eq(assignments.id, input.assignmentId))
    .limit(1);
  if (!assignmentRows[0]) {
    return { error: "Tehtävää ei löydy." };
  }

  const students = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "student"), inArray(users.id, studentIds)));
  if (students.length !== studentIds.length) {
    return { error: "Valitse oppilaat uudelleen." };
  }

  const existing = await db
    .select({ studentId: assignmentStudents.studentId })
    .from(assignmentStudents)
    .where(eq(assignmentStudents.assignmentId, input.assignmentId));
  const existingIds = new Set(existing.map((row) => row.studentId));
  const additions = studentIds.filter((id) => !existingIds.has(id));
  if (additions.length < 1) {
    return { error: "Valitut oppilaat ovat jo tehtävällä." };
  }

  const parentError = await feedbackStudentError(
    assignmentRows[0].parentAssignmentId ?? "",
    additions,
  );
  if (parentError) {
    return { error: parentError };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(assignments)
      .set({ status: "published" })
      .where(eq(assignments.id, input.assignmentId));
    await tx.insert(assignmentStudents).values(
      additions.map((studentId) => ({
        assignmentId: input.assignmentId,
        studentId,
      })),
    );
  });

  return { message: "Tehtävä julkaistu." };
}

export async function updateAssignmentDeadline(input: {
  assignmentId: string;
  deadline: string;
}): Promise<FormState> {
  await requireTeacher();
  if (!isUuid(input.assignmentId)) {
    return { error: "Tehtävää ei löydy." };
  }

  const deadline = parseDeadlineInput(input.deadline);
  if (deadline === "invalid") {
    return { error: "Anna kelvollinen määräaika." };
  }

  const updated = await db
    .update(assignments)
    .set({ deadline })
    .where(eq(assignments.id, input.assignmentId))
    .returning({ id: assignments.id });

  if (!updated[0]) {
    return { error: "Tehtävää ei löydy." };
  }

  return { message: deadline ? "Määräaika tallennettu." : "Määräaika poistettu." };
}

export async function reviewReturn(input: {
  assignmentId: string;
  studentId: string;
}): Promise<FormState> {
  await requireTeacher();
  if (!isUuid(input.assignmentId) || !isUuid(input.studentId)) {
    return { error: "Palautusta ei löydy." };
  }

  const rows = await db
    .select({ returnedAt: assignmentStudents.returnedAt })
    .from(assignmentStudents)
    .where(
      and(
        eq(assignmentStudents.assignmentId, input.assignmentId),
        eq(assignmentStudents.studentId, input.studentId),
      ),
    )
    .limit(1);

  if (!rows[0]?.returnedAt) {
    return { error: "Tehtävää ei voi vielä tarkistaa." };
  }

  await db
    .update(assignmentStudents)
    .set({ reviewedAt: new Date() })
    .where(
      and(
        eq(assignmentStudents.assignmentId, input.assignmentId),
        eq(assignmentStudents.studentId, input.studentId),
      ),
    );

  return { message: "Tehtävä tarkistettu." };
}

export async function getFeedbackTarget(parentId: string): Promise<{
  id: string;
  title: string;
  students: { id: string; name: string }[];
} | null> {
  await requireTeacher();
  if (!isUuid(parentId)) {
    return null;
  }

  const rows = await db
    .select({ id: assignments.id, title: assignments.title })
    .from(assignments)
    .where(eq(assignments.id, parentId))
    .limit(1);
  const parent = rows[0];
  if (!parent) {
    return null;
  }

  const students = await db
    .select({ id: users.id, name: users.name })
    .from(assignmentStudents)
    .innerJoin(users, eq(users.id, assignmentStudents.studentId))
    .where(
      and(
        eq(assignmentStudents.assignmentId, parentId),
        isNotNull(assignmentStudents.returnedAt),
      ),
    )
    .orderBy(asc(users.name));

  return { ...parent, students };
}

async function loadParentAndFeedback(
  assignmentId: string,
  parentId: string | null,
  studentId?: string,
): Promise<{ parent: { id: string; title: string } | null; feedback: LinkedAssignment[] }> {
  const parentRows = parentId
    ? await db
        .select({ id: assignments.id, title: assignments.title })
        .from(assignments)
        .where(eq(assignments.id, parentId))
        .limit(1)
    : [];

  const feedback = studentId
    ? await db
        .select({
          id: assignments.id,
          title: assignments.title,
          status: assignments.status,
          archivedAt: assignments.archivedAt,
          createdAt: assignments.createdAt,
        })
        .from(assignments)
        .innerJoin(
          assignmentStudents,
          and(
            eq(assignmentStudents.assignmentId, assignments.id),
            eq(assignmentStudents.studentId, studentId),
          ),
        )
        .where(
          and(
            eq(assignments.parentAssignmentId, assignmentId),
            eq(assignments.status, "published"),
          ),
        )
        .orderBy(asc(assignments.createdAt))
    : await db
        .select({
          id: assignments.id,
          title: assignments.title,
          status: assignments.status,
          archivedAt: assignments.archivedAt,
          createdAt: assignments.createdAt,
        })
        .from(assignments)
        .where(eq(assignments.parentAssignmentId, assignmentId))
        .orderBy(asc(assignments.createdAt));

  return { parent: parentRows[0] ?? null, feedback };
}

async function feedbackStudentError(
  parentId: string,
  studentIds: string[],
): Promise<string | null> {
  if (!parentId) {
    return null;
  }
  if (!isUuid(parentId)) {
    return "Tehtävää ei löydy.";
  }

  const parent = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.id, parentId))
    .limit(1);
  if (!parent[0]) {
    return "Tehtävää ei löydy.";
  }
  if (studentIds.length === 0) {
    return null;
  }

  const returned = await db
    .select({ studentId: assignmentStudents.studentId })
    .from(assignmentStudents)
    .where(
      and(
        eq(assignmentStudents.assignmentId, parentId),
        inArray(assignmentStudents.studentId, studentIds),
        isNotNull(assignmentStudents.returnedAt),
      ),
    );
  if (returned.length !== studentIds.length) {
    return "Palaute voidaan antaa vain oppilaalle, joka on palauttanut tehtävän.";
  }
  return null;
}
