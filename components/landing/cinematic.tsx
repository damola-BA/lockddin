"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

// Cursor spotlight for the cinematic dark hero/CTA. Renders a soft radial glow
// that follows the pointer within its parent section. Dark-only (hidden in
// light); static under prefers-reduced-motion (the CSS gates the transition).
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      el.style.setProperty("--sx", `${e.clientX - r.left - 320}px`);
      el.style.setProperty("--sy", `${e.clientY - r.top - 320}px`);
    };
    parent.addEventListener("pointermove", onMove);
    return () => parent.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 z-[1] hidden h-[640px] w-[640px] rounded-full dark:block ${styles.spot}`}
      style={{
        background:
          "radial-gradient(circle, rgba(255,233,214,.14), rgba(255,233,214,0) 60%)",
      }}
    />
  );
}

// SVG-noise grain overlay — adds texture to dark sections. Dark-only.
export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] hidden opacity-[.06] mix-blend-overlay dark:block"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
