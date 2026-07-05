"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { recordBanner, deleteBanner } from "@/lib/dashboard/photo-actions";
import { uploadToWorkPhotos } from "@/lib/upload-photo";
import { storageUrl } from "@/lib/storage-url";
import { useT } from "@/lib/i18n/context";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}

// Profile banner hero — the full-width image (or branded gradient) with the
// business identity overlaid: avatar, name, city, and a live indicator. Doubles
// as the upload control: "Replace banner" opens the file picker.
export function BannerUpload({
  currentPath,
  providerName,
  city,
}: {
  currentPath?: string | null;
  providerName: string;
  city?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 40 * 1024 * 1024) {
      setError("That file is very large — please choose a photo.");
      return;
    }
    try {
      const path = await uploadToWorkPhotos(file, "banner");
      const fd = new FormData();
      fd.set("path", path);
      const res = await recordBanner({}, fd);
      if (res.error) {
        setError("Something went wrong — please try again.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Upload failed — please try again.");
    }
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      await deleteBanner({}, new FormData());
      router.refresh();
    });
  }

  return (
    <section className="space-y-2.5">
      <div className="relative h-44 w-full overflow-hidden rounded-[20px] sm:h-52 lg:h-60">
        {currentPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storageUrl(currentPath)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: "linear-gradient(135deg, #c98a5e 0%, #9a5a34 100%)" }}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/15" />

        {/* Replace / remove */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[9px] bg-white/90 px-3 py-1.5 text-[12px] font-bold text-accent backdrop-blur disabled:opacity-60"
          >
            <ImagePlus size={13} strokeWidth={2} />
            {busy ? "…" : currentPath ? t.profile.replaceBanner : t.profile.addBanner}
          </button>
          {currentPath && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              title={t.profile.removeBanner}
              aria-label={t.profile.removeBanner}
              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[9px] bg-white/90 text-ink-3 backdrop-blur disabled:opacity-60"
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* Identity overlay */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3.5 p-4 sm:p-6">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] font-serif text-[21px] font-semibold sm:h-[72px] sm:w-[72px] sm:text-2xl"
            style={{ background: "#e7eef6", color: "#3a6ea5", borderColor: "var(--canvas)" }}
          >
            {initials(providerName)}
          </span>
          <div className="min-w-0 pb-0.5">
            <h1 className="truncate font-serif text-[22px] font-semibold text-white [text-shadow:0_1px_16px_rgba(20,12,8,.55)] sm:text-[27px]">
              {providerName}
            </h1>
            <p className="mt-1.5 flex items-center gap-2.5 text-[12.5px] font-semibold text-white/90">
              {city && <span className="truncate">{city}</span>}
              <span className="inline-flex items-center gap-1.5 text-[#9be8bd]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9be8bd]" />
                {t.profile.live}
              </span>
            </p>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
