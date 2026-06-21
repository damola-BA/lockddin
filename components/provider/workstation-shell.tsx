import Link from "next/link";
import {
  Calendar as CalIcon,
  Clock,
  Settings as SettingsIcon,
  Tag,
  Users,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

export type NavKey =
  | "schedule"
  | "clients"
  | "services"
  | "availability"
  | "settings";

const NAV: { key: NavKey; href: string; label: string; Icon: typeof CalIcon }[] =
  [
    { key: "schedule", href: "/dashboard", label: t.dashboard.navSchedule, Icon: CalIcon },
    { key: "clients", href: "/dashboard/clients", label: t.dashboard.clients, Icon: Users },
    { key: "services", href: "/dashboard/services", label: t.dashboard.services, Icon: Tag },
    { key: "availability", href: "/dashboard/availability", label: t.dashboard.navAvailability, Icon: Clock },
    { key: "settings", href: "/dashboard/settings", label: t.dashboard.navSettings, Icon: SettingsIcon },
  ];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Shared shell for the provider back-office pages (Clients, Services, Settings…).
// Phone: full-bleed column + a fixed bottom tab bar (native-app feel). Tablet/
// desktop: an edge-to-edge top bar (wordmark · section nav · account) over the
// page content. `maxWidth` caps the working measure so forms don't sprawl on a
// wide monitor; pass `bleed` for master-detail screens that fill the canvas.
export function WorkstationShell({
  active,
  businessName,
  maxWidth = "640px",
  bleed = false,
  children,
}: {
  active: NavKey;
  businessName: string;
  maxWidth?: string;
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      {/* Top bar — tablet & desktop. Background spans edge to edge. */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-surface/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-6 px-9">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
              Lock<span className="font-serif font-medium italic text-accent">d</span>Din
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map(({ key, href, label, Icon }) => {
                const on = key === active;
                return (
                  <Link
                    key={key}
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-bold ${
                      on
                        ? "bg-accent-l text-accent"
                        : "text-ink-3 hover:bg-surface-2 hover:text-ink-2"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.9} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <form action={signOut} className="hidden lg:block">
              <button type="submit" className="text-[13px] text-ink-3 underline">
                {t.auth.signOut}
              </button>
            </form>
            <ThemeToggle />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-l font-serif text-[12px] font-semibold text-accent">
              {initials(businessName)}
            </span>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full px-5 pb-24 pt-7 md:px-9 md:pb-12 md:pt-9 ${
          bleed ? "max-w-[1180px]" : ""
        }`}
        style={bleed ? undefined : { maxWidth: `calc(${maxWidth} + 4.5rem)` }}
      >
        <div className={bleed ? "" : "mx-auto w-full"} style={bleed ? undefined : { maxWidth }}>
          {children}
        </div>
      </main>

      {/* Bottom tab bar — phone only. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ key, href, label, Icon }) => {
          const on = key === active;
          return (
            <a
              key={key}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
                on ? "text-accent" : "text-ink-4"
              }`}
            >
              <Icon size={21} strokeWidth={1.9} />
              {label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
