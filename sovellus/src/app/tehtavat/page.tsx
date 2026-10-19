import { Suspense } from "react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { AssignmentCards } from "@/components/assignment-cards";
import { studentTaskLabel, teacherWorkLabel } from "@/lib/assignment-labels";
import { listStudentAssignments, listTeacherDrafts, listTeacherWork } from "@/lib/assignments";
import { requireUser } from "@/lib/auth";
import { formatDeadline } from "@/lib/deadline";
import type { StudentAssignmentListItem, TeacherWorkItem } from "@/lib/types";

export const metadata = {
  title: "Tehtävät",
};

export default function AssignmentsPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <Assignments />
      </Suspense>
    </main>
  );
}

function studentMeta(item: StudentAssignmentListItem): string {
  const deadline = item.deadline ? ` · Määräaika ${formatDeadline(item.deadline)}` : "";
  return `${studentTaskLabel(item)}${deadline}`;
}

function workMeta(item: TeacherWorkItem): string {
  const deadline = item.deadline ? ` · Määräaika ${formatDeadline(item.deadline)}` : "";
  return `${item.studentName} · ${teacherWorkLabel(item)}${deadline}`;
}

function workCards(items: TeacherWorkItem[], includeStudent = true) {
  return items.map((item) => ({
    id: `${item.assignmentId}:${item.studentId}`,
    href: `/tehtavat/${item.assignmentId}`,
    title: item.title,
    meta: includeStudent
      ? workMeta(item)
      : `${teacherWorkLabel(item)}${item.deadline ? ` · Määräaika ${formatDeadline(item.deadline)}` : ""}`,
  }));
}

async function Assignments() {
  const user = await requireUser();

  if (user.role === "student") {
    const items = await listStudentAssignments();
    const open = items.filter((item) => !item.returnedAt);
    const done = items.filter((item) => item.returnedAt);
    return (
      <div className="grid gap-8">
        <AppHeader user={user} />
        <h1 className="text-2xl font-semibold tracking-tight">Tehtävät</h1>
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Kesken</h2>
          <AssignmentCards
            empty="Ei kesken olevia tehtäviä."
            items={open.map((item) => ({
              id: item.id,
              title: item.title,
              meta: studentMeta(item),
            }))}
          />
        </section>
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Tehdyt</h2>
          <AssignmentCards
            empty="Ei palautettuja tehtäviä."
            items={done.map((item) => ({
              id: item.id,
              title: item.title,
              meta: studentMeta(item),
            }))}
          />
        </section>
      </div>
    );
  }

  const [drafts, work] = await Promise.all([listTeacherDrafts(), listTeacherWork()]);
  const open = work.filter((item) => !item.reviewedAt);
  const done = work.filter((item) => item.reviewedAt);
  const byStudent = new Map<string, { id: string; name: string; items: TeacherWorkItem[] }>();
  for (const item of work) {
    const group = byStudent.get(item.studentId) ?? {
      id: item.studentId,
      name: item.studentName,
      items: [],
    };
    group.items.push(item);
    byStudent.set(item.studentId, group);
  }
  const groups = [...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name, "fi"));

  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tehtävät</h1>
        <Link
          href="/tehtavat/uusi"
          className="inline-flex h-11 items-center rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark"
        >
          Uusi tehtävä
        </Link>
      </div>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Luonnokset</h2>
        <AssignmentCards
          empty="Ei luonnoksia."
          items={drafts.map((item) => ({
            id: item.id,
            title: item.title,
            meta: item.deadline ? `Määräaika ${formatDeadline(item.deadline)}` : "Ei määräaikaa",
          }))}
        />
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Kesken</h2>
        <AssignmentCards empty="Ei kesken olevia tehtäviä." items={workCards(open)} />
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Tehdyt</h2>
        <AssignmentCards empty="Ei tarkistettuja tehtäviä." items={workCards(done)} />
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Oppilaittain</h2>
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-card p-6 text-muted">
            Ei julkaistuja tehtäviä.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="grid gap-3">
              <h3 className="text-lg font-semibold">{group.name}</h3>
              <AssignmentCards empty="Ei tehtäviä." items={workCards(group.items, false)} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
