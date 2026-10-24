import { Suspense } from "react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { ResponseView } from "@/components/response-view";
import { ReviewReturnForm } from "@/components/review-return-form";
import { assignmentStateLabel, teacherWorkLabel } from "@/lib/assignment-labels";
import { getTeacherStudentWork } from "@/lib/assignments";
import { requireTeacher } from "@/lib/auth";
import { formatDeadline } from "@/lib/deadline";

export const metadata = {
  title: "Suoritus",
};

export default function StudentAssignmentWorkPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <Work params={params} />
      </Suspense>
    </main>
  );
}

async function Work({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = await params;
  const user = await requireTeacher();
  const work = await getTeacherStudentWork(id, assignmentId);
  const student = work.student;
  const openAndLate = student.late && !student.returnedAt;
  const returned = formatReturned(student.returnedAt);

  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <article className="grid gap-6">
        <div>
          <Link href={`/oppilaat/${id}`} className="text-sm text-pine">
            {student.name}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{work.title}</h1>
          {work.parent ? (
            <p className="mt-2">
              Palaute tehtävään{" "}
              <Link
                href={`/oppilaat/${id}/tehtavat/${work.parent.id}`}
                className="text-pine underline"
              >
                {work.parent.title}
              </Link>
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted">
            {teacherWorkLabel(student)}
            {work.deadline ? ` · Määräaika ${formatDeadline(work.deadline)}` : ""}
            {returned ? ` · Palautettu ${returned}` : ""}
          </p>
        </div>
        <section
          className={
            openAndLate
              ? "rounded-lg border border-danger bg-danger-bg p-6"
              : "rounded-lg border border-line bg-card p-6"
          }
        >
          <h2 className="text-xl font-semibold">Suoritus</h2>
          {openAndLate ? <p className="mt-4 font-medium text-danger">Myöhässä.</p> : null}
          {!student.returnedAt ? (
            <p className="mt-4 text-muted">Ei vielä palautusta.</p>
          ) : null}
          {student.returnedAt && work.responseKind ? (
            <div className="mt-4">
              <ResponseView
                kind={work.responseKind}
                response={student.response ?? { body: "", media: null }}
              />
            </div>
          ) : null}
          {student.returnedAt && !work.responseKind ? (
            <ol className="mt-4 grid list-decimal gap-2 pl-5">
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
          {student.returnedAt ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!student.reviewedAt ? (
                <ReviewReturnForm assignmentId={work.id} studentId={student.id} />
              ) : null}
              <Link
                href={`/tehtavat/uusi?palautteena=${work.id}&oppilas=${student.id}`}
                className="inline-flex h-11 items-center rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white"
              >
                Anna palaute
              </Link>
            </div>
          ) : null}
        </section>
        {work.feedback.length > 0 ? (
          <section className="grid gap-3">
            <h2 className="text-xl font-semibold">Palautteet</h2>
            <ul className="grid gap-2">
              {work.feedback.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/oppilaat/${id}/tehtavat/${item.id}`}
                    className="text-pine underline"
                  >
                    {item.title}
                  </Link>
                  <span className="text-sm text-muted"> · {assignmentStateLabel(item)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p>
          <Link href={`/tehtavat/${work.id}`} className="text-sm text-pine">
            Tehtävän sivu
          </Link>
        </p>
      </article>
    </div>
  );
}

function formatReturned(value: Date | null): string {
  if (!value) {
    return "";
  }
  return formatDeadline(value);
}
