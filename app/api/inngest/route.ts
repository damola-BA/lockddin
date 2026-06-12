import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { helloWorld } from "@/lib/inngest/functions/hello-world";
import { holdExpiry } from "@/lib/inngest/functions/hold-expiry";
import {
  providerNewBookingNotify,
  bookingReminder,
  clientCancelledProviderNotify,
} from "@/lib/inngest/functions/booking-notifications";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    holdExpiry,
    providerNewBookingNotify,
    bookingReminder,
    clientCancelledProviderNotify,
  ],
});
