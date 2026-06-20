"use client";

import { useRef, useState } from "react";
import styles from "./landing.module.css";

// Mouse-parallax 3D hero: the phone and floating cards sit on a stage that
// tilts toward the cursor, each at a different depth for a layered feel.
// Falls back to a flat, still composition under prefers-reduced-motion.
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 9, ry: px * 13 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      className={`relative mx-auto h-[440px] w-full max-w-[420px] sm:h-[480px] ${styles.scene}`}
    >
      <div
        className={styles.stage}
        style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
      >
        {/* morphing gradient blobs */}
        <div
          className={`absolute right-0 top-5 h-[280px] w-[280px] opacity-90 blur-[2px] ${styles.blob}`}
          style={{ background: "var(--blush)" }}
        />
        <div
          className={`absolute bottom-2 left-0 h-[210px] w-[210px] opacity-90 blur-[2px] ${styles.blob2}`}
          style={{ background: "var(--sage)" }}
        />

        {/* phone mock */}
        <div
          className={styles.layer}
          style={{ transform: "translateZ(40px)" }}
        >
          {/* Mirrors the real booking app: provider header, photo-forward
              service cards with price chips + selection, and the dark dock. */}
          <div className="absolute left-[52px] top-[28px] w-[236px] rounded-[30px] bg-white p-2 shadow-[var(--shadow)]">
            <div className="overflow-hidden rounded-[22px] bg-[#faf6f0]">
              {/* provider header */}
              <div className="relative mx-2.5 mt-2.5 h-[46px] overflow-hidden rounded-xl bg-[#ecdcc9] [background-image:repeating-linear-gradient(135deg,rgba(184,66,28,.08)_0_2px,transparent_2px_12px)]" />
              <div className="relative -mt-3.5 flex items-center gap-2 px-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#faf6f0] bg-[#fbeae1] font-serif text-[11px] font-semibold text-[#b8421c]">SM</span>
                <div>
                  <p className="font-serif text-[13px] font-semibold leading-none text-[#221d19]">Studio Mira</p>
                  <p className="mt-1 text-[8.5px] text-[#8a7f74]">Balayage &amp; colour · Antwerpen</p>
                </div>
              </div>
              <div className="px-3 pb-3">
                <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#e9f1ea] px-2 py-1 text-[8px] font-semibold text-[#1f6e42]">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1f6e42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  Free cancellation · no account
                </span>
                <p className="mb-2 mt-2.5 font-serif text-[13px] font-semibold text-[#221d19]">What would you like to book?</p>
                {/* selected photo card */}
                <div className="mb-2 overflow-hidden rounded-xl border-[1.5px] border-[#b8421c] bg-white shadow-[0_0_0_3px_#fbeae1]">
                  <div className="relative h-[42px] bg-[#ecdcc9] [background-image:repeating-linear-gradient(135deg,rgba(184,66,28,.08)_0_2px,transparent_2px_11px)]">
                    <span className="absolute bottom-1.5 left-2 rounded bg-[rgba(34,29,25,.8)] px-1.5 py-0.5 text-[9px] font-bold text-white">€45,00</span>
                    <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-white bg-[#b8421c]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="font-serif text-[12px] font-semibold text-[#221d19]">Cut &amp; Finish</span>
                    <span className="text-[9px] text-[#8a7f74]">45 min</span>
                  </div>
                </div>
                {/* second card */}
                <div className="mb-2.5 overflow-hidden rounded-xl border border-[#ece3d9] bg-white">
                  <div className="relative h-[42px] bg-[#e7dccb] [background-image:repeating-linear-gradient(135deg,rgba(184,66,28,.08)_0_2px,transparent_2px_11px)]">
                    <span className="absolute bottom-1.5 left-2 rounded bg-[rgba(34,29,25,.8)] px-1.5 py-0.5 text-[9px] font-bold text-white">€120,00</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="font-serif text-[12px] font-semibold text-[#221d19]">Balayage</span>
                    <span className="text-[9px] text-[#8a7f74]">2h 30m · 6 photos</span>
                  </div>
                </div>
                {/* dark dock */}
                <div className="flex items-center gap-2 rounded-[14px] bg-[#221d19] py-1.5 pl-3 pr-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[8.5px] text-[#b8ac9d]">2 services · 1h 15m</p>
                    <p className="font-serif text-[13px] font-semibold text-white">€80,00</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#b8421c] px-2.5 py-1.5 text-[10px] font-bold text-white">
                    Continue
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* floating proof cards */}
        <div
          className={styles.layer}
          style={{ transform: "translateZ(75px)" }}
        >
          <div className={`absolute right-1 top-14 ${styles.float}`}>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-[var(--shadow)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-sage">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1f6e42" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span>
                <b className="block text-[12.5px] font-bold text-ink">Booked &amp; confirmed</b>
                <span className="text-[10.5px] text-ink-3">Wed 11 Jun · 09:00</span>
              </span>
            </div>
          </div>
        </div>
        <div
          className={styles.layer}
          style={{ transform: "translateZ(95px)" }}
        >
          <div className={`absolute bottom-12 right-6 ${styles.floatSlow}`}>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-[var(--shadow)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent-l">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#bb431b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <span>
                <b className="block text-[12.5px] font-bold text-ink">Reminder sent</b>
                <span className="text-[10.5px] text-ink-3">Automatic · 6h before</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
