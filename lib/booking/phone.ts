// Phone is THE stable client identifier (hard rule 7), so normalisation
// must be deterministic. Belgian-first (DD18): national 0X… numbers get
// +32; anything already international is kept as-is.
export function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s.\-()\/]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (/^0\d{8,9}$/.test(p)) p = `+32${p.slice(1)}`;
  if (!/^\+\d{8,15}$/.test(p)) return null;
  return p;
}
