// Shared shell for the provider sub-pages (settings, services, schedule, days,
// clients, booking detail). Matches the dashboard: a contained cream panel
// floating on the taupe "desk" on desktop, full-bleed on phone. The dashboard
// home renders its own wider two-column shell and does not use this.
export function PanelPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink md:flex md:justify-center md:bg-desk md:px-6 md:py-8">
      <div className="w-full md:max-w-2xl md:self-start md:rounded-[28px] md:bg-canvas md:shadow-[var(--shadow-panel)]">
        <main className="no-frame mx-auto w-full max-w-md px-5 py-8 md:max-w-none md:px-9 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
