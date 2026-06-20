import { redirect } from "next/navigation";

// "Days off & exceptions" is now part of the unified Availability screen (DD40).
export default function DaysPage() {
  redirect("/dashboard/availability");
}
