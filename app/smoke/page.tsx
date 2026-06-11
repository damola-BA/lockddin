import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/db/admin";

// Milestone 0 acceptance page: proves the deployed app can read and write
// one row in Supabase. Writes go to notification_log under template_key
// "m0.smoke" with status "suppressed" (nothing is ever sent). See DD07.

export const dynamic = "force-dynamic";

async function runCheck() {
  "use server";
  const supabase = createAdminClient();
  const { error } = await supabase.from("notification_log").insert({
    recipient_email: "smoke@lockddin.internal",
    template_key: "m0.smoke",
    payload: { ranAt: new Date().toISOString() },
    status: "suppressed",
  });
  if (error) throw new Error(`Smoke write failed: ${error.message}`);
  revalidatePath("/smoke");
}

export default async function SmokePage() {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("notification_log")
    .select("id, payload, created_at")
    .eq("template_key", "m0.smoke")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="mx-auto max-w-md p-6 font-mono text-sm">
      <h1 className="mb-4 text-lg font-bold">LockdDin — M0 smoke check</h1>

      <form action={runCheck}>
        <button
          type="submit"
          className="mb-6 rounded border border-current px-4 py-2"
        >
          Write a row
        </button>
      </form>

      {error ? (
        <p className="text-red-600">Read failed: {error.message}</p>
      ) : rows.length === 0 ? (
        <p>No rows yet. Press the button.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded border border-current/30 p-2">
              {row.created_at}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
