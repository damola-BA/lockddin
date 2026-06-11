"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { sendEmail } from "@/lib/notifications";

const SIGNUP_EMAIL_COOKIE = "ld_signup_email";

export type ActionState = { error?: string; ok?: boolean };

function appUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${path}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// F1 step 1: capture the email on its own screen so an abandoned signup
// still leaves a contact (DD08).
export async function submitEmail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "invalid_email" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("signup_leads")
    .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return { error: "server" };

  const cookieStore = await cookies();
  cookieStore.set(SIGNUP_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  redirect("/onboarding/password");
}

// F1 step 2: create the account. Auto-confirm is ON (DD09); our own
// verification email goes out after the profile step creates the row.
export async function submitPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const cookieStore = await cookies();
  const email = cookieStore.get(SIGNUP_EMAIL_COOKIE)?.value;
  if (!email) redirect("/onboarding/email");

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "too_short" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { error: "email_taken" };
    }
    return { error: "server" };
  }

  const admin = createAdminClient();
  await admin
    .from("signup_leads")
    .update({ converted_at: new Date().toISOString() })
    .eq("email", email);

  cookieStore.delete(SIGNUP_EMAIL_COOKIE);
  redirect("/onboarding/profile");
}

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "bad_credentials" };
  redirect("/"); // middleware routes to the resume point
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/signin");
}

// Password reset (F1): single-use link, 30-minute expiry (Supabase OTP
// expiry, set in dashboard), sent through the notifications gateway.
export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "invalid_email" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  // Always report success — never reveal whether an account exists.
  if (!error && data.properties?.hashed_token) {
    const resetUrl = appUrl(
      `/reset/confirm?token_hash=${data.properties.hashed_token}`,
    );
    try {
      await sendEmail({
        to: email,
        templateKey: "auth.reset_password",
        payload: { resetUrl },
      });
    } catch {
      // Logged in notification_log as failed; user copy stays neutral.
    }
  }
  return { ok: true };
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "too_short" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "server" };
  redirect("/"); // middleware routes to resume point / dashboard
}

// Our own email verification (DD09).
export async function sendVerificationEmail(providerId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: provider } = await admin
    .from("providers")
    .select("email, email_verify_token, email_verified_at")
    .eq("id", providerId)
    .single();
  if (!provider || provider.email_verified_at) return;

  await sendEmail({
    to: provider.email,
    providerId,
    templateKey: "auth.verify_email",
    payload: {
      verifyUrl: appUrl(`/verify?token=${provider.email_verify_token}`),
    },
  });
}

export async function resendVerification(): Promise<ActionState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "server" };
  try {
    await sendVerificationEmail(user.id);
  } catch {
    return { error: "server" };
  }
  return { ok: true };
}
