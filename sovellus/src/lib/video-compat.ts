import { spawn } from "node:child_process";
import { open, stat } from "node:fs/promises";

const HEVC_CODES = ["hvc1", "hev1", "dvh1", "dvhe"] as const;
const PROBE_BYTES = 2 * 1024 * 1024;

export function bufferHasHevc(buffer: Buffer): boolean {
  return HEVC_CODES.some((code) => buffer.includes(code));
}

export async function fileHasHevc(filePath: string): Promise<boolean> {
  const info = await stat(filePath);
  const file = await open(filePath, "r");
  try {
    const headLength = Math.min(info.size, PROBE_BYTES);
    const head = Buffer.alloc(headLength);
    await file.read(head, 0, headLength, 0);
    if (bufferHasHevc(head)) {
      return true;
    }
    if (info.size <= headLength) {
      return false;
    }
    const tailLength = Math.min(info.size, PROBE_BYTES);
    const tail = Buffer.alloc(tailLength);
    await file.read(tail, 0, tailLength, info.size - tailLength);
    return bufferHasHevc(tail);
  } finally {
    await file.close();
  }
}

export async function transcodeToAvc(inputPath: string, outputPath: string): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale='min(1280,iw)':-2",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    const errors: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new Error("ffmpeg puuttuu"));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = Buffer.concat(errors).toString("utf8").trim().slice(-400);
      reject(new Error(detail || `ffmpeg päättyi koodiin ${code ?? "tuntematon"}`));
    });
  });
}
