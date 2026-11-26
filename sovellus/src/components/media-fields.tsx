"use client";

import { useRef, useState, type ReactNode } from "react";

import { KeptVideo } from "@/components/video-recorder";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, oversizedVideoMessage } from "@/lib/media-limits";

type Uploaded = { id: string; name: string };

export function AssignmentMaterialFields({
  onBusyChange,
  children,
}: {
  onBusyChange: (busy: boolean) => void;
  children?: ReactNode;
}) {
  const [video, setVideo] = useState<Uploaded | null>(null);
  const [pdf, setPdf] = useState<Uploaded | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const busyCount = useRef(0);

  async function withBusy(work: () => Promise<void>, report = true): Promise<string | null> {
    busyCount.current += 1;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setStatus("Lähetetään…");
    try {
      await work();
      if (busyCount.current === 1) {
        setStatus("");
      }
      return null;
    } catch (caught) {
      setStatus("");
      const message = caught instanceof Error ? caught.message : "Lähetys epäonnistui.";
      if (report) {
        setError(message);
      }
      return message;
    } finally {
      busyCount.current -= 1;
      if (busyCount.current === 0) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Introvideo</legend>
        <p className="text-sm text-muted">
          Valinnainen. Yksi video, mp4 tai webm, enintään 3 minuuttia ja 200 Mt. Puhelimessa avautuu
          sama valinta kuin liitettä lisättäessä. Jos video on liian suuri, sen voi tallentaa
          puhelimeen.
        </p>
        <InstructionVideoControls
          disabled={busy}
          onFile={async (file) => {
            const message = await withBusy(async () => {
              const id = await uploadTeacherFile("video", file);
              setVideo({ id, name: file.name || "Introvideo" });
            }, false);
            if (message) {
              throw new Error(message);
            }
          }}
        />
        {video ? <p className="text-sm">{video.name}</p> : null}
        {video ? <input type="hidden" name="mediaId" value={video.id} /> : null}
      </fieldset>
      {children}
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Tehtäväpaperi</legend>
        <p className="text-sm text-muted">
          Valinnainen PDF, enintään 25 Mt. Oppilas näkee sen sivulla ja voi ladata sen.
        </p>
        {pdf ? <p className="text-sm">{pdf.name}</p> : null}
        {pdf ? <input type="hidden" name="pdfId" value={pdf.id} /> : null}
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }
              void withBusy(async () => {
                const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
                if (mime !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                  throw new Error("Tehtäväpaperin pitää olla PDF.");
                }
                const prepared =
                  mime === "application/pdf" ? file : new File([file], file.name, { type: "application/pdf" });
                const id = await uploadTeacherFile("pdf", prepared);
                setPdf({ id, name: file.name || "tehtava.pdf" });
              });
            }}
          />
        </label>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}

export function InstructionVideoControls({
  disabled,
  onFile,
}: {
  disabled?: boolean;
  onFile: (file: File) => void | Promise<void>;
}) {
  const [error, setError] = useState("");
  const [kept, setKept] = useState<File | null>(null);

  return (
    <div className="grid gap-2">
      <label
        className={`inline-flex h-11 w-fit cursor-pointer items-center rounded-md border border-line bg-card px-4 text-base ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        Lisää video
        <input
          type="file"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            void (async () => {
              setError("");
              setKept(null);
              let prepared = file;
              try {
                prepared = videoFile(file);
                if (prepared.size > MAX_VIDEO_BYTES) {
                  setKept(prepared);
                  setError(oversizedVideoMessage(prepared));
                  return;
                }
                await assertDuration(prepared);
                await onFile(prepared);
              } catch (caught) {
                setKept(prepared);
                setError(caught instanceof Error ? caught.message : "Videon lähetys epäonnistui.");
              }
            })();
          }}
        />
      </label>
      {kept ? <KeptVideo file={kept} message={error} /> : null}
      {error && !kept ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function uploadTeacherFile(kind: "video" | "pdf", file: File): Promise<string> {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const response = await fetch("/api/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, mime, byteSize: file.size, fileName: file.name }),
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

function videoFile(file: File): File {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "video/mp4" || mime === "video/webm") {
    return file;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp4")) {
    return new File([file], file.name, { type: "video/mp4" });
  }
  if (name.endsWith(".webm")) {
    return new File([file], file.name, { type: "video/webm" });
  }
  throw new Error("Video saa olla mp4 tai webm.");
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
