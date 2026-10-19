import type { LearningCard } from "@/lib/types";

const fields: {
  key: keyof Pick<LearningCard, "level" | "strengths" | "developmentAreas" | "goals">;
  label: string;
}[] = [
  { key: "level", label: "Taso" },
  { key: "strengths", label: "Vahvuudet" },
  { key: "developmentAreas", label: "Kehityskohteet" },
  { key: "goals", label: "Tavoitteet" },
];

export function formatCardUpdated(value: Date): string {
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function LearningCardView({ card }: { card: LearningCard }) {
  const updated = card.updatedAt ? formatCardUpdated(card.updatedAt) : null;

  return (
    <section className="rounded-lg border border-line bg-card p-6">
      <h2 className="text-xl font-semibold">Oppijakortti</h2>
      {updated ? <p className="mt-1 text-sm text-muted">Päivitetty {updated}</p> : null}
      <dl className="mt-4 grid gap-4">
        {fields.map((field) => {
          const value = card[field.key].trim();
          return (
            <div key={field.key} className="grid gap-1">
              <dt className="text-sm font-medium">{field.label}</dt>
              <dd className={value ? "whitespace-pre-wrap" : "text-muted"}>
                {value || "Ei vielä kirjattu"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
