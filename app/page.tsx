import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { HeroVisual } from "@/components/landing/hero-visual";
import { Spotlight, Grain } from "@/components/landing/cinematic";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "@/components/landing/landing.module.css";

const SIGNUP = "/onboarding/email";
const LOGIN = "/signin";

// Fixed light-pastel chip colours — these stay light in BOTH themes so the icon
// tiles pop against the cinematic dark; only the page chrome flips.
const TINT: Record<string, string> = {
  blush: "#f8e7df",
  cream: "#f7eede",
  sky: "#e7eef6",
  lilac: "#efe8f4",
  sage: "#e7efe7",
  accentL: "#fbeae1",
};

// Glass cards: solid warm surface in light, translucent glass in dark.
const CARD =
  "border border-line bg-surface dark:border-white/10 dark:bg-white/5";

function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[21px] font-extrabold tracking-tight ${className}`}>
      Lock<span className="font-serif font-medium italic text-accent">d</span>Din
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-accent before:h-[7px] before:w-[7px] before:rounded-full before:bg-accent before:content-['']">
      {children}
    </span>
  );
}

// Accent word: solid terracotta italic in light, kinetic shimmer in dark.
function Shimmer({ children }: { children: React.ReactNode }) {
  return (
    <span className={`font-serif font-medium italic text-accent ${styles.shimmer}`}>
      {children}
    </span>
  );
}

// Drifting aurora blobs. Dark-only unless `always` (for the always-dark CTA).
function Aurora({ always = false }: { always?: boolean }) {
  const vis = always ? "" : "hidden dark:block";
  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none absolute right-[-6%] top-[-14%] h-[600px] w-[600px] rounded-full blur-[34px] ${vis} ${styles.auroraA}`}
        style={{ background: "radial-gradient(circle,rgba(224,103,60,.5),rgba(224,103,60,0) 62%)" }}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute left-[-12%] top-[18%] h-[560px] w-[560px] rounded-full blur-[40px] ${vis} ${styles.auroraB}`}
        style={{ background: "radial-gradient(circle,rgba(187,67,27,.46),rgba(187,67,27,0) 62%)" }}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-[-22%] left-[34%] h-[520px] w-[520px] rounded-full blur-[46px] ${vis} ${styles.auroraC}`}
        style={{ background: "radial-gradient(circle,rgba(246,180,135,.3),rgba(246,180,135,0) 60%)" }}
      />
    </>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-canvas text-ink">
      {/* NAV — glass in both themes */}
      <nav className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-[#14110f]/70">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3.5">
          <Logo />
          <div className="hidden gap-8 md:flex">
            <a href="#how" className="text-[15px] font-medium text-ink-2 transition hover:text-ink dark:text-white/65 dark:hover:text-white">How it works</a>
            <a href="#features" className="text-[15px] font-medium text-ink-2 transition hover:text-ink dark:text-white/65 dark:hover:text-white">Features</a>
            <a href="#sectors" className="text-[15px] font-medium text-ink-2 transition hover:text-ink dark:text-white/65 dark:hover:text-white">Who it&apos;s for</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href={LOGIN} className="text-[15px] font-semibold text-ink-2 hover:text-ink dark:text-white/80 dark:hover:text-white">Log in</Link>
            <Link href={SIGNUP} className="rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)] dark:shadow-[0_8px_24px_-8px_rgba(224,103,60,.8)]">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative overflow-hidden">
        <Aurora />
        <Grain />
        <Spotlight />
        <div className="relative z-[3] mx-auto max-w-[1180px] px-6 pb-10 pt-16 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className={styles.fadeUp}><Eyebrow>Booking software for solo service providers</Eyebrow></div>
              <h1 className={`mt-4 text-[40px] font-extrabold leading-[1.08] tracking-[-.03em] sm:text-[54px] ${styles.fadeUp} ${styles.d1}`}>
                Get booked in <Shimmer>seconds</Shimmer>. Run it all from your phone.
              </h1>
              <p className={`mt-5 max-w-[520px] text-[18px] leading-relaxed text-ink-2 ${styles.fadeUp} ${styles.d2}`}>
                Share one link. Clients pick a service and time and book instantly — no app, no account, no back-and-forth. You manage every appointment, reschedule, and reminder from one simple place.
              </p>
              <div className={`mt-7 flex flex-wrap items-center gap-3.5 ${styles.fadeUp} ${styles.d3}`}>
                <Link href={SIGNUP} className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)] dark:shadow-[0_18px_44px_-12px_rgba(224,103,60,.85)]">
                  Get your free booking link <ArrowRight size={16} strokeWidth={2.3} />
                </Link>
                <a href="#how" className="rounded-full border-[1.5px] border-line px-7 py-[15px] text-base font-semibold text-ink transition hover:border-ink-3 dark:border-white/20 dark:bg-white/5 dark:text-white dark:backdrop-blur">
                  See how it works
                </a>
              </div>
              <p className={`mt-5 flex items-center gap-2 text-[13.5px] text-ink-3 ${styles.fadeUp} ${styles.d4}`}>
                <Check size={15} strokeWidth={2.4} className="text-ok" /> <b className="font-semibold text-ink-2">No app for your clients.</b> · Ready in minutes · Works for any service
              </p>
            </div>
            <div className={`${styles.fadeUp} ${styles.d2}`}>
              <HeroVisual />
            </div>
          </div>
        </div>

        {/* sector marquee — cinematic dark accent */}
        <div className="relative z-[3] hidden overflow-hidden border-t border-white/10 py-4 [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)] dark:block">
          <div className={styles.marqTrack}>
            {[0, 1].map((k) => (
              <span key={k} className="inline-flex items-center whitespace-nowrap font-serif text-[19px] font-medium italic text-white/30">
                {SECTORS.map((s) => (
                  <span key={s.name} className="inline-flex items-center">
                    {s.name}<span className="mx-[22px] text-accent">◆</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* SECTORS */}
      <section id="sectors" className="mx-auto max-w-[1180px] px-6 pb-6 pt-10">
        <div className="mb-7 text-center">
          <h2 className="text-[15px] font-semibold text-ink-3">Made for every kind of solo pro, whatever your craft</h2>
        </div>
        <div className={`grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-7 ${styles.reveal}`}>
          {SECTORS.map((s) => (
            <div key={s.name} className={`rounded-2xl p-4 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-sm)] ${CARD}`}>
              <span className="mx-auto mb-2.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl" style={{ background: TINT[s.tint] }}>
                {s.icon}
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-ink-2 dark:text-white/72">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-canvas-2 py-20 dark:bg-[#1e1814]">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mx-auto mb-12 max-w-[620px] text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3.5 text-[30px] font-extrabold leading-tight tracking-[-.025em] sm:text-[40px]">Set up once. Then it mostly runs itself.</h2>
            <p className="mt-3.5 text-[17px] text-ink-2">From sign-up to your first booking in an afternoon — no training, no manual.</p>
          </div>
          <div className="relative">
            {/* animated connector — dark only */}
            <div aria-hidden className={`absolute left-[16.66%] right-[16.66%] top-12 hidden h-0.5 rounded-full opacity-55 dark:block ${styles.connector}`} />
            <div className={`relative grid gap-5 md:grid-cols-3 ${styles.reveal}`}>
              {STEPS.map((st, i) => (
                <div key={st.h} className={`rounded-[20px] p-7 shadow-[var(--shadow-sm)] transition hover:-translate-y-1.5 hover:shadow-[var(--shadow)] ${CARD}`}>
                  <div className={`mb-4 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-accent-l font-serif text-[18px] font-semibold text-accent dark:bg-accent/20 ${styles.stepNode}`}>{i + 1}</div>
                  <h3 className="mb-2 text-xl font-bold tracking-[-.01em]">{st.h}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-2">{st.p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mx-auto mb-12 max-w-[620px] text-center">
            <Eyebrow>Everything you need</Eyebrow>
            <h2 className="mt-3.5 text-[30px] font-extrabold leading-tight tracking-[-.025em] sm:text-[40px]">
              Booking and admin, finally <Shimmer>effortless</Shimmer>.
            </h2>
            <p className="mt-3.5 text-[17px] text-ink-2">The parts that make running a solo practice feel light.</p>
          </div>
          <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${styles.reveal}`}>
            {FEATURES.map((f) => (
              <div key={f.h} className={`group rounded-[18px] p-6 transition hover:-translate-y-1.5 hover:shadow-[var(--shadow)] ${CARD}`}>
                <span className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-xl transition group-hover:scale-105" style={{ background: TINT[f.tint] }}>{f.icon}</span>
                <h3 className="mb-1.5 text-[18px] font-bold tracking-[-.01em]">{f.h}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="relative overflow-hidden bg-canvas-2 py-20 dark:bg-[#1e1814]">
        <Aurora />
        <div className="relative z-[2] mx-auto max-w-[760px] px-6 text-center">
          <div className={`rounded-[26px] p-10 sm:p-12 ${CARD} dark:shadow-[0_30px_70px_-30px_rgba(0,0,0,.6)] dark:backdrop-blur-xl`}>
            <div className="mb-4 flex justify-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18.1 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z" /></svg>
              ))}
            </div>
            <p className="font-serif text-[26px] italic leading-[1.42] tracking-[-.01em] sm:text-[29px]">
              &ldquo;My clients book themselves while I&apos;m working, and I haven&apos;t sent a &lsquo;what time works for you?&rsquo; message in months. <Shimmer>It just runs.</Shimmer>&rdquo;
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent-l font-serif text-base font-semibold text-accent">M</div>
              <div className="text-left">
                <b className="block text-[15px] font-bold">Mira</b>
                <span className="text-[13px] text-ink-3">Balayage specialist · Antwerpen</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — always a dark band in both themes */}
      <section className="py-20">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-[#17120f] px-8 py-16 text-center text-white sm:px-10">
            <Aurora always />
            <Grain />
            <Spotlight />
            <h2 className="relative z-[2] text-[30px] font-extrabold tracking-[-.025em] sm:text-[40px]">Your calendar, on <Shimmer>autopilot</Shimmer>.</h2>
            <p className="relative z-[2] mx-auto mt-3.5 max-w-[460px] text-[17px] text-white/70">Claim your booking link and take your first booking today.</p>
            <Link href={SIGNUP} className="relative z-[2] mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-[0_18px_44px_-12px_rgba(224,103,60,.85)] transition hover:-translate-y-0.5">
              Get started free <ArrowRight size={16} strokeWidth={2.3} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-[1180px] px-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-7 dark:border-white/10">
          <Logo />
          <div className="flex flex-wrap gap-6 text-sm text-ink-3">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#sectors" className="hover:text-ink">Who it&apos;s for</a>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href={LOGIN} className="hover:text-ink">Log in</Link>
          </div>
          <div className="text-[13px] text-ink-4">© 2026 LockdDin · Antwerpen</div>
        </div>
      </footer>
    </div>
  );
}

const sIcon = { fill: "none", stroke: "var(--accent)", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const fIcon = { fill: "none", stroke: "var(--accent)", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const SECTORS = [
  { name: "Hair & Barbering", tint: "blush", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><circle cx="7" cy="9" r="3.5" /><circle cx="7" cy="23" r="3.5" /><path d="M10 11 27 22M10 21 27 10" /></svg> },
  { name: "Nails", tint: "cream", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><path d="M16 6h4v13a4 4 0 0 1-8 0v-7a6 6 0 0 1 4-6z" /><path d="M14 6.5c0-1.5 1-2.5 2-2.5s2 1 2 2.5V8h-4z" /></svg> },
  { name: "Lashes & Brows", tint: "sky", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><path d="M4 17s5-7 12-7 12 7 12 7-5 7-12 7-12-7-12-7z" /><circle cx="16" cy="17" r="3.5" /></svg> },
  { name: "Make-up", tint: "lilac", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><path d="M20 5l7 7-13 13-7 1 1-7z" /><path d="M17 8l7 7" /></svg> },
  { name: "Tattoo & Piercing", tint: "sage", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><rect x="12" y="4" width="8" height="13" rx="2" /><path d="M16 17v7M11 27h10M14 8h4" /></svg> },
  { name: "Massage & Spa", tint: "blush", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><path d="M6 20c0-3 3-5 6-5s4 2 8 2 6-2 6 1-3 6-10 6-10-1-10-4z" /><path d="M12 15c-1-2-1-5 1-7M16 14c0-2 0-5 2-6" /></svg> },
  { name: "Skincare & Facials", tint: "cream", icon: <svg viewBox="0 0 32 32" width={30} height={30} {...sIcon}><path d="M20 4c-7 1-12 7-12 13a8 8 0 0 0 14 5c-5 0-8-3-8-8 0-5 3-9 6-10z" /></svg> },
];

const STEPS = [
  { h: "Add your services", p: "List what you offer with prices and durations, and set your week. We pre-fill sensible defaults so your booking page is ready fast." },
  { h: "Share your link", p: "Drop it in your Instagram bio or send it in a chat. Clients pick a slot and book in seconds — no download, no account." },
  { h: "Manage with ease", p: "Reschedule, block time off, and let reminders go out automatically. Your whole day stays organised from your phone." },
];

const FEATURES = [
  { h: "Seamless booking", tint: "accentL", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M5 12l5 5L20 7" /></svg>, p: "Clients book a service and time in under a minute on any phone — no app, no password, no waiting on a reply." },
  { h: "Flexible scheduling", tint: "sage", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>, p: "Set your working week, vary your hours, add breaks, or block whole days off. Same routine or different each week — it just works." },
  { h: "Easy rescheduling", tint: "sky", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 4v5h5M12 8v4l3 2" /></svg>, p: "A booking moves with one tap, for you or the client. No awkward messages and no double-booking." },
  { h: "Automatic reminders", tint: "cream", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" /><path d="M10.5 21a1.5 1.5 0 0 0 3 0" /></svg>, p: "Clients get an email confirmation and a reminder before their appointment, so you get fewer no-shows and zero chasing." },
  { h: "One simple dashboard", tint: "lilac", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>, p: "Your whole day at a glance: who's coming, what's next, what's free. Manage clients and bookings from your pocket." },
  { h: "A client book that remembers", tint: "blush", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" /><path d="M4 19a2 2 0 0 0 2 2h14M9 8h6" /></svg>, p: "Every booking builds your client list, so returning clients are recognised by email and re-booking is instant — no accounts to manage." },
];
