import Link from "next/link";

export function AssignmentCards({
  items,
  empty,
}: {
  items: { id: string; title: string; meta: string; href?: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-card p-6 text-muted">
        {empty}
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-line bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium">{item.title}</p>
              <p className="text-sm text-muted">{item.meta}</p>
            </div>
            <Link
              href={item.href ?? `/tehtavat/${item.id}`}
              className="inline-flex h-11 items-center rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark"
            >
              Avaa
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function formatFiDate(value: Date): string {
  return new Intl.DateTimeFormat("fi-FI", { dateStyle: "medium" }).format(value);
}
