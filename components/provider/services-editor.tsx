"use client";

import { useActionState, useState } from "react";
import {
  addService,
  updateService,
  deleteService,
  type ActionState,
} from "@/lib/onboarding/actions";
import { getDictionary } from "@/lib/i18n";
import { Label, TextInput, ErrorText } from "@/components/provider/ui";

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

// The add/edit/delete list, with no surrounding chrome. Onboarding wraps it in
// the step layout (with a Continue button); the dashboard Settings flow wraps
// it in the management layout. Both share one implementation.
export function ServicesEditor({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(
    services.length === 0 ? "new" : null,
  );

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
            className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-4"
          >
            <div>
              <p className="font-medium text-ink">{service.name}</p>
              <p className="text-sm text-ink-3">
                {service.duration_minutes} min · {euros(service.price_cents)}
                {service.buffer_minutes !== null && ` · +${service.buffer_minutes} min buffer`}
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
