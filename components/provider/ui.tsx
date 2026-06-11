// Shared primitives for the ink-dark provider app (Operator's Ledger).
// Mobile-first: everything must work at 380px (hard rule 8).
import type { InputHTMLAttributes, ReactNode } from "react";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-1 font-serif text-2xl text-stone-100">{children}</h1>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mb-6 text-sm text-stone-400">{children}</p>;
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
      className="mb-1.5 block text-sm font-medium text-stone-300"
    >
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-3 text-base text-stone-100 placeholder:text-stone-600 focus:border-amber-400 focus:outline-none ${props.className ?? ""}`}
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
      className="mt-6 w-full rounded-lg bg-amber-400 px-4 py-3 text-base font-semibold text-stone-950 transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-red-400">{children}</p>;
}

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      {children}
    </main>
  );
}
