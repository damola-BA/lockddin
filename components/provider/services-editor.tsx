"use client";

import { useActionState, useState } from "react";
import {
  addService,
  updateService,
  deleteService,
  type ActionState,
} from "@/lib/onboarding/actions";
import { Plus } from "lucide-react";
import { getDictionary, formatDuration } from "@/lib/i18n";
import { Label, TextInput, ErrorText } from "@/components/provider/ui";
import { ServicePhotoGrid } from "@/components/provider/service-photos";
import { storageUrl } from "@/lib/storage-url";

// Diagonal-hatch placeholder for a service with no photo yet (matches handoff).
const HATCH =
  "repeating-linear-gradient(135deg,rgba(184,66,28,.06) 0 2px,transparent 2px 14px)";

const t = getDictionary();

export type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  buffer_minutes: number | null;
  prep_instructions: string | null;
  is_active: boolean;
  sort_order: number;
  photos: string[];
};

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function ServiceForm({
  service,
  onDone,
}: {
  service?: Service;
  onDone: () => void;
}) {
  const action = service ? updateService : addService;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    {},
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-line bg-surface p-4"
    >
      {service && <input type="hidden" name="service_id" value={service.id} />}
      <div>
        <Label htmlFor="name">{t.onboarding.serviceName}</Label>
        <TextInput id="name" name="name" defaultValue={service?.name} required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="duration_minutes">{t.onboarding.duration}</Label>
          <TextInput
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={5}
            step={5}
            defaultValue={service?.duration_minutes ?? 60}
            required
          />
        </div>
        <div>
          <Label htmlFor="price">{t.onboarding.price}</Label>
          <TextInput
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={service ? (service.price_cents / 100).toFixed(2) : ""}
            required
          />
        </div>
      </div>
      <p className="text-sm text-ink-3">{t.onboarding.priceHint}</p>
      <div>
        <Label htmlFor="buffer_minutes">{t.onboarding.bufferOverride}</Label>
        <TextInput
          id="buffer_minutes"
          name="buffer_minutes"
          type="number"
          min={0}
          step={5}
          defaultValue={service?.buffer_minutes ?? ""}
          placeholder="—"
        />
        <p className="mt-1.5 text-sm text-ink-3">{t.onboarding.bufferOverrideHint}</p>
      </div>
      <div>
        <Label htmlFor="prep_instructions">{t.onboarding.prepInstructions}</Label>
        <textarea
          id="prep_instructions"
          name="prep_instructions"
          defaultValue={service?.prep_instructions ?? ""}
          rows={3}
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
        />
        <p className="mt-1.5 text-sm text-ink-3">{t.onboarding.prepHint}</p>
      </div>
      {state.error && <ErrorText>{t.common.somethingWrong}</ErrorText>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-lg border border-line px-4 py-3 text-base text-ink-2"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? t.common.loading : t.common.save}
        </button>
      </div>
    </form>
  );
}

function DeleteButton({ service }: { service: Service }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteService,
    {},
  );
  const blocking = state.error?.startsWith("has_bookings:")
    ? state.error.slice("has_bookings:".length).split(",")
    : null;

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="service_id" value={service.id} />
        <button
          type="submit"
          disabled={pending}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          {t.common.delete}
        </button>
      </form>
      {state.error === "last_active" && (
        <ErrorText>{t.onboarding.lastActiveService}</ErrorText>
      )}
      {blocking && (
        <div className="mt-2">
          <ErrorText>{t.onboarding.serviceHasBookings}</ErrorText>
          <ul className="mt-1 list-inside list-disc text-sm text-ink-3">
            {blocking.map((startsAt) => (
              <li key={startsAt}>
                {new Date(startsAt).toLocaleString("en-BE", {
                  timeZone: "Europe/Brussels",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Photo-forward display card for the dashboard manage grid: a photo (or hatch
// placeholder) banner with an Active badge, then name · duration · price + Edit.
function ServiceCard({
  service,
  onEdit,
}: {
  service: Service;
  onEdit: () => void;
}) {
  const cover = service.photos[0];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div
        className="relative h-[110px] bg-surface-2"
        style={cover ? undefined : { backgroundImage: HATCH }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storageUrl(cover)} alt="" className="h-full w-full object-cover" />
        )}
        {service.is_active && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-ok/90 px-2 py-[3px] text-[10px] font-bold text-white">
            {t.common.active}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="font-serif text-[15.5px] font-semibold text-ink">{service.name}</p>
          <p className="mt-0.5 text-[12.5px] tabular text-ink-3">
            {formatDuration(service.duration_minutes)} · {euros(service.price_cents)}
            {service.buffer_minutes !== null && ` · +${service.buffer_minutes} min gap`}
          </p>
          {service.prep_instructions && (
            <p className="mt-1.5 text-[12px] text-faint">{service.prep_instructions}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-[12.5px] font-semibold text-accent underline"
        >
          {t.common.edit}
        </button>
      </div>
    </div>
  );
}

// The add/edit/delete list, with no surrounding chrome. Onboarding wraps it in
// the step layout (with a Continue button); the dashboard Services page wraps it
// in the management shell. `layout="grid"` renders photo-forward cards 1-col →
// 2-col; `layout="list"` (default) keeps the compact onboarding stack.
export function ServicesEditor({
  services,
  layout = "list",
}: {
  services: Service[];
  layout?: "list" | "grid";
}) {
  const [editing, setEditing] = useState<string | "new" | null>(
    services.length === 0 ? "new" : null,
  );

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {services.map((service) =>
          editing === service.id ? (
            <div key={service.id} className="md:col-span-2">
              <ServiceForm service={service} onDone={() => setEditing(null)} />
              <div className="mt-3 rounded-lg border border-line bg-surface-2 px-4 pb-3">
                <ServicePhotoGrid serviceId={service.id} photos={service.photos} />
              </div>
              <div className="mt-3">
                <DeleteButton service={service} />
              </div>
            </div>
          ) : (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => setEditing(service.id)}
            />
          ),
        )}

        {editing === "new" ? (
          <div className="md:col-span-2">
            <ServiceForm onDone={() => setEditing(null)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex min-h-[110px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-desk text-sm font-bold text-accent"
          >
            <Plus size={16} strokeWidth={2.2} /> {t.onboarding.addService}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.length === 0 && editing !== "new" && (
        <p className="text-sm text-ink-3">{t.onboarding.noServicesYet}</p>
      )}

      {services.map((service) =>
        editing === service.id ? (
          <ServiceForm
            key={service.id}
            service={service}
            onDone={() => setEditing(null)}
          />
        ) : (
          <div
            key={service.id}
            className="rounded-lg border border-line bg-surface-2 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{service.name}</p>
                <p className="text-sm text-ink-3">
                  {formatDuration(service.duration_minutes)} · {euros(service.price_cents)}
                  {service.buffer_minutes !== null && ` · +${service.buffer_minutes} min gap`}
                </p>
                {service.prep_instructions && (
                  <p className="mt-1 text-sm text-ink-3">{service.prep_instructions}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(service.id)}
                  className="text-sm text-accent underline"
                >
                  {t.common.edit}
                </button>
                <DeleteButton service={service} />
              </div>
            </div>
            <ServicePhotoGrid
              serviceId={service.id}
              photos={service.photos}
            />
          </div>
        ),
      )}

      {editing === "new" ? (
        <ServiceForm onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-full rounded-lg border border-dashed border-line px-4 py-3 text-base text-ink-2"
        >
          + {t.onboarding.addService}
        </button>
      )}
    </div>
  );
}
