import { getDayAvailability } from "@/lib/scheduling/availability";
import { formatInTimeZone } from "date-fns-tz";

// Server component: lets the provider sanity-check what clients will see
// (M2 acceptance: configure a realistic week, see correct slots).
export async function SlotPreview({
  providerId,
  services,
  date,
  serviceId,
}: {
  providerId: string;
  services: { id: string; name: string }[];
  date: string;
  serviceId: string;
}) {
  const slots = await getDayAvailability({ providerId, serviceId, date });
  const service = services.find((s) => s.id === serviceId);

  return (
    <div className="mt-3 rounded-lg border border-stone-800 bg-stone-900/60 p-4">
      <p className="mb-2 text-sm text-stone-400">
        {service?.name} — {date}
      </p>
      {slots.length === 0 ? (
        <p className="text-sm text-stone-500">No slots on this day.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <span
              key={slot.startsAt.toISOString()}
              className="rounded border border-amber-400/40 px-2.5 py-1 text-sm text-amber-300"
            >
              {formatInTimeZone(slot.startsAt, "Europe/Brussels", "HH:mm")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
