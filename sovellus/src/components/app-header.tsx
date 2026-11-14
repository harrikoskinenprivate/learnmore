import Link from "next/link";

import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/types";

const linkClass =
  "inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-base";

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
      <div className="grid gap-2">
        <div>
          <p className="text-sm text-muted">Blackboard</p>
          <p className="text-lg font-semibold">{user.name}</p>
        </div>
        {user.role === "teacher" ? (
          <nav className="flex flex-wrap gap-2">
            <Link href="/" className={linkClass}>
              Oppilaat
            </Link>
            <Link href="/tehtavat" className={linkClass}>
              Tehtävät
            </Link>
          </nav>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {user.role === "student" ? (
          <Link href="/" className={linkClass}>
            Etusivu
          </Link>
        ) : null}
        <form action={logout}>
          <button
            type="submit"
            className="h-11 rounded-md border border-line bg-card px-4 text-base hover:border-ink"
          >
            Kirjaudu ulos
          </button>
        </form>
      </div>
    </header>
  );
}
