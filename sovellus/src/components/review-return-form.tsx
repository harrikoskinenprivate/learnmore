"use client";

import { useActionState } from "react";

import { markAssignmentReviewed } from "@/app/actions/assignments";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function ReviewReturnForm({
  assignmentId,
  studentId,
}: {
  assignmentId: string;
  studentId: string;
}) {
  const [state, action, pending] = useActionState(markAssignmentReviewed, initialState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-pine">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Merkitse tarkistetuksi"}
      </button>
    </form>
  );
}
