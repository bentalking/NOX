export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
}

export function formatLongDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Guten Tag";
  if (h < 22) return "Guten Abend";
  return "Gute Nacht";
}

export function msUntilMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function pruneDateKeys(
  keys: string[],
  keepDays = 45,
  now = new Date(),
): Set<string> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = todayKey(cutoff);
  return new Set(keys.filter((k) => k >= cutoffKey));
}

export const WEEKDAYS = [
  { id: 1, short: "Mo", label: "Montag" },
  { id: 2, short: "Di", label: "Dienstag" },
  { id: 3, short: "Mi", label: "Mittwoch" },
  { id: 4, short: "Do", label: "Donnerstag" },
  { id: 5, short: "Fr", label: "Freitag" },
  { id: 6, short: "Sa", label: "Samstag" },
  { id: 0, short: "So", label: "Sonntag" },
] as const;
