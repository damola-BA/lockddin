import Link from "next/link";
import { HeroVisual } from "@/components/landing/hero-visual";
import styles from "@/components/landing/landing.module.css";

const SIGNUP = "/onboarding/email";
const LOGIN = "/signin";

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

export default function LandingPage() {
  return (
    <div className="bg-canvas text-ink">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-3.5">
          <Logo />
          <div className="hidden gap-8 md:flex">
            <a href="#how" className="text-[15px] font-medium text-ink-2 hover:text-ink">How it works</a>
            <a href="#features" className="text-[15px] font-medium text-ink-2 hover:text-ink">Features</a>
            <a href="#sectors" className="text-[15px] font-medium text-ink-2 hover:text-ink">Who it&apos;s for</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href={LOGIN} className="text-[15px] font-semibold text-ink-2 hover:text-ink">Log in</Link>
            <Link href={SIGNUP} className="rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-[1160px] px-6 pb-10 pt-16 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className={styles.fadeUp}><Eyebrow>Booking software for solo service providers</Eyebrow></div>
            <h1 className={`mt-4 text-[40px] font-extrabold leading-[1.08] tracking-[-.03em] sm:text-[54px] ${styles.fadeUp} ${styles.d1}`}>
              Get booked in <span className="font-serif font-medium italic text-accent">seconds</span>. Run it all from your phone.
            </h1>
            <p className={`mt-5 max-w-[520px] text-[18px] leading-relaxed text-ink-2 ${styles.fadeUp} ${styles.d2}`}>
              Share one link. Clients pick a service and time and book instantly — no app, no account, no back-and-forth. You manage every appointment, reschedule, and reminder from one simple place.
            </p>
            <div className={`mt-7 flex flex-wrap items-center gap-3.5 ${styles.fadeUp} ${styles.d3}`}>
              <Link href={SIGNUP} className="rounded-full bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]">
                Get your free booking link
              </Link>
              <a href="#how" className="rounded-full border-[1.5px] border-line px-7 py-[15px] text-base font-semibold text-ink transition hover:border-ink-3">
                See how it works
              </a>
            </div>
            <p className={`mt-5 flex items-center gap-2 text-[13.5px] text-ink-3 ${styles.fadeUp} ${styles.d4}`}>
              <span className="text-accent">✓</span> <b className="font-semibold text-ink-2">No app for your clients.</b> · Ready in minutes · Works for any service
            </p>
          </div>
          <div className={`${styles.fadeUp} ${styles.d2}`}>
            <HeroVisual />
          </div>
        </div>
      </header>

      {/* SECTORS */}
      <section id="sectors" className="mx-auto max-w-[1160px] px-6 pb-6 pt-8">
        <div className="mb-7 text-center">
          <h2 className="text-[15px] font-semibold text-ink-3">Made for every kind of solo pro, whatever your craft</h2>
        </div>
        <div className={`grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-7 ${styles.reveal}`}>
          {SECTORS.map((s) => (
            <div key={s.name} className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-sm)]">
              <span className="mx-auto mb-2.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl" style={{ background: `var(--${s.tint})` }}>
                {s.icon}
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-ink-2">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-canvas-2 py-20">
        <div className="mx-auto max-w-[1160px] px-6">
          <div className="mx-auto mb-12 max-w-[620px] text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3.5 text-[30px] font-extrabold leading-tight tracking-[-.025em] sm:text-[40px]">Set up once. Then it mostly runs itself.</h2>
            <p className="mt-3.5 text-[17px] text-ink-2">From sign-up to your first booking in an afternoon — no training, no manual.</p>
          </div>
          <div className={`grid gap-5 md:grid-cols-3 ${styles.reveal}`}>
            {STEPS.map((st, i) => (
              <div key={st.h} className="rounded-[20px] border border-line bg-surface p-7 shadow-[var(--shadow-sm)]">
                <div className="mb-4 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-accent-l text-[15px] font-bold text-accent">{i + 1}</div>
                <h3 className="mb-2 text-xl font-bold tracking-[-.01em]">{st.h}</h3>
                <p className="text-[15px] leading-relaxed text-ink-2">{st.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-[1160px] px-6">
          <div className="mx-auto mb-12 max-w-[620px] text-center">
            <Eyebrow>Everything you need</Eyebrow>
            <h2 className="mt-3.5 text-[30px] font-extrabold leading-tight tracking-[-.025em] sm:text-[40px]">
              Booking and admin, finally <span className="font-serif font-medium italic text-accent">effortless</span>.
            </h2>
            <p className="mt-3.5 text-[17px] text-ink-2">The parts that make running a solo practice feel light.</p>
          </div>
          <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${styles.reveal}`}>
            {FEATURES.map((f) => (
              <div key={f.h} className="rounded-[18px] border border-line bg-surface p-6">
                <span className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-xl" style={{ background: `var(--${f.tint})` }}>{f.icon}</span>
                <h3 className="mb-1.5 text-[18px] font-bold tracking-[-.01em]">{f.h}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-canvas-2 py-20">
        <div className="mx-auto max-w-[760px] px-6 text-center">
          <p className="font-serif text-[26px] italic leading-[1.42] tracking-[-.01em] sm:text-[30px]">
            &ldquo;My clients book themselves while I&apos;m working, and I haven&apos;t sent a &lsquo;what time works for you?&rsquo; message in months. It just runs.&rdquo;
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <div className="h-[46px] w-[46px] rounded-full bg-gradient-to-br from-[#f0c3aa] to-[#d98a63]" />
            <div className="text-left">
              <b className="block text-[15px] font-bold">Mira</b>
              <span className="text-[13px] text-ink-3">Balayage specialist · Antwerpen</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-[1160px] px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-ink px-8 py-14 text-center text-white sm:px-10">
            <div className="pointer-events-none absolute -right-10 -top-20 h-[280px] w-[280px] rounded-full blur-[40px]" style={{ background: "rgba(187,67,27,.35)" }} />
            <h2 className="relative text-[30px] font-extrabold tracking-[-.025em] sm:text-[38px]">Your calendar, on autopilot.</h2>
            <p className="relative mx-auto mt-3.5 max-w-[460px] text-[17px] text-white/70">Claim your booking link and take your first booking today.</p>
            <Link href={SIGNUP} className="relative mt-7 inline-flex rounded-full bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5">
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-[1160px] px-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-7">
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
  { h: "Seamless booking", tint: "accent-l", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M5 12l5 5L20 7" /></svg>, p: "Clients book a service and time in under a minute on any phone — no app, no password, no waiting on a reply." },
  { h: "Flexible scheduling", tint: "sage", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>, p: "Set your working week, vary your hours, add breaks, or block whole days off. Same routine or different each week — it just works." },
  { h: "Easy rescheduling", tint: "sky", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 4v5h5M12 8v4l3 2" /></svg>, p: "A booking moves with one tap, for you or the client. No awkward messages and no double-booking." },
  { h: "Automatic reminders", tint: "cream", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" /><path d="M10.5 21a1.5 1.5 0 0 0 3 0" /></svg>, p: "Clients get an email confirmation and a reminder before their appointment, so you get fewer no-shows and zero chasing." },
  { h: "One simple dashboard", tint: "lilac", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>, p: "Your whole day at a glance: who's coming, what's next, what's free. Manage clients and bookings from your pocket." },
  { h: "A client book that remembers", tint: "blush", icon: <svg viewBox="0 0 24 24" width={24} height={24} {...fIcon}><path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" /><path d="M4 19a2 2 0 0 0 2 2h14M9 8h6" /></svg>, p: "Every booking builds your client list. Returning clients are recognised by phone, so re-booking is instant — no accounts to manage." },
];
