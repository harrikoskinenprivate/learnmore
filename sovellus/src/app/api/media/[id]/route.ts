import { Readable } from "node:stream";

import { localFileStream, mediaErrorResponse, openMedia } from "@/lib/media";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const opened = await openMedia(id);
    if (opened.kind === "redirect") {
      return Response.redirect(opened.url, 302);
    }

    const headers = new Headers({
      "content-type": opened.mime,
      "accept-ranges": "bytes",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    });

    const range = request.headers.get("range");
    if (!range) {
      headers.set("content-length", String(opened.size));
      return new Response(Readable.toWeb(localFileStream(opened.filePath)) as ReadableStream, {
        status: 200,
        headers,
      });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || opened.size < 1) {
      return new Response(null, {
        status: 416,
        headers: { "content-range": `bytes */${opened.size}` },
      });
    }

    const start = match[1] === "" ? 0 : Number(match[1]);
    const end = match[2] === "" ? opened.size - 1 : Number(match[2]);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end < start ||
      start >= opened.size
    ) {
      return new Response(null, {
        status: 416,
        headers: { "content-range": `bytes */${opened.size}` },
      });
    }

    const boundedEnd = Math.min(end, opened.size - 1);
    headers.set("content-range", `bytes ${start}-${boundedEnd}/${opened.size}`);
    headers.set("content-length", String(boundedEnd - start + 1));
    return new Response(
      Readable.toWeb(localFileStream(opened.filePath, start, boundedEnd)) as ReadableStream,
      { status: 206, headers },
    );
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
