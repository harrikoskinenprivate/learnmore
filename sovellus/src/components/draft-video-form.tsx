"use client";

import { useState } from "react";

import { saveDraftInstructionVideo } from "@/app/actions/assignments";
import { InstructionVideoControls } from "@/components/media-fields";
import type { AssignmentMediaItem } from "@/lib/types";

const MAX_VIDEO_SECONDS = 180;

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
        onFile={(file, source) => {
          void (async () => {
            setBusy(true);
            setError("");
            setStatus("Lähetetään…");
            try {
              if (source === "file") {
                await assertDuration(file);
              }
              const id = await uploadVideo(file);
              const result = await saveDraftInstructionVideo(assignmentId, id);
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

function assertDuration(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (duration: number) => {
      if (settled) {
        return;
      }
      settled = true;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS) {
        reject(new Error("Ohjevideo saa olla enintään 3 minuuttia."));
        return;
      }
      resolve();
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) {
        finish(video.duration);
        return;
      }
      video.currentTime = Number.MAX_SAFE_INTEGER;
    };
    video.ontimeupdate = () => {
      if (Number.isFinite(video.duration)) {
        finish(video.duration);
      }
    };
    video.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      URL.revokeObjectURL(url);
      reject(new Error("Videon kestoa ei voitu lukea."));
    };
    video.src = url;
  });
}
