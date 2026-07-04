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
