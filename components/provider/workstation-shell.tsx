import Link from "next/link";
import {
  Calendar as CalIcon,
  Plus,
  Settings as SettingsIcon,
  Tag,
  User,
  Users,
} from "lucide-react";
import { AccountMenu } from "@/components/provider/account-menu";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary();

export type NavKey =
  | "schedule"
  | "clients"
  | "services"
  | "settings"
  | "profile";

type NavItem = { key: NavKey; href: string; label: string; Icon: typeof CalIcon };

// Top bar (desktop) — the daily working sections only. Settings (which now holds
// the availability/hours editor), Profile and sign out live in the account menu.
const TOP_NAV: NavItem[] = [
  { key: "schedule", href: "/dashboard", label: t.dashboard.navSchedule, Icon: CalIcon },
  { key: "clients", href: "/dashboard/clients", label: t.dashboard.clients, Icon: Users },
  { key: "services", href: "/dashboard/services", label: t.dashboard.services, Icon: Tag },
];

// Settings = the availability/hours surface (still served at /dashboard/availability).
export const SETTINGS_HREF = "/dashboard/availability";

// Bottom tab bar (phone, no account menu) — working sections + Settings + Profile.
const BOTTOM_NAV: NavItem[] = [
  ...TOP_NAV,
  { key: "settings", href: SETTINGS_HREF, label: t.settings.settingsTitle, Icon: SettingsIcon },
  { key: "profile", href: "/dashboard/profile", label: t.settings.navProfile, Icon: User },
];

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
  action,
  children,
}: {
  active: NavKey;
  businessName: string;
  maxWidth?: string;
  bleed?: boolean;
  action?: { href: string; label: string };
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
              {TOP_NAV.map(({ key, href, label, Icon }) => {
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
            {action && (
              <Link
                href={action.href}
                title={action.label}
                aria-label={action.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-[0_5px_13px_-5px_rgba(184,66,28,.7)] transition hover:brightness-105"
              >
                <Plus size={19} strokeWidth={2.5} />
              </Link>
            )}
            <AccountMenu businessName={businessName} />
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
        {BOTTOM_NAV.map(({ key, href, label, Icon }) => {
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
