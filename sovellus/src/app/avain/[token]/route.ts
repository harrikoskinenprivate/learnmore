import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { redeemAccessKey } from "@/lib/access-keys";
import { createSession } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  await cookies();
  const { token } = await context.params;
  const studentId = await redeemAccessKey(token);
  if (!studentId) {
    redirect("/avain/virhe");
  }

  await createSession(studentId);
  redirect("/");
}
