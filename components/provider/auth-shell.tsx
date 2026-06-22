import { ThemeToggle } from "@/components/theme-toggle";

// The wordmark, light or dark. The ink brand panel uses the accent-on-dark `d`.
export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`text-[19px] font-extrabold tracking-[-0.02em] lg:text-[20px] ${
        onDark ? "text-white" : "text-ink"
      }`}
    >
      Lock
      <span
        className="font-serif font-medium italic"
        style={{ color: onDark ? "#e0673c" : "var(--accent)" }}
      >
        d
      </span>
      Din
    </span>
  );
}

// The ink-dark brand panel (onboarding + auth share it; DD: the one place app
// dark earns a warm glow). Always dark regardless of theme. Desktop-only.
export function BrandPanel({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="relative hidden overflow-hidden px-9 py-11 lg:flex lg:flex-col"
      style={{ background: "#221d19" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(80% 50% at 100% 0%, rgba(184,66,28,.22) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </aside>
  );
}

// Shared shell for the auth pages (sign in / reset / verify). Full-bleed form on
// phone with the wordmark top-left; on desktop the same form sits beside the ink
// brand panel. The form body is the page's `children`.
export function AuthShell({
  panelTitle,
  panelBody,
  maxWidth = "360px",
  children,
}: {
  panelTitle: string;
  panelBody: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
      <BrandPanel>
        <Wordmark onDark />
        <h2 className="mt-auto font-serif text-[26px] font-medium leading-tight text-white">
          {panelTitle}
        </h2>
        <p className="mt-3.5 max-w-[280px] text-[13.5px] leading-relaxed" style={{ color: "#b8ac9d" }}>
          {panelBody}
        </p>
      </BrandPanel>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 pt-6 lg:hidden">
          <Wordmark />
          <ThemeToggle />
        </header>
        <div className="hidden justify-end px-8 pt-6 lg:flex">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full" style={{ maxWidth }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
