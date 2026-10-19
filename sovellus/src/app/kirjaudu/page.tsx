import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getOptionalUser } from "@/lib/auth";

export const metadata = {
  title: "Kirjaudu",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <Suspense fallback={<p className="text-muted">Ladataan…</p>}>
        <LoginScreen />
      </Suspense>
    </main>
  );
}

async function LoginScreen() {
  const user = await getOptionalUser();
  if (user) {
    redirect("/");
  }

  return (
    <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Oppimistehtävät</h1>
      <p className="mt-2 mb-6 text-muted">
        Kirjaudu opettajan tunnuksella. Oppilas avaa opettajan lähettämän linkin.
      </p>
      <LoginForm />
    </section>
  );
}
