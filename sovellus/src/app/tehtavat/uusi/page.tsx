import { Suspense } from "react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { CreateAssignmentForm } from "@/components/create-assignment-form";
import { requireTeacher } from "@/lib/auth";
import { listStudents } from "@/lib/students";

export const metadata = {
  title: "Uusi tehtävä",
};

export default function NewAssignmentPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <NewAssignment />
      </Suspense>
    </main>
  );
}

async function NewAssignment() {
  const teacher = await requireTeacher();
  const students = await listStudents();

  return (
    <div className="grid gap-8">
      <AppHeader user={teacher} />
      <section className="rounded-lg border border-line bg-card p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Uusi tehtävä</h1>
          <Link href="/tehtavat" className="text-pine">
            Takaisin
          </Link>
        </div>
        <CreateAssignmentForm
          students={students.map((student) => ({ id: student.id, name: student.name }))}
        />
      </section>
    </div>
  );
}
