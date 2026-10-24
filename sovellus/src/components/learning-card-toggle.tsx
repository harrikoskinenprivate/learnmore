"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

export function LearningCardToggle({
  title,
  meta,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const panel = document.getElementById(panelId);
    panel?.querySelector<HTMLElement>("input, textarea")?.focus();
  }, [open, panelId]);

  return (
    <div className="grid gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          {title}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-pine text-2xl leading-none text-white hover:bg-pine-dark"
          >
            <span className="sr-only">{open ? "Sulje oppijakortti" : "Avaa oppijakortti"}</span>
            <span aria-hidden="true">{open ? "−" : "+"}</span>
          </button>
        </div>
        {meta}
      </div>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
