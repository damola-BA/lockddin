import type { ReactNode } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="min-h-dvh bg-stone-950 text-stone-100">{children}</div>;
}
