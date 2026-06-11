import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Manage tokens (DATA_MODEL): signed, single-use-per-action, 7-day expiry.
// Format: <expiresEpochSec>.<nonce>.<hmac>. The whole string is stored in
// bookings.manage_token (the lookup key), so rotating the column
// invalidates every previously issued link (single-use-per-action), while
// the embedded expiry enforces the 7 days regardless of DB state (DD19).

const SEVEN_DAYS_S = 7 * 24 * 3600;

function secret(): string {
  return (
    process.env.MANAGE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function makeManageToken(): string {
  const expires = Math.floor(Date.now() / 1000) + SEVEN_DAYS_S;
  const nonce = randomBytes(9).toString("base64url");
  const payload = `${expires}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck = "valid" | "expired" | "invalid";

export function checkManageToken(token: string): TokenCheck {
  const parts = token.split(".");
  if (parts.length !== 3) return "invalid";
  const [expiresStr, nonce, mac] = parts;
  const expected = sign(`${expiresStr}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "invalid";
  if (Number(expiresStr) * 1000 < Date.now()) return "expired";
  return "valid";
}
