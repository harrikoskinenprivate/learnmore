const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return "Anna nimi.";
  }
  if (trimmed.length > 80) {
    return "Nimi on liian pitkä.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(email)) {
    return "Anna kelvollinen sähköposti.";
  }
  if (email.length > 200) {
    return "Sähköposti on liian pitkä.";
  }
  return null;
}

export const LEARNING_CARD_LEVEL_MAX = 200;
export const LEARNING_CARD_TEXT_MAX = 2000;

export function validateLearningCardLevel(value: string): string | null {
  if (value.length > LEARNING_CARD_LEVEL_MAX) {
    return "Taso on liian pitkä.";
  }
  return null;
}

export function validateLearningCardText(
  value: string,
  label: "Vahvuudet" | "Kehityskohteet" | "Tavoitteet",
): string | null {
  if (value.length > LEARNING_CARD_TEXT_MAX) {
    return `${label} on liian pitkä.`;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Salasanassa on oltava vähintään 8 merkkiä.";
  }
  if (password.length > 200) {
    return "Salasana on liian pitkä.";
  }
  return null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return "Anna otsikko.";
  }
  if (trimmed.length > 120) {
    return "Otsikko on liian pitkä.";
  }
  return null;
}

export function validateInstructions(instructions: string): string | null {
  const trimmed = instructions.trim();
  if (trimmed.length < 1) {
    return "Anna ohje.";
  }
  if (trimmed.length > 4000) {
    return "Ohje on liian pitkä.";
  }
  return null;
}

export function validateLinkTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return "Anna linkille otsikko.";
  }
  if (trimmed.length > 120) {
    return "Linkin otsikko on liian pitkä.";
  }
  return null;
}

export function validateUrl(value: string): string | null {
  if (value.length > 2000) {
    return "Osoite on liian pitkä.";
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Anna kelvollinen osoite, joka alkaa http:// tai https://.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Anna kelvollinen osoite, joka alkaa http:// tai https://.";
  }
  return null;
}

export function validateQuestion(prompt: string): string | null {
  const trimmed = prompt.trim();
  if (trimmed.length < 1) {
    return "Kirjoita kysymys.";
  }
  if (trimmed.length > 1000) {
    return "Kysymys on liian pitkä.";
  }
  return null;
}

export function validateAnswer(body: string): string | null {
  if (body.length > 8000) {
    return "Vastaus on liian pitkä.";
  }
  return null;
}
