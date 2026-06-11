import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — server routes only, never imported
// into client components. Anonymous booking-page traffic goes through
// server routes using this client (see docs/DATA_MODEL.md).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
