import "server-only";

import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getOptionalUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  assignmentMedia,
  assignmentResponses,
  assignmentStudents,
  assignments,
} from "@/lib/db/schema";
import type { AssignmentMediaItem, CurrentUser, MediaKind } from "@/lib/types";
import { isUuid } from "@/lib/validation";

export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 180;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);

export class MediaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type MediaRow = typeof assignmentMedia.$inferSelect;

function storeKind(): "local" | "gcs" {
  return process.env.MEDIA_STORE === "gcs" ? "gcs" : "local";
}

function maxBytes(kind: MediaKind): number {
  return kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

function allowedMime(kind: MediaKind, mime: string): boolean {
  return kind === "image" ? IMAGE_MIMES.has(mime) : VIDEO_MIMES.has(mime);
}

function objectKeyFor(kind: MediaKind, id: string): string {
  return `${kind === "image" ? "images" : "videos"}/${id}`;
}

function localPath(objectKey: string): string {
  if (!/^(images|videos)\/[0-9a-f-]{36}$/i.test(objectKey)) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  return path.join(process.cwd(), "data", "media", objectKey);
}

async function requireSignedIn(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) {
    throw new MediaError("Kirjaudu ensin.", 401);
  }
  return user;
}

async function requireTeacherUser(): Promise<CurrentUser> {
  const user = await requireSignedIn();
  if (user.role !== "teacher") {
    throw new MediaError("Vain opettaja voi lisätä kuvia ja videon.", 403);
  }
  return user;
}

async function ownedMedia(id: string, userId: string): Promise<MediaRow> {
  if (!isUuid(id)) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  const rows = await db
    .select()
    .from(assignmentMedia)
    .where(eq(assignmentMedia.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.createdBy !== userId) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  return row;
}

export async function createUpload(input: {
  kind: string;
  mime: string;
  byteSize: number;
  assignmentId?: string;
}): Promise<{
  id: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
}> {
  if (input.assignmentId) {
    return createResponseUpload(input);
  }

  const teacher = await requireTeacherUser();
  const kind = checkedKind(input.kind, input.mime, input.byteSize);
  const id = randomUUID();
  const objectKey = objectKeyFor(kind.kind, id);
  await db.insert(assignmentMedia).values({
    id,
    createdBy: teacher.id,
    kind: kind.kind,
    status: "pending",
    objectKey,
    mime: kind.mime,
    byteSize: input.byteSize,
    sortOrder: 0,
  });

  return uploadTarget(id, objectKey, kind.mime);
}

function checkedKind(
  rawKind: string,
  rawMime: string,
  byteSize: number,
): { kind: MediaKind; mime: string } {
  if (rawKind !== "image" && rawKind !== "video") {
    throw new MediaError("Tiedoston tyyppi ei kelpaa.", 400);
  }
  const kind = rawKind;
  const mime = rawMime.trim().toLowerCase();
  if (!allowedMime(kind, mime)) {
    throw new MediaError(
      kind === "image"
        ? "Kuva saa olla jpeg, png tai webp."
        : "Video saa olla mp4 tai webm.",
      400,
    );
  }
  if (!Number.isInteger(byteSize) || byteSize < 1 || byteSize > maxBytes(kind)) {
    throw new MediaError("Tiedosto on liian suuri.", 413);
  }
  return { kind, mime };
}

async function createResponseUpload(input: {
  kind: string;
  mime: string;
  byteSize: number;
  assignmentId?: string;
}): Promise<{
  id: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
}> {
  const user = await requireSignedIn();
  if (user.role !== "student") {
    throw new MediaError("Vain oppilas voi palauttaa tiedoston.", 403);
  }
  const assignmentId = input.assignmentId ?? "";
  if (!isUuid(assignmentId)) {
    throw new MediaError("Tehtävää ei löydy.", 404);
  }
  const kind = checkedKind(input.kind, input.mime, input.byteSize);
  const rows = await db
    .select({
      responseKind: assignments.responseKind,
      returnedAt: assignmentStudents.returnedAt,
    })
    .from(assignmentStudents)
    .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
    .where(
      and(
        eq(assignmentStudents.assignmentId, assignmentId),
        eq(assignmentStudents.studentId, user.id),
        eq(assignments.status, "published"),
      ),
    )
    .limit(1);
  const assignment = rows[0];
  if (!assignment || assignment.responseKind !== kind.kind) {
    throw new MediaError("Tehtävää ei löydy.", 404);
  }
  if (assignment.returnedAt) {
    throw new MediaError("Tehtävä on jo palautettu.", 400);
  }

  const id = randomUUID();
  const objectKey = objectKeyFor(kind.kind, id);
  await db.insert(assignmentMedia).values({
    id,
    assignmentId,
    createdBy: user.id,
    studentId: user.id,
    kind: kind.kind,
    status: "pending",
    objectKey,
    mime: kind.mime,
    byteSize: input.byteSize,
    sortOrder: 0,
  });
  return uploadTarget(id, objectKey, kind.mime);
}

async function uploadTarget(
  id: string,
  objectKey: string,
  mime: string,
): Promise<{
  id: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
}> {
  const headers = { "content-type": mime };
  if (storeKind() === "local") {
    return {
      id,
      uploadUrl: `/api/media/uploads/${id}`,
      method: "PUT",
      headers,
    };
  }

  const file = await gcsFile(objectKey);
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: mime,
  });
  return { id, uploadUrl, method: "PUT", headers };
}

export async function saveLocalUpload(id: string, request: Request): Promise<void> {
  if (storeKind() !== "local") {
    throw new MediaError("Tätä osoitetta käytetään vain paikallisessa tallennuksessa.", 404);
  }
  const user = await requireSignedIn();
  const row = await ownedMedia(id, user.id);
  if (row.status !== "pending") {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== row.mime) {
    throw new MediaError("Tiedoston tyyppi ei vastaa ilmoitettua.", 400);
  }

  const destination = localPath(row.objectKey);
  const temporary = `${destination}.part`;
  await mkdir(path.dirname(destination), { recursive: true });
  if (!request.body) {
    throw new MediaError("Tiedosto puuttuu.", 400);
  }

  let total = 0;
  const limit = maxBytes(row.kind);
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      total += chunk.length;
      if (total > limit) {
        callback(new MediaError("Tiedosto on liian suuri.", 413));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as unknown as NodeReadableStream),
      limiter,
      createWriteStream(temporary),
    );
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw unwrapMediaError(error);
  }
}

export async function confirmUpload(id: string): Promise<void> {
  const user = await requireSignedIn();
  const row = await ownedMedia(id, user.id);
  if (row.studentId) {
    if (row.status !== "ready") {
      await assertStoredSize(row);
    }
    await attachStudentResponse(row);
    return;
  }
  if (row.assignmentId) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  if (row.status === "ready") {
    return;
  }

  await assertStoredSize(row);
  await db
    .update(assignmentMedia)
    .set({ status: "ready" })
    .where(and(eq(assignmentMedia.id, row.id), eq(assignmentMedia.status, "pending")));
}

async function assertStoredSize(row: MediaRow): Promise<void> {
  const actual = await storedSize(row);
  if (actual !== row.byteSize) {
    await removeStored(row);
    throw new MediaError("Tiedoston koko ei täsmää.", 400);
  }
}

async function attachStudentResponse(row: MediaRow): Promise<void> {
  if (!row.assignmentId || !row.studentId || (row.kind !== "image" && row.kind !== "video")) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  const assignmentId = row.assignmentId;
  const studentId = row.studentId;

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT returned_at
      FROM assignment_students
      WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}
      FOR UPDATE
    `);
    const rows = await tx
      .select({
        responseKind: assignments.responseKind,
        returnedAt: assignmentStudents.returnedAt,
      })
      .from(assignmentStudents)
      .innerJoin(assignments, eq(assignments.id, assignmentStudents.assignmentId))
      .where(
        and(
          eq(assignmentStudents.assignmentId, assignmentId),
          eq(assignmentStudents.studentId, studentId),
          eq(assignments.status, "published"),
        ),
      )
      .limit(1);
    const assignment = rows[0];
    if (!assignment || assignment.responseKind !== row.kind) {
      throw new MediaError("Tehtävää ei löydy.", 404);
    }
    if (assignment.returnedAt) {
      throw new MediaError("Tehtävä on jo palautettu.", 400);
    }

    await tx
      .update(assignmentMedia)
      .set({ status: "ready" })
      .where(eq(assignmentMedia.id, row.id));
    const now = new Date();
    await tx
      .insert(assignmentResponses)
      .values({
        assignmentId,
        studentId,
        body: "",
        mediaId: row.id,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assignmentResponses.assignmentId, assignmentResponses.studentId],
        set: { mediaId: row.id, updatedAt: now },
      });
  });

  const current = await db
    .select({ mediaId: assignmentResponses.mediaId })
    .from(assignmentResponses)
    .where(
      and(
        eq(assignmentResponses.assignmentId, assignmentId),
        eq(assignmentResponses.studentId, studentId),
      ),
    )
    .limit(1);
  const keepId = current[0]?.mediaId;
  if (!keepId) {
    return;
  }
  const others = await db
    .select()
    .from(assignmentMedia)
    .where(
      and(
        eq(assignmentMedia.assignmentId, assignmentId),
        eq(assignmentMedia.studentId, studentId),
        ne(assignmentMedia.id, keepId),
      ),
    );
  for (const other of others) {
    await removeStored(other);
    await db.delete(assignmentMedia).where(eq(assignmentMedia.id, other.id));
  }
}

async function storedSize(row: MediaRow): Promise<number> {
  if (storeKind() === "local") {
    try {
      const info = await stat(localPath(row.objectKey));
      return info.size;
    } catch {
      throw new MediaError("Tiedosto puuttuu.", 400);
    }
  }

  const file = await gcsFile(row.objectKey);
  const [exists] = await file.exists();
  if (!exists) {
    throw new MediaError("Tiedosto puuttuu.", 400);
  }
  const [metadata] = await file.getMetadata();
  const contentType = String(metadata.contentType ?? "").toLowerCase();
  if (contentType !== row.mime) {
    await file.delete({ ignoreNotFound: true });
    throw new MediaError("Tiedoston tyyppi ei vastaa ilmoitettua.", 400);
  }
  return Number(metadata.size ?? 0);
}

async function removeStored(row: MediaRow): Promise<void> {
  if (storeKind() === "local") {
    await rm(localPath(row.objectKey), { force: true });
    return;
  }
  const file = await gcsFile(row.objectKey);
  await file.delete({ ignoreNotFound: true });
}

export async function listAssignmentMedia(assignmentId: string): Promise<AssignmentMediaItem[]> {
  return db
    .select({
      id: assignmentMedia.id,
      kind: assignmentMedia.kind,
      mime: assignmentMedia.mime,
    })
    .from(assignmentMedia)
    .where(
      and(
        eq(assignmentMedia.assignmentId, assignmentId),
        eq(assignmentMedia.status, "ready"),
        isNull(assignmentMedia.studentId),
      ),
    )
    .orderBy(asc(assignmentMedia.sortOrder));
}

export async function attachMedia(
  tx: Pick<typeof db, "update">,
  input: { assignmentId: string; teacherId: string; mediaIds: string[] },
): Promise<void> {
  for (const [index, mediaId] of input.mediaIds.entries()) {
    const updated = await tx
      .update(assignmentMedia)
      .set({ assignmentId: input.assignmentId, sortOrder: index })
      .where(
        and(
          eq(assignmentMedia.id, mediaId),
          eq(assignmentMedia.createdBy, input.teacherId),
          eq(assignmentMedia.status, "ready"),
          isNull(assignmentMedia.assignmentId),
        ),
      )
      .returning({ id: assignmentMedia.id });
    if (!updated[0]) {
      throw new MediaError("Kuvia tai videota ei löydy. Lisää ne uudelleen.", 400);
    }
  }
}

export async function validateMediaSelection(
  teacherId: string,
  mediaIds: string[],
): Promise<string[]> {
  const uniqueIds = [...new Set(mediaIds.filter(isUuid))];
  if (uniqueIds.length === 0) {
    return [];
  }
  if (uniqueIds.length > MAX_IMAGES + 1) {
    throw new MediaError("Liitteitä on liikaa.", 400);
  }

  const rows = await db
    .select({ id: assignmentMedia.id, kind: assignmentMedia.kind })
    .from(assignmentMedia)
    .where(
      and(
        inArray(assignmentMedia.id, uniqueIds),
        eq(assignmentMedia.createdBy, teacherId),
        eq(assignmentMedia.status, "ready"),
        isNull(assignmentMedia.assignmentId),
      ),
    );

  if (rows.length !== uniqueIds.length) {
    throw new MediaError("Kuvia tai videota ei löydy. Lisää ne uudelleen.", 400);
  }

  const byId = new Map(rows.map((row) => [row.id, row.kind]));
  const ordered = uniqueIds.map((id) => byId.get(id));
  const images = ordered.filter((kind) => kind === "image").length;
  const videos = ordered.filter((kind) => kind === "video").length;
  if (images > MAX_IMAGES) {
    throw new MediaError("Kuvia voi olla enintään 8.", 400);
  }
  if (videos > 1) {
    throw new MediaError("Ohjevideoita voi olla yksi.", 400);
  }
  return uniqueIds;
}

export async function openMedia(id: string): Promise<
  | { kind: "local"; mime: string; size: number; filePath: string }
  | { kind: "redirect"; url: string }
> {
  const user = await getOptionalUser();
  if (!user || !isUuid(id)) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }

  const rows = await db.select().from(assignmentMedia).where(eq(assignmentMedia.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.status !== "ready" || !row.assignmentId) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }

  if (row.studentId) {
    if (user.role === "student") {
      if (user.id !== row.studentId) {
        throw new MediaError("Tiedostoa ei löydy.", 404);
      }
    } else {
      const returned = await db
        .select({ returnedAt: assignmentStudents.returnedAt })
        .from(assignmentStudents)
        .where(
          and(
            eq(assignmentStudents.assignmentId, row.assignmentId),
            eq(assignmentStudents.studentId, row.studentId),
          ),
        )
        .limit(1);
      if (!returned[0]?.returnedAt) {
        throw new MediaError("Tiedostoa ei löydy.", 404);
      }
    }
  } else if (user.role === "student") {
    const allowed = await db
      .select({ assignmentId: assignmentStudents.assignmentId })
      .from(assignmentStudents)
      .where(
        and(
          eq(assignmentStudents.assignmentId, row.assignmentId),
          eq(assignmentStudents.studentId, user.id),
        ),
      )
      .limit(1);
    if (!allowed[0]) {
      throw new MediaError("Tiedostoa ei löydy.", 404);
    }
  } else {
    const assignment = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.id, row.assignmentId))
      .limit(1);
    if (!assignment[0]) {
      throw new MediaError("Tiedostoa ei löydy.", 404);
    }
  }

  if (storeKind() === "gcs") {
    const file = await gcsFile(row.objectKey);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });
    return { kind: "redirect", url };
  }

  const filePath = localPath(row.objectKey);
  const info = await stat(filePath).catch(() => null);
  if (!info) {
    throw new MediaError("Tiedostoa ei löydy.", 404);
  }
  return { kind: "local", mime: row.mime, size: info.size, filePath };
}

export function localFileStream(filePath: string, start?: number, end?: number) {
  return createReadStream(filePath, { start, end });
}

export function mediaErrorResponse(error: unknown): Response {
  if (error instanceof MediaError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Tallennus epäonnistui." }, { status: 500 });
}

async function gcsFile(objectKey: string) {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    throw new MediaError("GCS_BUCKET puuttuu.", 500);
  }
  const { Storage } = await import("@google-cloud/storage");
  return new Storage().bucket(bucketName).file(objectKey);
}

function unwrapMediaError(error: unknown): unknown {
  if (error instanceof MediaError) {
    return error;
  }
  if (error && typeof error === "object" && "cause" in error) {
    const cause = error.cause;
    if (cause instanceof MediaError) {
      return cause;
    }
  }
  return error;
}
