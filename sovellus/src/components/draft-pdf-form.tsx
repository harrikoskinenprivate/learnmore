"use client";

import { useState } from "react";

import { saveDraftTaskPdf } from "@/app/actions/assignments";
import type { ResponseDocument } from "@/lib/types";

export function DraftPdfForm({
  assignmentId,
  pdf,
}: {
  assignmentId: string;
  pdf: ResponseDocument | null;
}) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(mediaId: string | null) {
    setBusy(true);
    setError("");
    setStatus(mediaId ? "Tallennetaan…" : "Poistetaan…");
    const result = await saveDraftTaskPdf(assignmentId, mediaId);
    setBusy(false);
    if (result.error) {
      setStatus("");
      setError(result.error);
      return;
    }
    setStatus(result.message ?? "");
  }

  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-semibold">Tehtäväpaperi</h2>
      <p className="text-sm text-muted">
        Luonnoksen PDF:n voi poistaa ja korvata. Julkaisun jälkeen sitä ei vaihdeta. Oppilas näkee
        sen sivulla ja voi ladata sen.
      </p>
      {pdf ? (
        <>
          <iframe
            title={pdf.name}
            src={`/api/media/${pdf.id}`}
            className="h-[70vh] w-full rounded-lg border border-line bg-card"
          />
          <button
            type="button"
            disabled={busy}
            className="h-11 justify-self-start rounded-md border border-line bg-card px-4 text-base disabled:opacity-60"
            onClick={() => {
              void save(null);
            }}
          >
            Poista PDF
          </button>
        </>
      ) : (
        <p className="text-muted">Luonnoksessa ei ole tehtäväpaperia.</p>
      )}
      <label
        className={`inline-flex h-11 w-fit cursor-pointer items-center rounded-md border border-line bg-card px-4 text-base ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        Lisää PDF
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            void (async () => {
              setBusy(true);
              setError("");
              setStatus("Lähetetään…");
              try {
                const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
                if (mime !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                  throw new Error("Tehtäväpaperin pitää olla PDF.");
                }
                const prepared =
                  mime === "application/pdf"
                    ? file
                    : new File([file], file.name, { type: "application/pdf" });
                const id = await uploadPdf(prepared);
                const result = await saveDraftTaskPdf(assignmentId, id);
                if (result.error) {
                  setStatus("");
                  setError(result.error);
                  return;
                }
                setStatus(result.message ?? "");
              } catch (caught) {
                setStatus("");
                setError(caught instanceof Error ? caught.message : "Lähetys epäonnistui.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </section>
  );
}

async function uploadPdf(file: File): Promise<string> {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const response = await fetch("/api/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "pdf", mime, byteSize: file.size, fileName: file.name }),
  });
  const created = (await response.json()) as {
    error?: string;
    id?: string;
    uploadUrl?: string;
    headers?: Record<string, string>;
  };
  if (!response.ok || !created.id || !created.uploadUrl) {
    throw new Error(created.error ?? "Lähetys epäonnistui.");
  }
  const sent = await fetch(created.uploadUrl, {
    method: "PUT",
    headers: created.headers,
    body: file,
  });
  if (!sent.ok) {
    const failed = (await sent.json().catch(() => ({}))) as { error?: string };
    throw new Error(failed.error ?? "Lähetys epäonnistui.");
  }
  const confirmed = await fetch(`/api/media/uploads/${created.id}/confirm`, { method: "POST" });
  if (!confirmed.ok) {
    const failed = (await confirmed.json().catch(() => ({}))) as { error?: string };
    throw new Error(failed.error ?? "Lähetys epäonnistui.");
  }
  return created.id;
}
