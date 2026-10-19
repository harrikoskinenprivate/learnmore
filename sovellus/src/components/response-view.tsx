import type { AssignmentMediaItem, ResponseKind, StoredResponse } from "@/lib/types";

export function ResponseView({
  kind,
  response,
}: {
  kind: ResponseKind;
  response: StoredResponse;
}) {
  if (kind === "text") {
    return (
      <p className="whitespace-pre-wrap">{response.body.trim() || "Tyhjä vastaus"}</p>
    );
  }
  if (!response.media) {
    return <p className="text-muted">Tiedosto puuttuu.</p>;
  }
  return <ResponseMedia kind={kind} media={response.media} />;
}

export function ResponseMedia({
  kind,
  media,
}: {
  kind: "image" | "video";
  media: AssignmentMediaItem;
}) {
  if (kind === "video") {
    return (
      <video
        controls
        preload="metadata"
        className="w-full rounded-lg bg-black"
        src={`/api/media/${media.id}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/media/${media.id}`}
      alt="Oppilaan kuva"
      className="w-full rounded-lg border border-line"
    />
  );
}
