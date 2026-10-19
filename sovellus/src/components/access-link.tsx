"use client";

import { useState } from "react";

export function AccessLinkNotice({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-2 rounded-md border border-line bg-paper p-3">
      <p className="text-sm">
        Kopioi linkki nyt. Sitä ei näytetä uudelleen. Älä avaa sitä tässä
        selaimessa, jos haluat pysyä kirjautuneena opettajana.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          readOnly
          value={url}
          aria-label="Oppilaan linkki"
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-md border border-line bg-card px-3 text-base"
        />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="h-11 rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white"
        >
          {copied ? "Kopioitu" : "Kopioi"}
        </button>
      </div>
    </div>
  );
}
