import { NextResponse, type NextRequest } from "next/server";
import {
  getProviderBySlug,
  getSlotsForDay,
  getEarliestSlots,
  getBookableDays,
} from "@/lib/booking/slots";

// Public slot feed for the booking page. With ?date → that day's slots;
// without → the earliest 5 plus the calendar's bookable days.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // One or more services in a single visit, comma-separated.
  const serviceIds = (request.nextUrl.searchParams.get("service") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const date = request.nextUrl.searchParams.get("date");
  if (serviceIds.length === 0) {
    return NextResponse.json({ error: "service required" }, { status: 400 });
  }

  const provider = await getProviderBySlug(slug);
  if (!provider || !provider.is_active) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Availability is live data — never let the browser cache it.
  const headers = { "Cache-Control": "no-store" };

  if (date) {
    const slots = await getSlotsForDay(provider, serviceIds, date);
    return NextResponse.json({ slots }, { headers });
  }

  const [slots, bookableDays] = await Promise.all([
    getEarliestSlots(provider, serviceIds),
    getBookableDays(provider),
  ]);
  return NextResponse.json({ slots, bookableDays }, { headers });
}
