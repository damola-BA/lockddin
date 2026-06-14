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
          <div className="absolute left-[52px] top-[28px] w-[236px] rounded-[30px] bg-white p-2 shadow-[var(--shadow)]">
            <div className="overflow-hidden rounded-[22px] bg-canvas">
              <div className="flex h-24 items-end bg-gradient-to-br from-[#f0c3aa] to-[#d98a63] p-2.5">
                <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white">
                  Studio Mira · Antwerpen
                </span>
              </div>
              <div className="p-3">
                <div className="font-serif text-lg font-medium italic text-ink">
                  Studio Mira
                </div>
                <div className="mb-2.5 mt-0.5 text-[10px] text-ink-3">
                  Tap a service to book
                </div>
                <div className="mb-1.5 flex items-center justify-between rounded-[10px] border border-line bg-white px-2.5 py-2">
                  <span className="text-xs font-semibold">Cut &amp; Blow Dry</span>
                  <span className="text-[11px] font-semibold text-ink-2">€55</span>
                </div>
                <div className="mb-1.5 flex items-center justify-between rounded-[10px] border border-accent bg-accent-l px-2.5 py-2">
                  <span className="text-xs font-semibold">Balayage</span>
                  <span className="text-[11px] font-semibold text-ink-2">€145</span>
                </div>
                <div className="mb-1.5 flex items-center justify-between rounded-[10px] border border-line bg-white px-2.5 py-2">
                  <span className="text-xs font-semibold">Full Colour</span>
                  <span className="text-[11px] font-semibold text-ink-2">€95</span>
                </div>
                <div className="mt-1 rounded-[10px] bg-accent py-2.5 text-center text-[11px] font-semibold text-white">
                  Pick a time →
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
