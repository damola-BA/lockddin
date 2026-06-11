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
  const serviceId = request.nextUrl.searchParams.get("service");
  const date = request.nextUrl.searchParams.get("date");
  if (!serviceId) {
    return NextResponse.json({ error: "service required" }, { status: 400 });
  }

  const provider = await getProviderBySlug(slug);
  if (!provider || !provider.is_active) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (date) {
    const slots = await getSlotsForDay(provider, serviceId, date);
    return NextResponse.json({ slots });
  }

  const [slots, bookableDays] = await Promise.all([
    getEarliestSlots(provider, serviceId),
    getBookableDays(provider),
  ]);
  return NextResponse.json({ slots, bookableDays });
}
