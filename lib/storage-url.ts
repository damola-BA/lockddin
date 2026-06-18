// Returns the public URL for a file in the work-photos bucket.
export function storageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/work-photos/${path}`;
}
