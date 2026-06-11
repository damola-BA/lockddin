import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { isValidSlug, normalizeSlug } from "@/lib/onboarding/slug";

// Real-time slug availability (F2): polled as the provider types.
export async function GET(request: NextRequest) {
  const slug = normalizeSlug(request.nextUrl.searchParams.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    return NextResponse.json({ slug, valid: false, available: false });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("providers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return NextResponse.json({ slug, valid: true, available: !data });
}
