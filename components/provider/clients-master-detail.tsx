import { ChevronLeft, Search } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { WorkstationShell } from "@/components/provider/workstation-shell";
import type { ClientListRow } from "@/lib/dashboard/queries";

const t = getDictionary();

// Rotating avatar tints so the list scans fast without photos (handoff rule 4).
const TINTS = [
  { bg: "#fbeae1", fg: "#b8421c" },
  { bg: "#e7eef6", fg: "#3a6ea5" },
  { bg: "#e7efe7", fg: "#3f7a52" },
  { bg: "#f7eede", fg: "#b08400" },
  { bg: "#efe6f3", fg: "#7a5a9c" },
];

function tintFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({
  id,
  name,
  size = 38,
}: {
  id: string;
  name: string;
  size?: number;
}) {
  const tint = tintFor(id);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-serif font-semibold"
      style={{
        width: size,
        height: size,
        background: tint.bg,
        color: tint.fg,
        fontSize: size * 0.37,
      }}
    >
      {initials(name)}
    </span>
  );
}

// Master-detail shell for Clients. Phone is drill-in (list page shows the list,
// detail page shows the client); desktop fuses them into a 288px list + detail
// card with the selected row highlighted. Both routes render this; the list page
// passes selectedId=null (empty detail), the detail page passes the open client.
export function ClientsMasterDetail({
  clients,
  q,
  selectedId,
  exportHref,
  businessName,
  children,
}: {
  clients: ClientListRow[];
  q: string;
  selectedId: string | null;
  exportHref: string;
  businessName: string;
  children: React.ReactNode;
}) {
  return (
    <WorkstationShell active="clients" businessName={businessName} bleed>
      <div className="md:mx-auto md:max-w-[900px] md:overflow-hidden md:rounded-2xl md:border md:border-line md:bg-surface md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        {/* List pane */}
        <div
          className={`flex-col gap-2.5 md:flex md:border-r md:border-line md:p-[18px] ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Phone-only header */}
          <div className="mb-1 flex items-center justify-between md:hidden">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-3"
            >
              <ChevronLeft size={15} strokeWidth={2.2} /> Dashboard
            </a>
            <a href={exportHref} className="text-[13px] font-semibold text-accent">
              {t.dashboard.exportCsv}
            </a>
          </div>
          <h1 className="mb-1 font-serif text-2xl md:hidden">{t.dashboard.clientsTitle}</h1>

          {/* Desktop-only export */}
          <div className="mb-1 hidden items-center justify-end md:flex">
            <a href={exportHref} className="text-[12.5px] font-semibold text-accent">
              {t.dashboard.exportCsv}
            </a>
          </div>

          <form method="get" action="/dashboard/clients">
            <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-accent">
              <Search size={16} strokeWidth={2} className="shrink-0 text-faint" />
              <input
                name="q"
                defaultValue={q}
                placeholder={t.dashboard.clientsSearch}
                className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
              />
            </label>
          </form>

          {clients.length === 0 ? (
            <p className="mt-2 text-sm text-ink-3">{t.dashboard.clientsEmpty}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {clients.map((c) => {
                const on = c.id === selectedId;
                return (
                  <a
                    key={c.id}
                    href={`/dashboard/clients/${c.id}${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                      on
                        ? "border-[1.5px] border-accent bg-accent-l"
                        : "border border-line bg-surface"
                    }`}
                  >
                    <Avatar id={c.id} name={c.firstName} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[14.5px] font-semibold text-ink">
                        {c.firstName}
                      </span>
                      <span className={`block truncate text-[11.5px] ${on ? "text-accent-d" : "text-ink-3"}`}>
                        <span className="tabular">{c.bookingCount}</span> {t.dashboard.visits}
                        {c.noShowCount > 0 && (
                          <span className="text-accent"> · {c.noShowCount} {t.dashboard.noShows}</span>
                        )}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className={`min-w-0 md:p-7 ${selectedId ? "block" : "hidden md:block"}`}>
          {children}
        </div>
      </div>
    </WorkstationShell>
  );
}
