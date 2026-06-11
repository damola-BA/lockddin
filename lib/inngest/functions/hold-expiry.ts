import { inngest } from "../client";
import { createAdminClient } from "@/lib/db/admin";

// Scheduled at hold creation (F4): sleep until expiry, then flip the hold
// to expired if it is still active. The engine and the claim function both
// already treat past-expiry holds as free, so this is bookkeeping — but it
// keeps the table truthful.
export const holdExpiry = inngest.createFunction(
  { id: "hold-expiry", triggers: [{ event: "booking/hold.created" }] },
  async ({ event, step }) => {
    await step.sleepUntil("until-expiry", event.data.expiresAt as string);

    const expired = await step.run("expire-if-active", async () => {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("expire_hold", {
        p_hold_id: event.data.holdId as string,
      });
      if (error) throw new Error(`expire_hold failed: ${error.message}`);
      return Boolean(data);
    });

    return { holdId: event.data.holdId, expired };
  },
);
