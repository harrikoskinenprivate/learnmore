"use client";

import { useActionState, useState } from "react";

import { publishAssignment } from "@/app/actions/assignments";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function PublishAssignmentForm({
  assignmentId,
  students,
  published,
}: {
  assignmentId: string;
  students: { id: string; name: string }[];
  published: boolean;
}) {
  const [state, action, pending] = useActionState(publishAssignment, initialState);
  const [selected, setSelected] = useState<string[]>([]);

  if (students.length === 0) {
    return (
      <p className="text-muted">
        {published ? "Kaikki oppilaat ovat jo tällä tehtävällä." : "Lisää ensin oppilas."}
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {students.map((student) => (
        <label key={student.id} className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="studentId"
            value={student.id}
            checked={selected.includes(student.id)}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked
                  ? [...current, student.id]
                  : current.filter((id) => id !== student.id),
              )
            }
          />
          <span>{student.name}</span>
        </label>
      ))}
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
        disabled={pending || selected.length === 0}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending ? "Julkaistaan…" : published ? "Julkaise valituille" : "Julkaise"}
      </button>
    </form>
  );
}
