import Link from "next/link";
import { createAdminClient } from "@/lib/db/admin";
import { AuthShell } from "@/components/provider/auth-shell";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

// Landing page for the emailed verification link (DD09). Marks the email
// verified and rotates the token so the link is single-use.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let verified = false;

  if (token) {
    const admin = createAdminClient();
    const { data: provider } = await admin
      .from("providers")
      .select("id, email_verified_at")
      .eq("email_verify_token", token)
      .maybeSingle();

    if (provider) {
      if (!provider.email_verified_at) {
        await admin
          .from("providers")
          .update({
            email_verified_at: new Date().toISOString(),
            email_verify_token: crypto.randomUUID(),
          })
          .eq("id", provider.id);
      }
      verified = true; // already-verified links also read as success
    }
  }

  return (
    <AuthShell panelTitle={t.auth.panelTitle} panelBody={t.auth.panelBody}>
      {verified ? (
        <>
          <h1 className="mb-2 font-serif text-2xl">{t.auth.verifyDone}</h1>
          <p className="text-sm text-ink-3">
            You can close this tab, or{" "}
            <Link href="/" className="text-accent underline">
              continue your setup
            </Link>
            .
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-2 font-serif text-2xl">Hmm, that link is stale</h1>
          <p className="text-sm text-ink-3">
            <Link href="/" className="text-accent underline">
              Continue your setup
            </Link>{" "}
            — you can request a fresh link from the final step.
          </p>
        </>
      )}
    </AuthShell>
  );
}
