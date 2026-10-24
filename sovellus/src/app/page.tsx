import { Suspense } from "react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { ArchivedAssignmentList } from "@/components/archived-assignment-list";
import { AssignmentCards } from "@/components/assignment-cards";
import { AssignmentStateTabs } from "@/components/assignment-state-tabs";
import { LearningCardView } from "@/components/learning-card";
import { LearningCardToggle } from "@/components/learning-card-toggle";
import { StudentAssignmentTabs } from "@/components/student-assignment-tabs";
import { StudentTaskList } from "@/components/student-task-list";
import { TeacherStudentList } from "@/components/student-forms";
import { studentTaskLabel, withFeedback } from "@/lib/assignment-labels";
import { listArchivedAssignments, listStudentAssignments, listTeacherWork } from "@/lib/assignments";
import { formatDeadline } from "@/lib/deadline";
import { requireUser } from "@/lib/auth";
import { getOwnLearningCard } from "@/lib/learning-cards";
import { listStudents } from "@/lib/students";
import type {
  ArchivedAssignmentPage,
  CurrentUser,
  LearningCard,
  StudentAssignmentListItem,
  StudentListItem,
  TeacherWorkItem,
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
    const [assignments, archived, card] = await Promise.all([
      listStudentAssignments(),
      listArchivedAssignments(),
      getOwnLearningCard(),
    ]);
    return <StudentHome user={user} assignments={assignments} archived={archived} card={card} />;
  }

  const [students, work] = await Promise.all([listStudents(), listTeacherWork()]);
  return <TeacherHome user={user} students={students} work={work} />;
}

function StudentHome({
  user,
  assignments,
  archived,
  card,
}: {
  user: CurrentUser;
  assignments: StudentAssignmentListItem[];
  archived: ArchivedAssignmentPage;
  card: LearningCard;
}) {
  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <LearningCardToggle
        title={<h1 className="text-2xl font-semibold tracking-tight">Hei, {user.name}</h1>}
      >
        <LearningCardView card={card} />
      </LearningCardToggle>
      <AssignmentStateTabs
        initial="aktiiviset"
        tabs={[
          {
            id: "aktiiviset",
            label: "Aktiiviset",
            panel: (
              <>
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
              </>
            ),
          },
          {
            id: "arkistoidut",
            label: "Arkistoidut",
            panel: <ArchivedAssignmentList items={archived.items} nextCursor={archived.nextCursor} />,
          },
        ]}
      />
    </div>
  );
}

function TeacherHome({
  user,
  students,
  work,
}: {
  user: CurrentUser;
  students: StudentListItem[];
  work: TeacherWorkItem[];
}) {
  const dateFormat = new Intl.DateTimeFormat("fi-FI", { dateStyle: "medium" });
  const byStudent = new Map<string, TeacherWorkItem[]>();
  for (const item of work) {
    const list = byStudent.get(item.studentId) ?? [];
    list.push(item);
    byStudent.set(item.studentId, list);
  }

  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <TeacherStudentList>
        {students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-card p-6 text-muted">
            Ei vielä oppilaita.
          </p>
        ) : (
          <ul className="grid gap-3">
            {students.map((student) => (
              <li key={student.id} className="rounded-lg border border-line bg-card p-4">
                <StudentTaskList
                  identity={
                    <Link href={`/oppilaat/${student.id}`} className="block hover:text-pine">
                      <p className="text-lg font-medium">{student.name}</p>
                      <p className="text-muted">{student.email}</p>
                      <p className="mt-1 text-sm text-muted">
                        Lisätty {dateFormat.format(student.createdAt)}
                      </p>
                    </Link>
                  }
                >
                  <StudentAssignmentTabs
                    studentId={student.id}
                    studentName={student.name}
                    items={byStudent.get(student.id) ?? []}
                  />
                </StudentTaskList>
              </li>
            ))}
          </ul>
        )}
      </TeacherStudentList>
    </div>
  );
}
