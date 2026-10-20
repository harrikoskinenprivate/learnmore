import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { CreateAssignmentForm } from "@/components/create-assignment-form";
import { getFeedbackTarget } from "@/lib/assignments";
import { requireTeacher } from "@/lib/auth";
import { listStudents } from "@/lib/students";
import { isUuid } from "@/lib/validation";

export const metadata = {
  title: "Uusi tehtävä",
};

export default function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ palautteena?: string; oppilas?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <NewAssignment searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewAssignment({
  searchParams,
}: {
  searchParams: Promise<{ palautteena?: string; oppilas?: string }>;
}) {
  const teacher = await requireTeacher();
  const query = await searchParams;
  const parentId = query.palautteena ?? "";
  const parent = parentId ? await getFeedbackTarget(parentId) : null;
  if (parentId && (!isUuid(parentId) || !parent)) {
    notFound();
  }

  const students = parent
    ? parent.students
    : (await listStudents()).map((student) => ({ id: student.id, name: student.name }));
  const preselected =
    parent && query.oppilas && students.some((student) => student.id === query.oppilas)
      ? [query.oppilas]
      : [];

  return (
    <div className="grid gap-8">
      <AppHeader user={teacher} />
      <section className="rounded-lg border border-line bg-card p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {parent ? "Uusi palaute" : "Uusi tehtävä"}
          </h1>
          <Link href={parent ? `/tehtavat/${parent.id}` : "/tehtavat"} className="text-pine">
            Takaisin
          </Link>
        </div>
        <CreateAssignmentForm
          students={students}
          parent={parent ? { id: parent.id, title: parent.title } : undefined}
          initialSelected={preselected}
        />
      </section>
    </div>
  );
}
