"use client";

import { useActionState, useState } from "react";

import { addAssignment } from "@/app/actions/assignments";
import { AssignmentMaterialFields } from "@/components/media-fields";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function CreateAssignmentForm({
  students,
  parent,
  initialSelected = [],
}: {
  students: { id: string; name: string }[];
  parent?: { id: string; title: string };
  initialSelected?: string[];
}) {
  const [state, action, pending] = useActionState(addAssignment, initialState);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [deadline, setDeadline] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);

  return (
    <form action={action} className="grid gap-6">
      {parent ? <input type="hidden" name="parentAssignmentId" value={parent.id} /> : null}
      <div className="grid gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Otsikko
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-11 rounded-md border border-line bg-card px-3 text-base"
        />
      </div>
      <AssignmentMaterialFields onBusyChange={setMediaBusy}>
        <div className="grid gap-1.5">
          <label htmlFor="instructions" className="text-sm font-medium">
            Saateteksti
          </label>
          <textarea
            id="instructions"
            name="instructions"
            rows={4}
            maxLength={4000}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="rounded-md border border-line bg-card px-3 py-2 text-base"
          />
          <p className="text-sm text-muted">Valinnainen lyhyt teksti. Varsinainen tehtävä on PDF.</p>
        </div>
      </AssignmentMaterialFields>

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
        <p className="text-sm text-muted">
          Valinnainen. Aika on Suomen aikaa. Määräajan jälkeenkin voi vastata.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Oppilaat</legend>
        <p className="text-sm text-muted">
          {parent
            ? `Palaute linkittyy tehtävään ${parent.title}. Luonnos ei näy oppilaalle. Julkaisu onnistuu vain, jos oppilas on palauttanut tehtävän.`
            : "Luonnos ei näy oppilaille. Julkaisu antaa tehtävän valituille, ja saman tehtävän voi myöhemmin julkaista muille."}
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-muted">
            {parent ? "Oppilas ei ole vielä palauttanut tehtävää." : "Lisää ensin oppilas."}
          </p>
        ) : (
          students.map((student) => (
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
          ))
        )}
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending || mediaBusy}
          className="h-11 rounded-md border border-pine px-4 text-base font-medium text-pine hover:bg-pine hover:text-white disabled:opacity-60"
        >
          {pending ? "Tallennetaan…" : "Tallenna luonnos"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending || mediaBusy || selected.length === 0}
          className="h-11 rounded-md bg-pine px-4 text-base font-medium text-white hover:bg-pine-dark disabled:opacity-60"
        >
          {pending ? "Tallennetaan…" : "Julkaise valituille"}
        </button>
      </div>
    </form>
  );
}
