import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { helloWorld } from "@/lib/inngest/functions/hello-world";
import { holdExpiry } from "@/lib/inngest/functions/hold-expiry";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [helloWorld, holdExpiry],
});
