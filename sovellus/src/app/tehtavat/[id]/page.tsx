import { Suspense } from "react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AssignmentMediaView } from "@/components/assignment-media";
import { formatFiDate } from "@/components/assignment-cards";
import { DeadlineForm } from "@/components/deadline-form";
import { DraftForm } from "@/components/draft-form";
import { PublishAssignmentForm } from "@/components/publish-assignment-form";
import { ResponseForm } from "@/components/response-form";
import { ResponseView } from "@/components/response-view";
import { ReviewReturnForm } from "@/components/review-return-form";
import { responseKindLabel, teacherWorkLabel } from "@/lib/assignment-labels";
import { getStudentAssignment, getTeacherAssignment } from "@/lib/assignments";
import { requireUser } from "@/lib/auth";
import { deadlineInputValue, formatDeadline } from "@/lib/deadline";
import { listStudents } from "@/lib/students";

export const metadata = {
  title: "Tehtävä",
};

export default function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <Assignment params={params} />
      </Suspense>
    </main>
  );
}

async function Assignment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  if (user.role === "teacher") {
    const [assignment, students] = await Promise.all([
      getTeacherAssignment(id),
      listStudents(),
    ]);
    const assigned = new Set(assignment.students.map((student) => student.id));
    const unassigned = students
      .filter((student) => !assigned.has(student.id))
      .map((student) => ({ id: student.id, name: student.name }));
    return (
      <div className="grid gap-8">
        <AppHeader user={user} />
        <article className="grid gap-6">
          <div>
            <Link href="/tehtavat" className="text-sm text-pine">
              Tehtävät
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{assignment.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {assignment.status === "draft" ? "Luonnos" : "Julkaistu"} ·{" "}
              {formatFiDate(assignment.createdAt)}
              {assignment.responseKind
                ? ` · Palautus: ${responseKindLabel(assignment.responseKind)}`
                : ""}
              {assignment.deadline ? ` · Määräaika ${formatDeadline(assignment.deadline)}` : ""}
            </p>
          </div>
          <p className="whitespace-pre-wrap rounded-lg border border-line bg-card p-6">
            {assignment.instructions}
          </p>
          <AssignmentMediaView media={assignment.media} />
          {assignment.links.length > 0 ? (
            <section className="grid gap-2">
              <h2 className="text-xl font-semibold">Linkit</h2>
              <ul className="grid gap-2">
                {assignment.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pine underline"
                    >
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {assignment.questions.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-xl font-semibold">Kysymykset</h2>
              <ol className="grid list-decimal gap-2 pl-5">
                {assignment.questions.map((question) => (
                  <li key={question.id}>{question.prompt}</li>
                ))}
              </ol>
            </section>
          ) : null}
          <section className="rounded-lg border border-line bg-card p-6">
            <DeadlineForm
              assignmentId={assignment.id}
              initialValue={deadlineInputValue(assignment.deadline)}
            />
          </section>
          <section className="grid gap-4">
            <h2 className="text-xl font-semibold">Oppilaat</h2>
            {assignment.students.length === 0 ? (
              <p className="text-muted">Tehtävää ei ole vielä julkaistu kenellekään.</p>
            ) : (
              <ul className="grid gap-3">
                {assignment.students.map((student) => (
                  <li key={student.id} className="rounded-lg border border-line bg-card p-4">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted">
                      {teacherWorkLabel(student)}
                      {student.returnedAt ? ` · ${formatFiDate(student.returnedAt)}` : ""}
                    </p>
                    {student.returnedAt && assignment.responseKind ? (
                      <div className="mt-3">
                        <ResponseView
                          kind={assignment.responseKind}
                          response={student.response ?? { body: "", media: null }}
                        />
                      </div>
                    ) : null}
                    {student.returnedAt && !assignment.responseKind ? (
                      <ol className="mt-3 grid list-decimal gap-2 pl-5">
                        {student.answers.map((answer) => (
                          <li key={answer.questionId}>
                            <p>{answer.prompt}</p>
                            <p className="whitespace-pre-wrap text-muted">
                              {answer.body.trim() || "Tyhjä vastaus"}
                            </p>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {student.returnedAt && !student.reviewedAt ? (
                      <div className="mt-3">
                        <ReviewReturnForm assignmentId={assignment.id} studentId={student.id} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-lg border border-line bg-card p-6">
              <h3 className="mb-3 text-lg font-semibold">
                {assignment.status === "draft" ? "Julkaise" : "Julkaise lisää"}
              </h3>
              <PublishAssignmentForm
                assignmentId={assignment.id}
                students={unassigned}
                published={assignment.status === "published"}
              />
            </div>
          </section>
        </article>
      </div>
    );
  }

  const assignment = await getStudentAssignment(id);
  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <article className="grid gap-6">
        <div>
          <Link href="/tehtavat" className="text-sm text-pine">
            Tehtävät
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{assignment.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {assignment.returnedAt
              ? assignment.reviewedAt
                ? "Tarkistettu"
                : "Palautettu"
              : assignment.hasDraft
                ? "Luonnos tallennettu"
                : "Aloittamatta"}
            {assignment.responseKind
              ? ` · Palautus: ${responseKindLabel(assignment.responseKind)}`
              : ""}
            {assignment.deadline ? ` · Määräaika ${formatDeadline(assignment.deadline)}` : ""}
            {assignment.late ? " · Myöhässä" : ""}
          </p>
        </div>
        <p className="whitespace-pre-wrap rounded-lg border border-line bg-card p-6">
          {assignment.instructions}
        </p>
        <AssignmentMediaView media={assignment.media} />
        {assignment.links.length > 0 ? (
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold">Linkit</h2>
            <ul className="grid gap-2">
              {assignment.links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pine underline"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section
          className={
            assignment.late && !assignment.returnedAt
              ? "rounded-lg border border-danger bg-danger-bg p-6"
              : "rounded-lg border border-line bg-card p-6"
          }
        >
          <h2 className="mb-4 text-xl font-semibold">
            {assignment.responseKind ? "Vastaus" : "Vastaukset"}
          </h2>
          {assignment.late && !assignment.returnedAt ? (
            <p className="mb-4 font-medium text-danger">Myöhässä. Voit silti vastata.</p>
          ) : null}
          {assignment.returnedAt && assignment.responseKind ? (
            <ResponseView kind={assignment.responseKind} response={assignment.response} />
          ) : null}
          {assignment.returnedAt && !assignment.responseKind ? (
            <ol className="grid list-decimal gap-3 pl-5">
              {assignment.questions.map((question) => (
                <li key={question.id}>
                  <p className="font-medium">{question.prompt}</p>
                  <p className="mt-1 whitespace-pre-wrap">{question.answer.trim() || "Tyhjä vastaus"}</p>
                </li>
              ))}
            </ol>
          ) : null}
          {!assignment.returnedAt && assignment.responseKind ? (
            <ResponseForm
              assignmentId={assignment.id}
              kind={assignment.responseKind}
              initialBody={assignment.response.body}
              initialMedia={assignment.response.media}
            />
          ) : null}
          {!assignment.returnedAt && !assignment.responseKind ? (
            <DraftForm assignmentId={assignment.id} questions={assignment.questions} />
          ) : null}
        </section>
      </article>
    </div>
  );
}
