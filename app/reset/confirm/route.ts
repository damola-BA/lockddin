import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/db/server";

// Landing point for the emailed reset link. Verifies the single-use
// recovery token (30-min expiry, Supabase OTP setting) and signs the
// user in so /reset/update can set the new password.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (!tokenHash) {
    return NextResponse.redirect(new URL("/reset", request.url));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(new URL("/reset?expired=1", request.url));
  }
  return NextResponse.redirect(new URL("/reset/update", request.url));
}
