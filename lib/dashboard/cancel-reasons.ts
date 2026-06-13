// Fixed provider cancellation reasons (F7). Kept in a plain module — NOT in
// the "use server" actions file, where every export must be an async server
// action (a non-function export there corrupts the whole action module).
export const CANCEL_REASONS: Record<string, string> = {
  unwell: "I'm unwell",
  emergency: "Personal emergency",
  conflict: "Scheduling conflict",
  equipment: "Equipment or supply issue",
  closed: "Business closed that day",
  other: "Other",
};
