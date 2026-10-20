import { Suspense } from "react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AssignmentCards } from "@/components/assignment-cards";
import { LearningCardView } from "@/components/learning-card";
import { AddStudentForm } from "@/components/student-forms";
import { studentTaskLabel, withFeedback } from "@/lib/assignment-labels";
import { listStudentAssignments } from "@/lib/assignments";
import { formatDeadline } from "@/lib/deadline";
import { requireUser } from "@/lib/auth";
import { getOwnLearningCard } from "@/lib/learning-cards";
import { listStudents } from "@/lib/students";
import type {
  CurrentUser,
  LearningCard,
  StudentAssignmentListItem,
  StudentListItem,
} from "@/lib/types";

export const metadata = {
  title: "Oppimistehtävät",
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const user = await requireUser();
  if (user.role === "student") {
    const [assignments, card] = await Promise.all([
      listStudentAssignments(),
      getOwnLearningCard(),
    ]);
    return <StudentHome user={user} assignments={assignments} card={card} />;
  }

  const students = await listStudents();
  return <TeacherHome user={user} students={students} />;
}

function StudentHome({
  user,
  assignments,
  card,
}: {
  user: CurrentUser;
  assignments: StudentAssignmentListItem[];
  card: LearningCard;
}) {
  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <h1 className="text-2xl font-semibold tracking-tight">Hei, {user.name}</h1>
      <LearningCardView card={card} />
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Kesken</h2>
        <AssignmentCards
          empty="Ei kesken olevia tehtäviä."
          items={assignments
            .filter((item) => !item.returnedAt)
            .map((item) => ({
              id: item.id,
              title: item.title,
              meta: withFeedback(
                item.parentTitle,
                `${studentTaskLabel(item)}${item.deadline ? ` · Määräaika ${formatDeadline(item.deadline)}` : ""}`,
              ),
            }))}
        />
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Tehdyt</h2>
        <AssignmentCards
          empty="Ei palautettuja tehtäviä."
          items={assignments
            .filter((item) => item.returnedAt)
            .map((item) => ({
              id: item.id,
              title: item.title,
              meta: withFeedback(
                item.parentTitle,
                `${studentTaskLabel(item)}${item.deadline ? ` · Määräaika ${formatDeadline(item.deadline)}` : ""}`,
              ),
            }))}
        />
      </section>
    </div>
  );
}

function TeacherHome({
  user,
  students,
}: {
  user: CurrentUser;
  students: StudentListItem[];
}) {
  const dateFormat = new Intl.DateTimeFormat("fi-FI", { dateStyle: "medium" });

  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <section className="rounded-lg border border-line bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lisää oppilas</h1>
        <p className="mt-2 mb-6 text-muted">
          Oppilas saa linkin, jolla hän avaa omat tietonsa. Salasanaa ei aseteta.
        </p>
        <AddStudentForm />
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Oppilaat</h2>
        {students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-card p-6 text-muted">
            Ei vielä oppilaita.
          </p>
        ) : (
          <ul className="grid gap-3">
            {students.map((student) => (
              <li key={student.id}>
                <Link
                  href={`/oppilaat/${student.id}`}
                  className="block rounded-lg border border-line bg-card p-4 hover:border-pine"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-medium">{student.name}</p>
                      <p className="text-muted">{student.email}</p>
                      <p className="mt-1 text-sm text-muted">
                        Lisätty {dateFormat.format(student.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex h-11 items-center rounded-md bg-pine px-4 text-base font-medium text-white">
                      Avaa
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
