import Link from "next/link";

import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/types";

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
      <div className="grid gap-2">
        <div>
          <p className="text-sm text-muted">Oppimistehtävät</p>
          <p className="text-lg font-semibold">{user.name}</p>
        </div>
        {user.role === "teacher" ? (
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-base"
            >
              Oppilaat
            </Link>
            <Link
              href="/tehtavat"
              className="inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-base"
            >
              Tehtävät
            </Link>
          </nav>
        ) : null}
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="h-11 rounded-md border border-line bg-card px-4 text-base hover:border-ink"
        >
          Kirjaudu ulos
        </button>
      </form>
    </header>
  );
}
