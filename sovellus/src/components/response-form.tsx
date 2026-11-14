"use client";

import { useActionState, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { autosaveTextResponse, saveAssignmentDraft } from "@/app/actions/assignments";
import { ResponseFileView, ResponseMedia } from "@/components/response-view";
import type {
  AssignmentMediaItem,
  FormState,
  MediaKind,
  ResponseDocument,
  ResponseKind,
} from "@/lib/types";

const initialState: FormState = {};
const MAX_VIDEO_SECONDS = 180;

export function ResponseForm({
  assignmentId,
  kind,
  attachment,
  initialBody,
  initialMedia,
  initialDocument,
  initialFiles = [],
  freeFiles = false,
}: {
  assignmentId: string;
  kind: ResponseKind;
  attachment: MediaKind | null;
  initialBody: string;
  initialMedia: AssignmentMediaItem | null;
  initialDocument: ResponseDocument | null;
  initialFiles?: ResponseDocument[];
  freeFiles?: boolean;
}) {
  if (kind === "text") {
    return (
      <TextResponse
        assignmentId={assignmentId}
        initialBody={initialBody}
        attachment={attachment}
        initialMedia={initialMedia}
        initialDocument={initialDocument}
        initialFiles={initialFiles}
        freeFiles={freeFiles}
      />
    );
  }
  return (
    <MediaResponse
      assignmentId={assignmentId}
      kind={kind}
      initialMedia={initialMedia}
      initialDocument={initialDocument}
    />
  );
}

function TextResponse({
  assignmentId,
  initialBody,
  attachment,
  initialMedia,
  initialDocument,
  initialFiles,
  freeFiles,
}: {
  assignmentId: string;
  initialBody: string;
  attachment: MediaKind | null;
  initialMedia: AssignmentMediaItem | null;
  initialDocument: ResponseDocument | null;
  initialFiles: ResponseDocument[];
  freeFiles: boolean;
}) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mediaGate, setMediaGate] = useState({
    media: initialMedia,
    busy: false,
    recording: false,
  });
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
      <DocumentControls
        assignmentId={assignmentId}
        initialDocument={initialDocument}
        initialFiles={initialFiles}
        multiple={freeFiles}
      />
      {attachment ? (
        <MediaControls
          assignmentId={assignmentId}
          kind={attachment}
          initialMedia={initialMedia}
          onState={setMediaGate}
        />
      ) : null}
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
        disabled={
          returning ||
          pending ||
          (attachment !== null &&
            (mediaGate.busy || mediaGate.recording || mediaGate.media === null))
        }
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
  initialDocument,
}: {
  assignmentId: string;
  kind: "image" | "video" | "audio";
  initialMedia: AssignmentMediaItem | null;
  initialDocument: ResponseDocument | null;
}) {
  const [gate, setGate] = useState({
    media: initialMedia,
    busy: false,
    recording: false,
  });
  const [returnState, returnAction, returning] = useActionState(
    saveAssignmentDraft,
    initialState,
  );

  return (
    <form action={returnAction} className="grid gap-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <DocumentControls assignmentId={assignmentId} initialDocument={initialDocument} />
      <MediaControls
        assignmentId={assignmentId}
        kind={kind}
        initialMedia={initialMedia}
        onState={setGate}
      />
      {returnState.error ? (
        <p role="alert" className="text-sm text-danger">
          {returnState.error}
        </p>
      ) : null}
      <p className="text-sm text-muted">Palautuksen jälkeen vastausta ei voi muokata.</p>
      <button
        type="submit"
        name="intent"
        value="return"
        disabled={returning || gate.busy || gate.recording || !gate.media}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {returning ? "Tallennetaan…" : "Palauta"}
      </button>
    </form>
  );
}

function MediaControls({
  assignmentId,
  kind,
  initialMedia,
  onState,
}: {
  assignmentId: string;
  kind: "image" | "video" | "audio";
  initialMedia: AssignmentMediaItem | null;
  onState: (state: {
    media: AssignmentMediaItem | null;
    busy: boolean;
    recording: boolean;
  }) => void;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  useEffect(() => {
    onStateRef.current({ media, busy, recording });
  }, [media, busy, recording]);

  async function send(file: File, source: "record" | "file" = "file") {
    setBusy(true);
    setError("");
    setStatus("Lähetetään…");
    try {
      let prepared = file;
      if (kind === "video") {
        await assertMediaDuration(file, "video");
      }
      if (kind === "audio") {
        prepared = normalizeAudioFile(file);
        if (source === "file") {
          await assertMediaDuration(prepared, "audio");
        }
      }
      const id = await uploadResponse(assignmentId, kind, prepared);
      setMedia({
        id,
        kind,
        mime: prepared.type.split(";")[0]?.trim().toLowerCase() ?? "",
      });
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
    <div className="grid gap-4">
      <p className="text-sm text-muted">{mediaHint(kind)}</p>
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
      ) : kind === "video" ? (
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
      ) : (
        <AudioControls
          disabled={busy}
          onRecordingChange={setRecording}
          onFile={(file, source) => {
            void send(file, source);
          }}
        />
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}

export function DocumentControls({
  assignmentId,
  initialDocument,
  initialFiles = [],
  multiple = false,
}: {
  assignmentId: string;
  initialDocument: ResponseDocument | null;
  initialFiles?: ResponseDocument[];
  multiple?: boolean;
}) {
  const [documentFile, setDocumentFile] = useState(initialDocument);
  const [files, setFiles] = useState(initialFiles);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(file: File) {
    setBusy(true);
    setError("");
    setStatus("Lähetetään…");
    try {
      const id = await uploadResponse(assignmentId, "file", file);
      const saved = {
        id,
        name: file.name || "tiedosto",
        mime: file.type.split(";")[0]?.trim().toLowerCase() || "application/octet-stream",
      };
      if (multiple) {
        setFiles((current) => [...current, saved]);
      } else {
        setDocumentFile(saved);
      }
      setStatus("Tiedosto tallennettu.");
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : "Lähetys epäonnistui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">
        {multiple
          ? "Voit lisätä niin monta tiedostoa kuin haluat. Yksi tiedosto enintään 25 Mt."
          : "Voit myös lisätä vastauksen tiedostona laitteelta, esimerkiksi Word-asiakirjana. Enintään 25 Mt. Uusi tiedosto korvaa edellisen."}
      </p>
      {multiple
        ? files.map((file) => <ResponseFileView key={file.id} file={file} />)
        : null}
      {!multiple && documentFile ? (
        <a href={`/api/media/${documentFile.id}?lataa=1`} className="text-pine underline">
          {documentFile.name}
        </a>
      ) : null}
      <label
        className={`inline-flex h-11 w-fit cursor-pointer items-center rounded-md border border-line bg-card px-4 text-base ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        Lisää tiedosto
        <input
          type="file"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            void send(file);
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}

function mediaHint(kind: "image" | "video" | "audio"): string {
  if (kind === "image") {
    return "Yksi kuva, jpeg, png tai webp, enintään 8 Mt. Uusi kuva korvaa edellisen.";
  }
  if (kind === "video") {
    return "Yksi video, mp4 tai webm, enintään 3 minuuttia ja 150 Mt. Puhelimessa Kuvaa video avaa kameran. Tietokoneella valitaan tallennettu tiedosto. Uusi video korvaa edellisen.";
  }
  return "Yksi äänite, webm, mp4, mpeg, aac tai wav, enintään 3 minuuttia ja 25 Mt. Äänitä pyytää puhelimelta mikrofonin. Valitse tiedosto käyttää jo tallennettua äänitettä. Uusi äänite korvaa edellisen.";
}

function AudioControls({
  disabled,
  onRecordingChange,
  onFile,
}: {
  disabled: boolean;
  onRecordingChange: (recording: boolean) => void;
  onFile: (file: File, source: "record" | "file") => void;
}) {
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const preparingRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (stopTimerRef.current !== null) {
        window.clearTimeout(stopTimerRef.current);
      }
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function setRecordingState(next: boolean) {
    setRecording(next);
    onRecordingChange(next);
  }

  async function start() {
    setError("");
    if (preparingRef.current || recorderRef.current) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tämä selain ei voi äänittää. Valitse tallennettu tiedosto.");
      return;
    }
    preparingRef.current = true;
    setPreparing(true);
    onRecordingChange(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((item) =>
        MediaRecorder.isTypeSupported(item),
      );
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        const type =
          (recorder.mimeType || mime || "audio/webm").split(";")[0]?.trim().toLowerCase() ||
          "audio/webm";
        stopStream();
        recorderRef.current = null;
        setRecordingState(false);
        if (chunks.length === 0) {
          setError("Äänite on tyhjä.");
          return;
        }
        const extension = type === "audio/mp4" ? "m4a" : "webm";
        onFile(new File(chunks, `aanite.${extension}`, { type }), "record");
      };
      recorderRef.current = recorder;
      preparingRef.current = false;
      setPreparing(false);
      setRecordingState(true);
      recorder.start();
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, MAX_VIDEO_SECONDS * 1000);
    } catch {
      stopStream();
      recorderRef.current = null;
      preparingRef.current = false;
      setPreparing(false);
      setRecordingState(false);
      setError("Mikrofonia ei saatu käyttöön.");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {recording ? (
          <button
            type="button"
            className="h-11 rounded-md border border-line bg-card px-4 text-base"
            onClick={() => recorderRef.current?.stop()}
          >
            Lopeta
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || preparing}
            className="h-11 rounded-md border border-line bg-card px-4 text-base disabled:opacity-60"
            onClick={() => {
              void start();
            }}
          >
            Äänitä
          </button>
        )}
        <label
          className={`inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-base ${
            disabled || preparing || recording ? "pointer-events-none opacity-60" : "cursor-pointer"
          }`}
        >
          Valitse tiedosto
          <input
            type="file"
            accept="audio/webm,audio/mp4,audio/mpeg,audio/aac,audio/wav,audio/x-m4a,.m4a,.mp3,.aac,.wav,.webm"
            disabled={disabled || preparing || recording}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }
              onFile(file, "file");
            }}
          />
        </label>
      </div>
      {recording ? (
        <p className="text-sm text-muted">Äänitetään. Tallennus päättyy 3 minuutissa.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const AUDIO_EXTENSIONS: Record<string, string> = {
  webm: "audio/webm",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  wav: "audio/wav",
};

function normalizeAudioFile(file: File): File {
  const raw = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const mapped =
    raw === "audio/x-m4a" || raw === "audio/m4a"
      ? "audio/mp4"
      : raw === "audio/x-wav" || raw === "audio/wave"
        ? "audio/wav"
        : raw;
  if (
    mapped === "audio/webm" ||
    mapped === "audio/mp4" ||
    mapped === "audio/mpeg" ||
    mapped === "audio/aac" ||
    mapped === "audio/wav"
  ) {
    if (mapped === file.type) {
      return file;
    }
    return new File([file], file.name || "aanite", { type: mapped });
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const inferred = AUDIO_EXTENSIONS[extension];
  if (!inferred) {
    return file;
  }
  return new File([file], file.name || "aanite", { type: inferred });
}

async function uploadResponse(
  assignmentId: string,
  kind: "image" | "video" | "audio" | "file",
  file: File,
): Promise<string> {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const response = await fetch("/api/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind,
      mime,
      byteSize: file.size,
      assignmentId,
      fileName: file.name,
    }),
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

function assertMediaDuration(file: File, kind: "video" | "audio"): Promise<void> {
  const tooLong =
    kind === "audio"
      ? "Äänite saa olla enintään 3 minuuttia."
      : "Video saa olla enintään 3 minuuttia.";
  const unreadable =
    kind === "audio" ? "Äänitteen kestoa ei voitu lukea." : "Videon kestoa ei voitu lukea.";
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(kind === "audio" ? "audio" : "video");
    let settled = false;
    const finish = (duration: number) => {
      if (settled) {
        return;
      }
      settled = true;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS) {
        reject(new Error(tooLong));
        return;
      }
      resolve();
    };
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration)) {
        finish(media.duration);
        return;
      }
      media.currentTime = Number.MAX_SAFE_INTEGER;
    };
    media.ontimeupdate = () => {
      if (Number.isFinite(media.duration)) {
        finish(media.duration);
      }
    };
    media.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      URL.revokeObjectURL(url);
      reject(new Error(unreadable));
    };
    media.src = url;
  });
}
