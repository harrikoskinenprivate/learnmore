"use client";

import { useEffect, useState } from "react";

type Theme = "tausta" | "selkea";

const storageKey = "teema";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("tausta");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    const next: Theme = saved === "selkea" ? "selkea" : "tausta";
    setTheme(next);
    applyTheme(next);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(storageKey, next);
  }

  return (
    <div className="fixed right-5 bottom-5 z-40">
      <div
        className="flex gap-1 rounded-md border border-line bg-card p-1 shadow-sm"
        role="group"
        aria-label="Teema"
      >
        <ThemeButton active={theme === "tausta"} onClick={() => choose("tausta")}>
          Liitutaulu
        </ThemeButton>
        <ThemeButton active={theme === "selkea"} onClick={() => choose("selkea")}>
          Selkeä
        </ThemeButton>
      </div>
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-11 rounded-md px-3 text-sm font-medium ${
        active ? "bg-pine text-white" : "text-ink hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}
