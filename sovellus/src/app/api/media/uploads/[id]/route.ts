import { mediaErrorResponse, saveLocalUpload } from "@/lib/media";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await saveLocalUpload(id, request);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
