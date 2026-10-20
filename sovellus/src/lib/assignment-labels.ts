export function withFeedback(parentTitle: string | null, meta: string): string {
  if (!parentTitle) {
    return meta;
  }
  return `Palaute tehtävään ${parentTitle} · ${meta}`;
}

export function responseKindLabel(kind: "text" | "image" | "video"): string {
  if (kind === "text") {
    return "Tekstikenttä";
  }
  if (kind === "image") {
    return "Kuva";
  }
  return "Video";
}

export function studentTaskLabel(item: {
  hasDraft: boolean;
  returnedAt: Date | null;
  reviewedAt: Date | null;
  late: boolean;
}): string {
  if (item.returnedAt) {
    if (item.reviewedAt) {
      return item.late ? "Tarkistettu · myöhässä" : "Tarkistettu";
    }
    return item.late ? "Palautettu myöhässä" : "Palautettu";
  }
  if (item.late) {
    return "Myöhässä";
  }
  if (item.hasDraft) {
    return "Luonnos tallennettu";
  }
  return "Aloittamatta";
}

export function teacherWorkLabel(item: {
  returnedAt: Date | null;
  reviewedAt: Date | null;
  late: boolean;
}): string {
  if (item.reviewedAt) {
    return "Tarkistettu";
  }
  if (item.returnedAt) {
    return item.late ? "Palautettu myöhässä" : "Palautettu";
  }
  return item.late ? "Myöhässä" : "Ei palautettu";
}
