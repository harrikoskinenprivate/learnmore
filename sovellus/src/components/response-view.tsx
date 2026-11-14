import type {
  AssignmentMediaItem,
  MediaKind,
  ResponseDocument,
  ResponseKind,
  StoredResponse,
} from "@/lib/types";

export function ResponseView({
  kind,
  attachment = null,
  response,
}: {
  kind: ResponseKind;
  attachment?: MediaKind | null;
  response: StoredResponse;
}) {
  const files = response.files ?? [];
  if (files.length > 0) {
    return (
      <div className="grid gap-4">
        {response.body.trim() ? (
          <p className="whitespace-pre-wrap">{response.body.trim()}</p>
        ) : null}
        {files.map((file) => (
          <ResponseFileView key={file.id} file={file} />
        ))}
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className="grid gap-4">
        {response.body.trim() ? (
          <p className="whitespace-pre-wrap">{response.body.trim()}</p>
        ) : null}
        {response.document ? <ResponseDocumentLink document={response.document} /> : null}
        {!response.body.trim() && !response.document ? (
          <p className="whitespace-pre-wrap">Tyhjä vastaus</p>
        ) : null}
        {attachment ? (
          response.media ? (
            <ResponseMedia kind={response.media.kind} media={response.media} />
          ) : (
            <p className="text-muted">Tiedosto puuttuu.</p>
          )
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {response.document ? <ResponseDocumentLink document={response.document} /> : null}
      {response.media ? (
        <ResponseMedia kind={kind} media={response.media} />
      ) : (
        <p className="text-muted">Tiedosto puuttuu.</p>
      )}
    </div>
  );
}

export function ResponseDocumentLink({ document }: { document: ResponseDocument }) {
  return (
    <p>
      <a href={`/api/media/${document.id}?lataa=1`} className="text-pine underline">
        {document.name}
      </a>
    </p>
  );
}

export function ResponseFileView({ file }: { file: ResponseDocument }) {
  const src = `/api/media/${file.id}`;
  if (file.mime.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={file.name} className="w-full rounded-lg border border-line" />
    );
  }
  if (file.mime.startsWith("video/")) {
    return (
      <video
        controls
        preload="metadata"
        className="aspect-video w-full rounded-lg bg-black object-contain"
        src={src}
      />
    );
  }
  if (file.mime.startsWith("audio/")) {
    return <audio controls preload="metadata" className="w-full" src={src} />;
  }
  return <ResponseDocumentLink document={file} />;
}

export function ResponseMedia({
  kind,
  media,
}: {
  kind: "image" | "video" | "audio";
  media: AssignmentMediaItem;
}) {
  if (kind === "audio") {
    return (
      <audio controls preload="metadata" className="w-full" src={`/api/media/${media.id}`} />
    );
  }

  if (kind === "video") {
    return (
      <video
        controls
        preload="metadata"
        className="aspect-video w-full rounded-lg bg-black object-contain"
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
