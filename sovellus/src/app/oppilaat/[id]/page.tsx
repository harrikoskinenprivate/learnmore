import { Suspense } from "react";
import Link from "next/link";

import { AccessKeyForm } from "@/components/access-key-form";
import { AppHeader } from "@/components/app-header";
import { DeleteStudentForm } from "@/components/delete-student-form";
import { formatCardUpdated } from "@/components/learning-card";
import { LearningCardForm } from "@/components/learning-card-form";
import { formatFiDate } from "@/components/assignment-cards";
import { requireTeacher } from "@/lib/auth";
import { getStudentProfile } from "@/lib/students";

export const metadata = {
  title: "Oppilas",
};

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTeacher();
  const profile = await getStudentProfile(id);

  return (
    <div className="grid gap-8">
      <AppHeader user={user} />
      <article className="grid gap-6">
        <div>
          <Link href="/" className="text-sm text-pine">
            Oppilaat
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{profile.name}</h1>
          <p className="mt-1 text-muted">{profile.email}</p>
          <p className="mt-1 text-sm text-muted">Lisätty {formatFiDate(profile.createdAt)}</p>
        </div>
        <section className="rounded-lg border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Oppijakortti</h2>
          {profile.card.updatedAt ? (
            <p className="mt-1 text-sm text-muted">
              Päivitetty {formatCardUpdated(profile.card.updatedAt)}
            </p>
          ) : null}
          <p className="mt-2 mb-6 text-muted">
            Yksi kortti per oppilas. Kentät ovat vapaata tekstiä, ja oppilas näkee ne etusivullaan.
          </p>
          <LearningCardForm studentId={profile.id} card={profile.card} />
        </section>
        <section className="rounded-lg border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Avainlinkki</h2>
          <div className="mt-4">
            <AccessKeyForm studentId={profile.id} hasAccessKey={profile.hasAccessKey} />
          </div>
          <div className="mt-6">
            <DeleteStudentForm studentId={profile.id} studentName={profile.name} />
          </div>
        </section>
      </article>
    </div>
  );
}
