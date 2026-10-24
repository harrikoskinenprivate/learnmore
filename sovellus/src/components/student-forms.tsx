"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import { addStudent } from "@/app/actions/students";
import { AccessLinkNotice } from "@/components/access-link";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function TeacherStudentList({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.getElementById("name")?.focus();
    }
  }, [open]);

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Oppilaat</h1>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="lisaa-oppilas"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-pine text-2xl leading-none text-white hover:bg-pine-dark"
        >
          <span className="sr-only">{open ? "Sulje oppilaan lisäys" : "Lisää oppilas"}</span>
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>
      <div
        id="lisaa-oppilas"
        hidden={!open}
        className="rounded-lg border border-line bg-card p-6"
      >
        <h2 className="text-xl font-semibold tracking-tight">Lisää oppilas</h2>
        <p className="mt-2 mb-6 text-muted">
          Oppilas saa linkin, jolla hän avaa omat tietonsa. Salasanaa ei aseteta.
        </p>
        <AddStudentForm />
      </div>
      {children}
    </section>
  );
}

export function AddStudentForm() {
  const [state, action, pending] = useActionState(addStudent, initialState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clearedMessage, setClearedMessage] = useState(state.message);

  if (state.message !== clearedMessage) {
    setClearedMessage(state.message);
    if (state.message) {
      setName("");
      setEmail("");
    }
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nimi
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 rounded-md border border-line bg-card px-3 text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="student-email" className="text-sm font-medium">
          Sähköposti
        </label>
        <input
          id="student-email"
          name="email"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-md border border-line bg-card px-3 text-base"
        />
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
      {state.accessUrl ? <AccessLinkNotice url={state.accessUrl} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Lisää oppilas"}
      </button>
    </form>
  );
}
