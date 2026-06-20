// Shared primitives for the LockdDin app, mobile-first (must work at 380px,
// hard rule 8). One warm design system, light + dark via semantic tokens.
import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-1 font-serif text-2xl text-ink">{children}</h1>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mb-6 text-sm text-ink-3">{children}</p>;
}

export function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-ink-2"
    >
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-red-600">{children}</p>;
}

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      {children}
    </main>
  );
}

// ── New shared primitives (UI/UX refresh) ───────────────────────────────────

export type SpineStep = { key: string; label: string };

// Service → Time → Details progress spine. `current` is the active step key;
// steps before it read as completed (green check), the active one in accent.
export function StepSpine({
  steps,
  current,
}: {
  steps: SpineStep[];
  current: string;
}) {
  const activeIndex = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-bold ${
                done ? "text-ok" : active ? "text-accent" : "text-faint"
              }`}
            >
              {done && <Check size={13} strokeWidth={3} />}
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={`h-0.5 flex-1 rounded-full ${
                  done ? "bg-ok/40" : "bg-line"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Pill chip. `tone` picks the resting colour; `selected` fills it.
export function Chip({
  children,
  tone = "neutral",
  selected = false,
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "ok";
  selected?: boolean;
  className?: string;
}) {
  const base =
    tone === "ok"
      ? "bg-ok-l text-ok"
      : tone === "accent"
        ? "bg-accent-l text-accent-d"
        : "border border-line bg-surface text-ink-2";
  const sel = selected ? "border-accent bg-accent text-white" : base;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sel} ${className}`}
    >
      {children}
    </span>
  );
}

// Text input with a leading icon and the accent focus halo. Pass a lucide icon.
export function IconField({
  icon,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  label?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">
          {label}
        </span>
      )}
      <span className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-ink focus-within:border-accent focus-within:[box-shadow:0_0_0_3px_var(--accent-l)]">
        <span className="shrink-0 text-faint">{icon}</span>
        <input
          {...props}
          className={`w-full bg-transparent text-base text-ink placeholder:text-ink-4 focus:outline-none ${props.className ?? ""}`}
        />
      </span>
    </label>
  );
}

// Segmented control (Day / Week / Month, etc.). Presentational — the caller
// renders each segment as a link or button via `renderItem`.
export function SegmentedControl<T extends string>({
  options,
  value,
  renderItem,
}: {
  options: { value: T; label: string }[];
  value: T;
  renderItem: (opt: { value: T; label: string }, active: boolean) => ReactNode;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface-2 p-1">
      {options.map((opt) => renderItem(opt, opt.value === value))}
    </div>
  );
}
