import { getProviderContext, searchClients, getClientDetail } from "@/lib/dashboard/queries";

// CSV export of client records (F10). Runs as the signed-in provider.
export async function GET() {
  const provider = await getProviderContext();
  if (!provider) return new Response("Unauthorized", { status: 401 });

  const clients = await searchClients(provider, "");
  const details = await Promise.all(
    clients.map((c) => getClientDetail(provider, c.id)),
  );

  const esc = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ["Name", "Phone", "Email", "Bookings", "Total booked (€)", "No-shows"];
  const rows = details
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) =>
      [
        esc(d.firstName),
        esc(d.phone),
        esc(d.email),
        d.bookingCount,
        (d.totalValueCents / 100).toFixed(2),
        d.noShowCount,
      ].join(","),
    );
  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lockddin-clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
