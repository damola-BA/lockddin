// Tiny display formatters shared across client + provider surfaces.
// Keep these pure and dependency-free — they run on server and client alike.

/** Cents → "€12,50" (Belgian comma decimals). */
export function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** "Dami's Cuts" → "DC" (up to two initials; fallback when empty). */
export function initials(name: string, fallback = "?"): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || fallback
  );
}
