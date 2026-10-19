"use client";

import { useActionState, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { autosaveTextResponse, saveAssignmentDraft } from "@/app/actions/assignments";
import { ResponseMedia } from "@/components/response-view";
import type { AssignmentMediaItem, FormState, ResponseKind } from "@/lib/types";

const initialState: FormState = {};
const MAX_VIDEO_SECONDS = 180;

export function ResponseForm({
  assignmentId,
  kind,
  initialBody,
  initialMedia,
}: {
  assignmentId: string;
  kind: ResponseKind;
  initialBody: string;
  initialMedia: AssignmentMediaItem | null;
}) {
  if (kind === "text") {
    return <TextResponse assignmentId={assignmentId} initialBody={initialBody} />;
  }
  return (
    <MediaResponse assignmentId={assignmentId} kind={kind} initialMedia={initialMedia} />
  );
}

function TextResponse({
  assignmentId,
  initialBody,
}: {
  assignmentId: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [returnState, returnAction, returning] = useActionState(
    saveAssignmentDraft,
    initialState,
  );
  const latest = useRef(initialBody);
  const saved = useRef(initialBody);
  const saving = useRef(false);
  const queued = useRef(false);

  const flush = useCallback(async () => {
    if (latest.current === saved.current) {
      return;
    }
    if (saving.current) {
      queued.current = true;
      return;
    }
    saving.current = true;
    setPending(true);
    try {
      do {
        queued.current = false;
        const value = latest.current;
        if (value === saved.current) {
          continue;
        }
        setStatus("Tallennetaan…");
        const result = await autosaveTextResponse(assignmentId, value);
        if (latest.current !== value) {
          queued.current = true;
          continue;
        }
        if (result.error) {
          setError(result.error);
          setStatus("");
          continue;
        }
        saved.current = value;
        setError("");
        setStatus("Tallennettu");
      } while (queued.current);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void flush();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [body, flush]);

  return (
    <form action={returnAction} className="grid gap-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label htmlFor="response-body" className="font-medium">
        Vastaus
      </label>
      <textarea
        id="response-body"
        name="body"
        rows={8}
        maxLength={8000}
        value={body}
        onChange={(event) => {
          latest.current = event.target.value;
          setBody(event.target.value);
        }}
        onBlur={() => {
          void flush();
        }}
        className="rounded-md border border-line bg-card px-3 py-2 text-base"
      />
      <p className="text-sm text-muted">
        Teksti tallentuu automaattisesti. Palautuksen jälkeen vastausta ei voi muokata.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {returnState.error ? (
        <p role="alert" className="text-sm text-danger">
          {returnState.error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-sm text-pine">
          {status}
        </p>
      ) : null}
      <button
        type="submit"
        name="intent"
        value="return"
        disabled={returning || pending}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {returning ? "Tallennetaan…" : "Palauta"}
      </button>
    </form>
  );
}

function MediaResponse({
  assignmentId,
  kind,
  initialMedia,
}: {
  assignmentId: string;
  kind: "image" | "video";
  initialMedia: AssignmentMediaItem | null;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnState, returnAction, returning] = useActionState(
    saveAssignmentDraft,
    initialState,
  );
  const cameraRef = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    setBusy(true);
    setError("");
    setStatus("Lähetetään…");
    try {
      if (kind === "video") {
        await assertDuration(file);
      }
      const id = await uploadResponse(assignmentId, kind, file);
      setMedia({ id, kind, mime: file.type.split(";")[0]?.trim().toLowerCase() ?? "" });
      setStatus("Tiedosto tallennettu.");
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : "Lähetys epäonnistui.");
    } finally {
      setBusy(false);
    }
  }

  function takeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void send(file);
  }

  return (
    <form action={returnAction} className="grid gap-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <p className="text-sm text-muted">
        {kind === "image"
          ? "Yksi kuva, jpeg, png tai webp, enintään 8 Mt. Uusi kuva korvaa edellisen."
          : "Yksi video, mp4 tai webm, enintään 3 minuuttia ja 150 Mt. Puhelimessa Kuvaa video avaa kameran. Tietokoneella valitaan tallennettu tiedosto. Uusi video korvaa edellisen."}
      </p>
      {media ? <ResponseMedia kind={kind} media={media} /> : null}
      {kind === "image" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-11 rounded-md border border-line bg-card px-4 text-base"
            onClick={() => cameraRef.current?.click()}
          >
            Ota kuva
          </button>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line bg-card px-4 text-base">
            Valitse kuva
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={takeFile}
            />
          </label>
          <input
            ref={cameraRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={takeFile}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-11 rounded-md border border-line bg-card px-4 text-base"
            onClick={() => cameraRef.current?.click()}
          >
            Kuvaa video
          </button>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line bg-card px-4 text-base">
            Valitse tiedosto
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="sr-only"
              onChange={takeFile}
            />
          </label>
          <input
            ref={cameraRef}
            type="file"
            accept="video/mp4,video/webm"
            capture="environment"
            className="sr-only"
            onChange={takeFile}
          />
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {returnState.error ? (
        <p role="alert" className="text-sm text-danger">
          {returnState.error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
      <p className="text-sm text-muted">Palautuksen jälkeen vastausta ei voi muokata.</p>
      <button
        type="submit"
        name="intent"
        value="return"
        disabled={returning || busy || !media}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {returning ? "Tallennetaan…" : "Palauta"}
      </button>
    </form>
  );
}

async function uploadResponse(
  assignmentId: string,
  kind: "image" | "video",
  file: File,
): Promise<string> {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const response = await fetch("/api/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, mime, byteSize: file.size, assignmentId }),
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
        reject(new Error("Video saa olla enintään 3 minuuttia."));
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
