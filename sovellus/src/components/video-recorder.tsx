"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  MAX_VIDEO_SECONDS,
  VIDEO_AUDIO_BITRATE,
  VIDEO_BITRATE,
  VIDEO_RECORD_STOP_BYTES,
  formatMegabytes,
} from "@/lib/media-limits";

const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
];

export function VideoRecorder({
  disabled = false,
  onRecordingChange,
  onFile,
  children,
}: {
  disabled?: boolean;
  onRecordingChange?: (recording: boolean) => void;
  onFile: (file: File, info: { stoppedForSize: boolean }) => void;
  children?: ReactNode;
}) {
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [recordedBytes, setRecordedBytes] = useState(0);
  const [error, setError] = useState("");
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const preparingRef = useRef(false);
  const aliveRef = useRef(true);
  const onRecordingChangeRef = useRef(onRecordingChange);
  const onFileRef = useRef(onFile);
  onRecordingChangeRef.current = onRecordingChange;
  onFileRef.current = onFile;

  useEffect(() => {
    if (!recording) {
      return;
    }
    void previewRef.current?.play().catch(() => undefined);
  }, [recording]);

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
      stopStream(streamRef);
      const preview = previewRef.current;
      if (preview) {
        preview.srcObject = null;
      }
    };
  }, []);

  function setRecordingState(next: boolean) {
    setRecording(next);
    onRecordingChangeRef.current?.(next);
  }

  async function start() {
    setError("");
    if (preparingRef.current || recorderRef.current) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tämä selain ei voi kuvata. Valitse tallennettu tiedosto.");
      return;
    }
    preparingRef.current = true;
    setPreparing(true);
    onRecordingChangeRef.current?.(true);
    try {
      const stream = await openCamera();
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const preview = previewRef.current;
      if (preview) {
        preview.srcObject = stream;
        void preview.play().catch(() => undefined);
      }
      const mime = VIDEO_MIME_CANDIDATES.find((item) => MediaRecorder.isTypeSupported(item));
      const recorder = createRecorder(stream, mime);
      const chunks: Blob[] = [];
      let bytes = 0;
      let reason: "user" | "time" | "size" = "user";
      recorder.ondataavailable = (event) => {
        if (event.data.size <= 0) {
          return;
        }
        chunks.push(event.data);
        bytes += event.data.size;
        setRecordedBytes(bytes);
        if (bytes >= VIDEO_RECORD_STOP_BYTES && recorder.state === "recording") {
          reason = "size";
          window.setTimeout(() => {
            if (recorder.state === "recording") {
              recorder.stop();
            }
          }, 0);
        }
      };
      recorder.onstop = () => {
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        const type = (recorder.mimeType || mime || "video/webm").split(";")[0]?.trim().toLowerCase();
        stopStream(streamRef);
        const previewElement = previewRef.current;
        if (previewElement) {
          previewElement.srcObject = null;
        }
        recorderRef.current = null;
        setRecordingState(false);
        if (!aliveRef.current) {
          return;
        }
        if (chunks.length === 0) {
          setError("Video on tyhjä.");
          return;
        }
        const extension = type.includes("mp4") ? "mp4" : "webm";
        onFileRef.current(new File(chunks, `video.${extension}`, { type: type || "video/webm" }), {
          stoppedForSize: reason === "size",
        });
      };
      recorderRef.current = recorder;
      preparingRef.current = false;
      setPreparing(false);
      setRecordedBytes(0);
      setRecordingState(true);
      try {
        recorder.start(1000);
      } catch {
        recorder.start();
      }
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") {
          reason = reason === "size" ? reason : "time";
          recorder.stop();
        }
      }, MAX_VIDEO_SECONDS * 1000);
    } catch {
      stopStream(streamRef);
      const preview = previewRef.current;
      if (preview) {
        preview.srcObject = null;
      }
      recorderRef.current = null;
      preparingRef.current = false;
      setPreparing(false);
      setRecordingState(false);
      setError("Kameraa ei saatu käyttöön. Valitse tallennettu tiedosto.");
    }
  }

  return (
    <div className="grid gap-3">
      <video
        ref={previewRef}
        muted
        playsInline
        autoPlay
        className={`aspect-video w-full rounded-lg bg-black object-contain ${recording ? "" : "hidden"}`}
      />
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
            Kuvaa video
          </button>
        )}
        {children}
      </div>
      {recording ? (
        <p className="text-sm text-muted">
          Kuvataan. {formatMegabytes(recordedBytes)} / 200 Mt. Tallennus päättyy 3 minuutissa tai kun
          video lähestyy rajaa.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function KeptVideo({ file, message }: { file: File; message: string }) {
  const url = useObjectUrl(file);
  return (
    <div className="grid gap-2">
      {url ? (
        <video
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-black object-contain"
          src={url}
        />
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
      {url ? (
        <a
          href={url}
          download={file.name || "video.webm"}
          className="inline-flex h-11 w-fit items-center rounded-md border border-line bg-card px-4 text-base"
        >
          Tallenna puhelimeen
        </a>
      ) : null}
    </div>
  );
}

function useObjectUrl(file: File): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function stopStream(streamRef: { current: MediaStream | null }) {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: true,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    },
    { audio: true, video: { facingMode: { ideal: "environment" } } },
    { audio: true, video: true },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      last = error;
    }
  }
  throw last;
}

function createRecorder(stream: MediaStream, mime: string | undefined): MediaRecorder {
  const withBitrate: MediaRecorderOptions = {
    videoBitsPerSecond: VIDEO_BITRATE,
    audioBitsPerSecond: VIDEO_AUDIO_BITRATE,
  };
  if (mime) {
    withBitrate.mimeType = mime;
  }
  try {
    return new MediaRecorder(stream, withBitrate);
  } catch {
    try {
      return mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      return new MediaRecorder(stream);
    }
  }
}
