"use client";

import { useId, useState, type ReactNode } from "react";

export function StudentTaskList({
  identity,
  children,
}: {
  identity: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{identity}</div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-pine text-2xl leading-none text-white hover:bg-pine-dark"
        >
          <span className="sr-only">{open ? "Piilota tehtävät" : "Näytä tehtävät"}</span>
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
