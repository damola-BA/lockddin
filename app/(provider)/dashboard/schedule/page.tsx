import { redirect } from "next/navigation";

// "Your week" is now part of the unified Availability screen (DD40).
export default function SchedulePage() {
  redirect("/dashboard/availability");
}
