import { en } from "./en";

// Beta: EN only. The provider's stored language will pick the dictionary
// here once FR/NL exist; every UI string must come through t() from day one.
const dictionaries = { en } as const;

export type Dictionary = typeof en;

export function getDictionary(language: string = "en"): Dictionary {
  return dictionaries[language as keyof typeof dictionaries] ?? en;
}

// Human-friendly duration: 45 → "45 min", 60 → "1h", 90 → "1h 30min".
// Used wherever a service (or combined) length is shown.
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// Interpolate {placeholders} in a dictionary string.
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}
