import { confirmUpload, mediaErrorResponse } from "@/lib/media";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await confirmUpload(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
