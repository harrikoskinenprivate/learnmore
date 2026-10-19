"use client";

import { useRef, useState } from "react";

const MAX_IMAGES = 8;
const MAX_VIDEO_SECONDS = 180;

type Uploaded = { id: string; name: string };

export function MediaFields({
  onBusyChange,
}: {
  onBusyChange: (busy: boolean) => void;
}) {
  const [images, setImages] = useState<Uploaded[]>([]);
  const [video, setVideo] = useState<Uploaded | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const busyCount = useRef(0);

  async function upload(kind: "image" | "video", file: File): Promise<string> {
    const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    const response = await fetch("/api/media/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, mime, byteSize: file.size }),
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

    const confirmed = await fetch(`/api/media/uploads/${created.id}/confirm`, {
      method: "POST",
    });
    if (!confirmed.ok) {
      const failed = (await confirmed.json().catch(() => ({}))) as { error?: string };
      throw new Error(failed.error ?? "Lähetys epäonnistui.");
    }
    return created.id;
  }

  async function withBusy(work: () => Promise<void>) {
    busyCount.current += 1;
    onBusyChange(true);
    setError("");
    setStatus("Lähetetään…");
    try {
      await work();
      if (busyCount.current === 1) {
        setStatus("");
      }
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : "Lähetys epäonnistui.");
    } finally {
      busyCount.current -= 1;
      if (busyCount.current === 0) {
        onBusyChange(false);
      }
    }
  }

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
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
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setRecording(false);
        const file = new File(chunks, "ohjevideo.webm", { type: "video/webm" });
        void withBusy(async () => {
          const id = await upload("video", file);
          setVideo({ id, name: "Kameratallenne" });
        });
      };
      recorderRef.current = recorder;
      setRecording(true);
      recorder.start();
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, MAX_VIDEO_SECONDS * 1000);
    } catch {
      setRecording(false);
      setError("Kameraa ei saatu käyttöön.");
    }
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Kuvat ja ohjevideo</legend>
      <p className="text-sm text-muted">
        Valinnainen. Kuvia enintään 8 (jpeg, png tai webp, 8 Mt). Yksi ohjevideo, enintään 3 minuuttia
        (mp4 tai webm, 150 Mt).
      </p>
      <label className="grid gap-1.5 text-sm">
        Kuvat
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-base"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length === 0) {
              return;
            }
            void withBusy(async () => {
              if (images.length + files.length > MAX_IMAGES) {
                throw new Error("Kuvia voi olla enintään 8.");
              }
              const added: Uploaded[] = [];
              for (const file of files) {
                const id = await upload("image", file);
                added.push({ id, name: file.name || "Kuva" });
              }
              setImages((current) => [...current, ...added]);
            });
          }}
        />
      </label>
      {images.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {images.map((image) => (
            <li key={image.id}>{image.name}</li>
          ))}
        </ul>
      ) : null}
      <label className="grid gap-1.5 text-sm">
        Videotiedosto
        <input
          type="file"
          accept="video/mp4,video/webm"
          className="text-base"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            void withBusy(async () => {
              await assertDuration(file);
              const id = await upload("video", file);
              setVideo({ id, name: file.name || "Ohjevideo" });
            });
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {recording ? (
          <button
            type="button"
            className="h-11 rounded-md border border-line bg-card px-4 text-base"
            onClick={() => recorderRef.current?.stop()}
          >
            Lopeta kuvaus
          </button>
        ) : (
          <button
            type="button"
            className="h-11 rounded-md border border-line bg-card px-4 text-base"
            onClick={() => {
              void startCamera();
            }}
          >
            Kuvaa ohjevideo
          </button>
        )}
        {recording ? (
          <span className="self-center text-sm text-muted">Tallennus päättyy 3 minuutissa.</span>
        ) : null}
      </div>
      {video ? <p className="text-sm">{video.name}</p> : null}
      {video ? <input type="hidden" name="mediaId" value={video.id} /> : null}
      {images.map((image) => (
        <input key={image.id} type="hidden" name="mediaId" value={image.id} />
      ))}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </fieldset>
  );
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
