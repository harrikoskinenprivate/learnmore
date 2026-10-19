import Link from "next/link";

export const metadata = {
  title: "Linkki ei toimi",
};

export default function AccessKeyErrorPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <section className="rounded-lg border border-line bg-card p-6">
        <h1 className="text-2xl font-semibold">Linkki ei ole voimassa</h1>
        <p className="mt-3 text-muted">
          Pyydä opettajalta uusi linkki. Vanha linkki lakkaa toimimasta, kun opettaja luo uuden.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-pine px-4 text-base font-medium text-white"
        >
          Etusivulle
        </Link>
      </section>
    </main>
  );
}
