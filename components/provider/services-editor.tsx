"use client";

import { useActionState, useState } from "react";
import {
  addService,
  updateService,
  deleteService,
  type ActionState,
} from "@/lib/onboarding/actions";
import { Pencil, Plus } from "lucide-react";
import { getDictionary, formatDuration, fill } from "@/lib/i18n";
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
// placeholder) cover with a Bookable/Hidden badge (hidden cards dimmed), then
// name · duration · price, an optional prep note, and an Edit pill.
function ServiceCard({
  service,
  onEdit,
}: {
  service: Service;
  onEdit: () => void;
}) {
  const cover = service.photos[0];
  return (
    <div
      className={`overflow-hidden rounded-[18px] border border-line bg-surface transition ${
        service.is_active ? "" : "opacity-60"
      }`}
    >
      <div
        className="relative h-[122px] bg-surface-2"
        style={cover ? undefined : { backgroundImage: HATCH }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storageUrl(cover)} alt="" className="h-full w-full object-cover" />
        )}
        <span
          className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-[4px] text-[10px] font-bold text-white backdrop-blur ${
            service.is_active ? "bg-ok/90" : "bg-ink-4/85"
          }`}
        >
          {service.is_active ? t.settings.bookable : t.settings.hidden}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2.5 px-4 pb-[15px] pt-3.5">
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold text-ink">{service.name}</p>
          <p className="mt-1 text-[12.5px] font-semibold tabular text-ink-3">
            {formatDuration(service.duration_minutes)} · {euros(service.price_cents)}
            {service.buffer_minutes !== null && ` · +${service.buffer_minutes} min gap`}
          </p>
          {service.prep_instructions && (
            <p className="mt-1.5 line-clamp-2 text-[11.5px] text-faint">{service.prep_instructions}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-line bg-surface-2 px-3 py-2 text-[12px] font-bold text-ink-2 hover:bg-surface"
        >
          <Pencil size={12} strokeWidth={2} /> {t.common.edit}
        </button>
      </div>
    </div>
  );
}

// Slide-in editor — a bottom sheet on phone, a right-hand drawer on desktop.
// Wraps the same server actions as the inline form, plus a Bookable toggle and
// an arm→confirm Delete.
function ServiceSheet({
  service,
  onClose,
}: {
  service?: Service;
  onClose: () => void;
}) {
  const isEditing = !!service;
  const action = service ? updateService : addService;
  const [active, setActive] = useState(service?.is_active ?? true);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) onClose();
      return result;
    },
    {},
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        onClick={onClose}
        aria-label={t.common.cancel}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative z-10 mt-auto flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-[24px] bg-canvas shadow-[0_-18px_50px_-20px_rgba(34,29,25,.5)] md:mt-0 md:ml-auto md:h-dvh md:max-h-none md:w-[430px] md:rounded-l-[24px] md:rounded-tr-none">
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-desk md:hidden" />
        <div className="p-5">
          <h2 className="font-serif text-[21px] font-semibold text-ink">
            {isEditing ? t.settings.editService : t.settings.newService}
          </h2>

          <form action={formAction} className="mt-4 space-y-3.5">
            {service && <input type="hidden" name="service_id" value={service.id} />}
            <input type="hidden" name="is_active" value={String(active)} />

            <div>
              <Label htmlFor="name">{t.onboarding.serviceName}</Label>
              <TextInput id="name" name="name" defaultValue={service?.name} required autoFocus placeholder="e.g. Cut & Blow Dry" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration_minutes">{t.onboarding.duration}</Label>
                <TextInput id="duration_minutes" name="duration_minutes" type="number" min={5} step={5} defaultValue={service?.duration_minutes ?? 60} required />
              </div>
              <div>
                <Label htmlFor="price">{t.onboarding.price}</Label>
                <div className="flex items-center rounded-lg border border-line bg-surface px-3.5 focus-within:border-accent">
                  <span className="shrink-0 font-serif text-[15px] text-ink-3">€</span>
                  <input
                    id="price"
                    name="price"
                    inputMode="decimal"
                    defaultValue={service ? (service.price_cents / 100).toFixed(2) : ""}
                    required
                    placeholder="0,00"
                    className="w-full bg-transparent py-3 pl-1.5 text-base font-semibold text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{t.settings.gapAfter}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-4">{t.settings.gapAfterHint}</p>
              </div>
              <input
                id="buffer_minutes"
                name="buffer_minutes"
                type="number"
                min={0}
                step={5}
                defaultValue={service?.buffer_minutes ?? ""}
                placeholder="—"
                className="w-20 shrink-0 rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <Label htmlFor="prep_instructions">{t.onboarding.prepInstructions}</Label>
              <textarea
                id="prep_instructions"
                name="prep_instructions"
                defaultValue={service?.prep_instructions ?? ""}
                rows={2}
                placeholder="e.g. Come with clean, dry hair."
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{active ? t.settings.bookable : t.settings.hidden}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-4">{active ? t.settings.bookableHint : t.settings.hiddenHint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((a) => !a)}
                className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${active ? "bg-accent" : "bg-desk"}`}
              >
                <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all ${active ? "left-[21px]" : "left-[3px]"}`} />
              </button>
            </div>

            {service && (
              <div className="rounded-2xl border border-line bg-surface px-4 pb-3 pt-1">
                <ServicePhotoGrid serviceId={service.id} photos={service.photos} />
              </div>
            )}

            {state.error && <ErrorText>{t.common.somethingWrong}</ErrorText>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-ctrl px-4 py-3.5 text-[14.5px] font-bold text-ctrl-ink disabled:opacity-50"
            >
              {pending ? t.common.loading : isEditing ? t.settings.saveChanges : t.onboarding.addService}
            </button>
          </form>

          {service && <ServiceDeleteConfirm service={service} />}
        </div>
      </div>
    </div>
  );
}

// Arm→confirm delete with consequence copy (handoff pattern), reusing the
// server action's last-active and has-bookings guards.
function ServiceDeleteConfirm({ service }: { service: Service }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteService, {});
  const blocking = state.error?.startsWith("has_bookings:")
    ? state.error.slice("has_bookings:".length).split(",")
    : null;

  if (!confirming) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2.5 w-full py-2.5 text-[13px] font-semibold text-no"
        >
          {t.settings.deleteService}
        </button>
        {state.error === "last_active" && <ErrorText>{t.onboarding.lastActiveService}</ErrorText>}
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
      </>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-no bg-no-l p-3.5">
      <p className="mb-3 text-[13px] font-semibold text-ink">
        {fill(t.settings.deleteServiceConfirm, { name: service.name })}
      </p>
      <form action={formAction} className="flex gap-2.5">
        <input type="hidden" name="service_id" value={service.id} />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-xl border border-line bg-surface py-2.5 text-[12.5px] font-semibold text-ink-2"
        >
          {t.settings.keepIt}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-no py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
        >
          {t.common.delete}
        </button>
      </form>
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
    const editingService =
      editing && editing !== "new" ? services.find((s) => s.id === editing) : undefined;
    return (
      <>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => setEditing(service.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex min-h-[150px] flex-col items-center justify-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-desk text-[13.5px] font-bold text-accent transition hover:border-accent hover:bg-surface-2"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-l">
              <Plus size={19} strokeWidth={2.4} />
            </span>
            {t.onboarding.addService}
          </button>
        </div>

        {editing === "new" && <ServiceSheet onClose={() => setEditing(null)} />}
        {editingService && (
          <ServiceSheet service={editingService} onClose={() => setEditing(null)} />
        )}
      </>
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
