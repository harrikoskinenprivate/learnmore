"use client";

import { useActionState, useState } from "react";

import { saveAssignmentDeadline } from "@/app/actions/assignments";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function DeadlineForm({
  assignmentId,
  initialValue,
}: {
  assignmentId: string;
  initialValue: string;
}) {
  const [state, action, pending] = useActionState(saveAssignmentDeadline, initialState);
  const [deadline, setDeadline] = useState(initialValue);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <div className="grid gap-1.5">
        <label htmlFor="deadline" className="text-sm font-medium">
          Määräaika
        </label>
        <input
          id="deadline"
          name="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          className="h-11 rounded-md border border-line bg-card px-3 text-base"
        />
        <p className="text-sm text-muted">Suomen aikaa. Tyhjä kenttä poistaa määräajan.</p>
      </div>
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
        className="h-11 justify-self-start rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna määräaika"}
      </button>
    </form>
  );
}
