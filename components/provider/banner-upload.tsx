"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordBanner, deleteBanner } from "@/lib/dashboard/photo-actions";
import { uploadToWorkPhotos } from "@/lib/upload-photo";
import { storageUrl } from "@/lib/storage-url";

export function BannerUpload({
  currentPath,
  providerName,
  city,
}: {
  currentPath?: string | null;
  providerName: string;
  city?: string | null;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Photo must be under 8 MB.");
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
    <div className="space-y-3">
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-line bg-surface-2">
        {currentPath ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storageUrl(currentPath)}
              alt="Your banner"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <p className="absolute bottom-3 left-3 font-serif text-lg text-white">
              {providerName}
            </p>
          </>
        ) : (
          <div
            className="flex h-full w-full items-end rounded-xl px-4 pb-4"
            style={{
              background:
                "linear-gradient(135deg, #bb431b 0%, #8b3214 45%, #3d1a0a 100%)",
            }}
          >
            <p className="font-serif text-lg text-white">{providerName}</p>
            {city && <p className="ml-2 text-sm text-white/70">{city}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 disabled:opacity-50"
        >
          {busy ? "Uploading…" : currentPath ? "Replace photo" : "Upload your own photo"}
        </button>

        {currentPath && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="text-sm text-red-600 underline disabled:opacity-50"
          >
            Remove
          </button>
        )}
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

      <p className="text-xs text-ink-4">
        {currentPath
          ? "This photo appears at the top of your booking page."
          : "The branded banner above is shown by default. Upload a photo to personalise it."}
      </p>
    </div>
  );
}
