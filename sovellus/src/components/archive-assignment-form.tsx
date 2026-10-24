"use client";

import { useActionState } from "react";

import { archiveAssignment } from "@/app/actions/assignments";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function ArchiveAssignmentForm({
  assignmentId,
  archived,
}: {
  assignmentId: string;
  archived: boolean;
}) {
  const [state, action, pending] = useActionState(archiveAssignment, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <p className="text-muted">
        {archived
          ? "Tehtävä on arkistossa. Palautus aktiivisiin näyttää sen taas aktiivisissa listoissa."
          : "Arkistointi siirtää tehtävän pois aktiivisista. Oppilas voi avata sen arkistosta, mutta ei enää vastata."}
      </p>
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
        name="intent"
        value={archived ? "restore" : "archive"}
        disabled={pending}
        className="h-11 justify-self-start rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : archived ? "Palauta aktiiviseksi" : "Arkistoi"}
      </button>
    </form>
  );
}
