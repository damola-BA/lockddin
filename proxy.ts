import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Forced linear onboarding (F1): email → password → profile → services →
// schedule. No skipping, no free navigation; closing mid-onboarding resumes
// at the last incomplete step. Dashboard is inaccessible until complete.

const STEP_ROUTES: Record<string, string> = {
  profile: "/onboarding/profile",
  services: "/onboarding/services",
  schedule: "/onboarding/schedule",
  complete: "/dashboard",
};

// Reachable without a session.
const PUBLIC_PATHS = [
  "/", // public marketing landing (signed-in providers are routed on below)
  "/onboarding/email",
  "/onboarding/password",
  "/signin",
  "/reset",
  "/verify",
  "/smoke",
  "/b", // public booking page (F5)
  "/api/b",
  "/manage", // emailed cancel/reschedule links
  "/privacy",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/onboarding/email", request.url));
  }

  // Signed in: fetch the resume point.
  const { data: provider } = await supabase
    .from("providers")
    .select("onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  const step = provider?.onboarding_step ?? "profile";
  const target = STEP_ROUTES[step] ?? "/onboarding/profile";

  // /verify must work mid-flow (it's the emailed link), /smoke stays open.
  if (pathname.startsWith("/verify") || pathname.startsWith("/smoke")) {
    return response;
  }

  const guarded =
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/signin");

  if (guarded && pathname !== target && !pathname.startsWith(`${target}/`)) {
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the Inngest endpoint.
    "/((?!_next/static|_next/image|favicon.ico|api/inngest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
