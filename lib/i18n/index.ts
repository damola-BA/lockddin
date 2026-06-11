import { en } from "./en";

// Beta: EN only. The provider's stored language will pick the dictionary
// here once FR/NL exist; every UI string must come through t() from day one.
const dictionaries = { en } as const;

export type Dictionary = typeof en;

export function getDictionary(language: string = "en"): Dictionary {
  return dictionaries[language as keyof typeof dictionaries] ?? en;
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
