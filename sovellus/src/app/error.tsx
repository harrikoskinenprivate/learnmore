"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <section className="rounded-lg border border-line bg-card p-6">
        <h1 className="text-2xl font-semibold">Sivu ei juuri nyt aukea</h1>
        <p className="mt-3 text-muted">
          Tarkista, että tietokanta on käynnissä, ja yritä uudelleen.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-11 rounded-md bg-pine px-4 text-base font-medium text-white"
        >
          Yritä uudelleen
        </button>
      </section>
    </main>
  );
}
