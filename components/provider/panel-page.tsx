// Shared shell for the provider sub-pages (settings, services, schedule, days,
// clients, booking detail). Matches the dashboard: a centered max-width column
// on one uniform canvas, full-bleed on phone. The dashboard home renders its
// own wider two-column shell and does not use this.
export function PanelPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink md:flex md:justify-center md:px-6 md:py-8">
      <div className="w-full md:max-w-2xl md:self-start">
        <main className="no-frame mx-auto w-full max-w-md px-5 py-8 md:max-w-none md:px-9 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
