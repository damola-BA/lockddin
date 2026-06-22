import { redirect } from "next/navigation";

// Settings was merged into Availability ("how your hours work" now lives there).
// Keep this route as a redirect so old links/bookmarks still land somewhere sane.
export default function SettingsPage() {
  redirect("/dashboard/availability");
}
