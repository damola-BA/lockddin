import { createAdminClient } from "@/lib/db/admin";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-stone-950 px-5 py-10 text-stone-100">
      {verified ? (
        <>
          <h1 className="mb-2 font-serif text-2xl">{t.auth.verifyDone}</h1>
          <p className="text-sm text-stone-400">
            You can close this tab, or{" "}
            <a href="/" className="text-amber-400 underline">
              continue your setup
            </a>
            .
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-2 font-serif text-2xl">Hmm, that link is stale</h1>
          <p className="text-sm text-stone-400">
            <a href="/" className="text-amber-400 underline">
              Continue your setup
            </a>{" "}
            — you can request a fresh link from the final step.
          </p>
        </>
      )}
    </main>
  );
}
