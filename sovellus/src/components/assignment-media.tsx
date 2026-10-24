import type { AssignmentMediaItem } from "@/lib/types";

export function AssignmentMediaView({ media }: { media: AssignmentMediaItem[] }) {
  const videos = media.filter((item) => item.kind === "video");
  const images = media.filter((item) => item.kind === "image");
  if (videos.length === 0 && images.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-semibold">Kuvat ja ohjevideo</h2>
      {videos.map((item) => (
        <video
          key={item.id}
          controls
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-black object-contain"
          src={`/api/media/${item.id}`}
        />
      ))}
      {images.length > 0 ? (
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
      ) : null}
    </section>
  );
}
