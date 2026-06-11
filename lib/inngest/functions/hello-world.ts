import { inngest } from "../client";

// Milestone 0 acceptance: one Inngest job fires on schedule.
// Replaced by real jobs (hold expiry, reminders) from M2 onward.
export const helloWorld = inngest.createFunction(
  { id: "hello-world", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }) => {
    const firedAt = await step.run("record-time", async () => {
      return new Date().toISOString();
    });
    return { message: "LockdDin skeleton is alive", firedAt };
  },
);
