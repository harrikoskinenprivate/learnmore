"use client";

import { useState } from "react";

import { loadMoreArchivedAssignments } from "@/app/actions/assignments";
import { AssignmentCards } from "@/components/assignment-cards";
import { ARCHIVE_PAGE_SIZE, type ArchivedAssignmentCard, type ArchiveCursor } from "@/lib/types";

export function ArchivedAssignmentList({
  items,
  nextCursor,
}: {
  items: ArchivedAssignmentCard[];
  nextCursor: ArchiveCursor | null;
}) {
  const [loaded, setLoaded] = useState(items);
  const [cursor, setCursor] = useState(nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (!cursor || pending) {
      return;
    }
    setPending(true);
    setError("");
    const page = await loadMoreArchivedAssignments(cursor);
    if (page.error) {
      setError(page.error);
      setPending(false);
      return;
    }
    setLoaded((current) => [...current, ...page.items]);
    setCursor(page.nextCursor);
    setPending(false);
  }

  return (
    <div className="grid gap-4">
      <AssignmentCards empty="Ei arkistoituja tehtäviä." items={loaded} />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="h-11 justify-self-start rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white disabled:opacity-60"
        >
          {pending ? "Haetaan…" : `Näytä ${ARCHIVE_PAGE_SIZE} lisää`}
        </button>
      ) : null}
    </div>
  );
}
