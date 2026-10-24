"use client";

import { useState, type ReactNode } from "react";

export function AssignmentStateTabs({
  tabs,
  initial,
  ariaLabel = "Tehtävän tila",
  idPrefix = "",
}: {
  tabs: { id: string; label: string; panel: ReactNode }[];
  initial: string;
  ariaLabel?: string;
  idPrefix?: string;
}) {
  const [current, setCurrent] = useState(initial);
  const selected = tabs.some((tab) => tab.id === current) ? current : tabs[0]?.id;

  return (
    <div className="grid gap-6">
      <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.id === selected;
          const tabId = `${idPrefix}tab-${tab.id}`;
          const panelId = `${idPrefix}panel-${tab.id}`;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={active}
              aria-controls={panelId}
              onClick={() => setCurrent(tab.id)}
              className={
                active
                  ? "inline-flex h-11 items-center rounded-md bg-pine px-4 text-base font-medium text-white"
                  : "inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-base font-medium hover:border-pine"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${idPrefix}panel-${tab.id}`}
          aria-labelledby={`${idPrefix}tab-${tab.id}`}
          hidden={tab.id !== selected}
          className="grid gap-8"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
