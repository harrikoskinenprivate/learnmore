"use client";

import { useState } from "react";

import { saveDraftInstructionVideo } from "@/app/actions/assignments";
import { InstructionVideoControls } from "@/components/media-fields";
import type { AssignmentMediaItem } from "@/lib/types";

export function DraftVideoForm({
  assignmentId,
  video,
}: {
  assignmentId: string;
  video: AssignmentMediaItem | null;
}) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(mediaId: string | null) {
    setBusy(true);
    setError("");
    setStatus(mediaId ? "Tallennetaan…" : "Poistetaan…");
    const result = await saveDraftInstructionVideo(assignmentId, mediaId);
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
      <h2 className="text-xl font-semibold">Ohjevideo</h2>
      <p className="text-sm text-muted">
        Luonnoksen videon voi poistaa ja korvata. Julkaisun jälkeen videota ei voi vaihtaa.
      </p>
      {video ? (
        <video
          controls
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-black object-contain"
          src={`/api/media/${video.id}`}
        />
      ) : (
        <p className="text-muted">Luonnoksessa ei ole ohjevideota.</p>
      )}
      {video ? (
        <button
          type="button"
          disabled={busy}
          className="h-11 justify-self-start rounded-md border border-line bg-card px-4 text-base disabled:opacity-60"
          onClick={() => {
            void save(null);
          }}
        >
          Poista video
        </button>
      ) : null}
      <InstructionVideoControls
        disabled={busy}
        onFile={async (file) => {
          setBusy(true);
          setError("");
          setStatus("Lähetetään…");
          try {
            const id = await uploadVideo(file);
            const result = await saveDraftInstructionVideo(assignmentId, id);
            if (result.error) {
              throw new Error(result.error);
            }
            setStatus(result.message ?? "");
          } catch (caught) {
            setStatus("");
            throw caught instanceof Error ? caught : new Error("Lähetys epäonnistui.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </section>
  );
}

async function uploadVideo(file: File): Promise<string> {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const response = await fetch("/api/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "video", mime, byteSize: file.size }),
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
