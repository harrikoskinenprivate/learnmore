import { createUpload, mediaErrorResponse } from "@/lib/media";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: unknown;
      mime?: unknown;
      byteSize?: unknown;
      assignmentId?: unknown;
    };
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : "";
    const result = await createUpload({
      kind: String(body.kind ?? ""),
      mime: String(body.mime ?? ""),
      byteSize: Number(body.byteSize),
      assignmentId: assignmentId || undefined,
    });
    return Response.json(result);
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
