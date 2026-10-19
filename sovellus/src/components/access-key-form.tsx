"use client";

import { useActionState } from "react";

import { renewStudentAccessKey } from "@/app/actions/students";
import { AccessLinkNotice } from "@/components/access-link";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function AccessKeyForm({
  studentId,
  hasAccessKey,
}: {
  studentId: string;
  hasAccessKey: boolean;
}) {
  const [state, action, pending] = useActionState(renewStudentAccessKey, initialState);

  return (
    <form
      action={action}
      className="grid gap-4"
      onSubmit={(event) => {
        if (!hasAccessKey) {
          return;
        }
        const confirmed = window.confirm(
          "Uusi linkki sulkee vanhan linkin ja oppilaan avoimet istunnot. Jatketaanko?",
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={studentId} />
      <p className="text-muted">
        {hasAccessKey
          ? "Oppilaalla on linkki. Uusi linkki korvaa sen, eikä vanhaa linkkiä näytetä uudelleen."
          : "Oppilas pääsee omiin tietoihinsa vain tällä linkillä. Salasanaa ei ole."}
      </p>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.accessUrl ? <AccessLinkNotice url={state.accessUrl} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending ? "Luodaan…" : hasAccessKey ? "Uusi linkki" : "Luo linkki"}
      </button>
    </form>
  );
}
