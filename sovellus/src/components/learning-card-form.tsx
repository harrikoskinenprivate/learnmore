"use client";

import { useActionState, useState } from "react";

import { saveStudentLearningCard } from "@/app/actions/students";
import type { FormState, LearningCard } from "@/lib/types";
import { LEARNING_CARD_LEVEL_MAX, LEARNING_CARD_TEXT_MAX } from "@/lib/validation";

const initialState: FormState = {};

export function LearningCardForm({
  studentId,
  card,
}: {
  studentId: string;
  card: LearningCard;
}) {
  const [state, action, pending] = useActionState(saveStudentLearningCard, initialState);
  const [level, setLevel] = useState(card.level);
  const [strengths, setStrengths] = useState(card.strengths);
  const [developmentAreas, setDevelopmentAreas] = useState(card.developmentAreas);
  const [goals, setGoals] = useState(card.goals);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={studentId} />
      <div className="grid gap-1.5">
        <label htmlFor="level" className="text-sm font-medium">
          Taso
        </label>
        <input
          id="level"
          name="level"
          type="text"
          maxLength={LEARNING_CARD_LEVEL_MAX}
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          className="h-11 rounded-md border border-line bg-card px-3 text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="strengths" className="text-sm font-medium">
          Vahvuudet
        </label>
        <textarea
          id="strengths"
          name="strengths"
          rows={4}
          maxLength={LEARNING_CARD_TEXT_MAX}
          value={strengths}
          onChange={(event) => setStrengths(event.target.value)}
          className="rounded-md border border-line bg-card px-3 py-2 text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="developmentAreas" className="text-sm font-medium">
          Kehityskohteet
        </label>
        <textarea
          id="developmentAreas"
          name="developmentAreas"
          rows={4}
          maxLength={LEARNING_CARD_TEXT_MAX}
          value={developmentAreas}
          onChange={(event) => setDevelopmentAreas(event.target.value)}
          className="rounded-md border border-line bg-card px-3 py-2 text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="goals" className="text-sm font-medium">
          Tavoitteet
        </label>
        <textarea
          id="goals"
          name="goals"
          rows={4}
          maxLength={LEARNING_CARD_TEXT_MAX}
          value={goals}
          onChange={(event) => setGoals(event.target.value)}
          className="rounded-md border border-line bg-card px-3 py-2 text-base"
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
      <button
        type="submit"
        disabled={pending}
        className="h-11 justify-self-start rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna kortti"}
      </button>
    </form>
  );
}
