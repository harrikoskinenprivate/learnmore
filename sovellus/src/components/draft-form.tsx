"use client";

import { useActionState, useState } from "react";

import { saveAssignmentDraft } from "@/app/actions/assignments";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function DraftForm({
  assignmentId,
  questions,
}: {
  assignmentId: string;
  questions: { id: string; prompt: string; answer: string }[];
}) {
  const [state, action, pending] = useActionState(saveAssignmentDraft, initialState);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, question.answer])),
  );

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {questions.map((question, index) => (
        <div key={question.id} className="grid gap-1.5">
          <label htmlFor={`answer-${question.id}`} className="font-medium">
            {index + 1}. {question.prompt}
          </label>
          <textarea
            id={`answer-${question.id}`}
            name={`answer:${question.id}`}
            rows={4}
            maxLength={8000}
            value={answers[question.id] ?? ""}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                [question.id]: event.target.value,
              }))
            }
            className="rounded-md border border-line bg-card px-3 py-2 text-base"
          />
        </div>
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
      <p className="text-sm text-muted">Palautuksen jälkeen vastausta ei voi muokata.</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending || questions.length === 0}
          className="h-11 rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white disabled:opacity-60"
        >
          {pending ? "Tallennetaan…" : "Tallenna luonnos"}
        </button>
        <button
          type="submit"
          name="intent"
          value="return"
          disabled={pending || questions.length === 0}
          className="h-11 rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
        >
          {pending ? "Tallennetaan…" : "Palauta"}
        </button>
      </div>
    </form>
  );
}
