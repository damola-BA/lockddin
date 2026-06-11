// Absolute URL builder for emailed links and the shareable booking link.
// Vercel injects VERCEL_PROJECT_PRODUCTION_URL automatically, so links work
// even when NEXT_PUBLIC_APP_URL isn't configured.
export function appUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return `${base}${path}`;
}
