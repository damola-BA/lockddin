// Absolute URL builder for emailed links and the shareable booking link.
//
// A localhost value must never leak into links sent from a deployed build — that
// produces the classic "email link opens a blank/unreachable page" bug. So we
// only honor NEXT_PUBLIC_APP_URL when it's a real (non-localhost) URL; on Vercel
// we fall back to the stable production URL Vercel injects automatically.
export function appUrl(path: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isReal = configured && !/localhost|127\.0\.0\.1/.test(configured);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null;

  const base = isReal ? (configured as string) : (vercel ?? configured ?? "http://localhost:3000");

  return `${base.replace(/\/$/, "")}${path}`;
}

// Preferred for emailed links generated inside a request (booking confirmation,
// reschedule): builds the URL from the domain the visitor is actually on, so the
// link can never point at localhost or a stale/misconfigured env value. Falls
// back to appUrl() outside a request scope (e.g. Inngest background jobs).
export async function appUrlFromRequest(path: string): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host && !/localhost|127\.0\.0\.1/.test(host)) {
      return `${proto}://${host}${path}`;
    }
  } catch {
    /* not in a request scope — fall through to the env-based builder */
  }
  return appUrl(path);
}
