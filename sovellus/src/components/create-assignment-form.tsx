"use client";

import { useActionState, useState } from "react";

import { addAssignment } from "@/app/actions/assignments";
import { MediaFields } from "@/components/media-fields";
import type { FormState, ResponseKind } from "@/lib/types";

const initialState: FormState = {};

type LinkRow = { title: string; url: string };

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
  const [links, setLinks] = useState<LinkRow[]>([{ title: "", url: "" }]);
  const [responseKind, setResponseKind] = useState<ResponseKind>("text");
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [deadline, setDeadline] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);

  function updateLink(index: number, field: keyof LinkRow, value: string) {
    setLinks((current) =>
      current.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

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
      <div className="grid gap-1.5">
        <label htmlFor="instructions" className="text-sm font-medium">
          Ohje
        </label>
        <textarea
          id="instructions"
          name="instructions"
          required
          rows={5}
          maxLength={4000}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          className="rounded-md border border-line bg-card px-3 py-2 text-base"
        />
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Linkit dokumentteihin</legend>
        <p className="text-sm text-muted">
          Tallennetaan otsikko ja osoite. Itse dokumentti jää siihen palveluun, jossa se jo on.
        </p>
        {links.map((link, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <input
              name="linkTitle"
              type="text"
              aria-label={`Linkin ${index + 1} otsikko`}
              placeholder="Otsikko"
              maxLength={120}
              value={link.title}
              onChange={(event) => updateLink(index, "title", event.target.value)}
              className="h-11 rounded-md border border-line bg-card px-3 text-base"
            />
            <input
              name="linkUrl"
              type="url"
              aria-label={`Linkin ${index + 1} osoite`}
              placeholder="https://"
              value={link.url}
              onChange={(event) => updateLink(index, "url", event.target.value)}
              className="h-11 rounded-md border border-line bg-card px-3 text-base"
            />
            <button
              type="button"
              className="h-11 rounded-md px-3 text-danger hover:bg-danger-bg"
              onClick={() =>
                setLinks((current) =>
                  current.length === 1 ? [{ title: "", url: "" }] : current.filter((_, i) => i !== index),
                )
              }
            >
              Poista
            </button>
          </div>
        ))}
        <button
          type="button"
          className="h-11 justify-self-start rounded-md border border-line bg-card px-4 text-base"
          onClick={() => setLinks((current) => [...current, { title: "", url: "" }])}
        >
          Lisää linkki
        </button>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Oppilaan palautus</legend>
        <p className="text-sm text-muted">Tehtävässä on yksi palautustapa.</p>
        {(
          [
            ["text", "Tekstikenttä"],
            ["image", "Kuva"],
            ["video", "Video"],
            ["audio", "Pelkkä äänite"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="responseKind"
              value={value}
              checked={responseKind === value}
              onChange={() => setResponseKind(value)}
              required
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <MediaFields onBusyChange={setMediaBusy} />

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
