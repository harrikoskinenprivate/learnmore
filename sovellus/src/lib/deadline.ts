const ZONE = "Europe/Helsinki";

const LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type ClockParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function clockParts(value: Date): ClockParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) {
    hour = 0;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function parseDeadlineInput(value: string): Date | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!LOCAL_PATTERN.test(trimmed)) {
    return "invalid";
  }

  const asUtc = new Date(`${trimmed}:00Z`);
  if (Number.isNaN(asUtc.getTime())) {
    return "invalid";
  }

  const shown = clockParts(asUtc);
  const shownUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
    shown.second,
  );
  const result = new Date(asUtc.getTime() - (shownUtc - asUtc.getTime()));
  if (Number.isNaN(result.getTime())) {
    return "invalid";
  }
  return result;
}

export function deadlineInputValue(value: Date | null): string {
  if (!value) {
    return "";
  }
  const parts = clockParts(value);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${parts.year}-${month}-${day}T${hour}:${minute}`;
}

export function formatDeadline(value: Date): string {
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ZONE,
  }).format(value);
}

export function isLate(deadline: Date | null, returnedAt: Date | null, now: Date): boolean {
  if (!deadline) {
    return false;
  }
  return (returnedAt ?? now).getTime() > deadline.getTime();
}
