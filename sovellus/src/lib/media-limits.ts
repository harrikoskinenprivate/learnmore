export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 180;

/** Kuvaus pysähtyy ennen kovaa rajaa, jotta viimeinen pala mahtuu 200 megatavuun. */
export const VIDEO_RECORD_STOP_BYTES = 180 * 1024 * 1024;
export const VIDEO_AUDIO_BITRATE = 128_000;
export const VIDEO_BITRATE =
  Math.floor((VIDEO_RECORD_STOP_BYTES * 8) / MAX_VIDEO_SECONDS) - VIDEO_AUDIO_BITRATE;

const VIDEO_EXTENSIONS: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
};

export function isVideoMime(mime: string): boolean {
  return mime.split(";")[0]?.trim().toLowerCase().startsWith("video/") ?? false;
}

export function videoMimeOf(file: { type: string; name: string }): string {
  const raw = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (raw.startsWith("video/")) {
    return raw;
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return VIDEO_EXTENSIONS[extension] ?? "";
}

export function withVideoMime(file: File): File {
  const mime = videoMimeOf(file);
  if (!mime) {
    return file;
  }
  const current = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (current === mime) {
    return file;
  }
  return new File([file], file.name || "video", { type: mime });
}

export function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString("fi-FI", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

export function oversizedVideoMessage(file: File): string {
  return `Video on liian suuri (${formatMegabytes(file.size)} Mt). Raja on 200 Mt. Tallenna se puhelimeen, jotta se ei katoa.`;
}
