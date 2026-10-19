import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <section className="rounded-lg border border-line bg-card p-6">
        <h1 className="text-2xl font-semibold">Sivua ei löydy</h1>
        <p className="mt-3 text-muted">Tarkista osoite tai palaa etusivulle.</p>
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
