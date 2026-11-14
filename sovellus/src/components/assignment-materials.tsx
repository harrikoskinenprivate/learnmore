import type { AssignmentLinkItem, AssignmentMediaItem, ResponseDocument } from "@/lib/types";

export function AssignmentMaterials({
  instructions,
  media,
  links,
  taskPdf,
}: {
  instructions: string;
  media: AssignmentMediaItem[];
  links: AssignmentLinkItem[];
  taskPdf: ResponseDocument | null;
}) {
  const videos = media.filter((item) => item.kind === "video");
  const images = media.filter((item) => item.kind === "image");

  return (
    <>
      {videos.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Introvideo</h2>
          {videos.map((item) => (
            <video
              key={item.id}
              controls
              preload="metadata"
              className="aspect-video w-full rounded-lg bg-black object-contain"
              src={`/api/media/${item.id}`}
            />
          ))}
        </section>
      ) : null}
      {instructions.trim() ? (
        <p className="whitespace-pre-wrap rounded-lg border border-line bg-card p-6">
          {instructions.trim()}
        </p>
      ) : null}
      {taskPdf ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Tehtävä</h2>
          <iframe
            title={taskPdf.name}
            src={`/api/media/${taskPdf.id}`}
            className="h-[70vh] w-full rounded-lg border border-line bg-card"
          />
          <a href={`/api/media/${taskPdf.id}?lataa=1`} className="text-pine underline">
            Lataa tehtävä
          </a>
        </section>
      ) : null}
      {images.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Kuvat</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {images.map((item, index) => (
              <li key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${item.id}`}
                  alt={`Tehtävän kuva ${index + 1}`}
                  className="w-full rounded-lg border border-line"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {links.length > 0 ? (
        <section className="grid gap-2">
          <h2 className="text-xl font-semibold">Linkit</h2>
          <ul className="grid gap-2">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pine underline"
                >
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
