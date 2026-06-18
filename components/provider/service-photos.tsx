"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordServicePhoto, deleteServicePhoto } from "@/lib/dashboard/photo-actions";
import { uploadToWorkPhotos } from "@/lib/upload-photo";
import { storageUrl } from "@/lib/storage-url";

export function ServicePhotoGrid({
  serviceId,
  photos,
}: {
  serviceId: string;
  photos: string[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = photos.length >= 6;

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 40 * 1024 * 1024) {
      setError("That file is very large — please choose a photo.");
      return;
    }
    if (atLimit) {
      setError("Maximum 6 photos per service.");
      return;
    }
    try {
      const path = await uploadToWorkPhotos(file, `services/${serviceId}`);
      const fd = new FormData();
      fd.set("service_id", serviceId);
      fd.set("path", path);
      const res = await recordServicePhoto({}, fd);
      if (res.error) {
        setError(
          res.error === "limit_reached"
            ? "Maximum 6 photos per service."
            : "Upload failed — please try again.",
        );
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Upload failed — please try again.");
    }
  }

  function handleDelete(path: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("service_id", serviceId);
      fd.set("path", path);
      await deleteServicePhoto({}, fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-line pt-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-4">
        Photos ({photos.length}/6)
      </p>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((path) => (
          <div key={path} className="relative aspect-square overflow-hidden rounded-lg">
            <button
              type="button"
              onClick={() => setViewing(path)}
              className="block h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storageUrl(path)} alt="" className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(path)}
              disabled={busy}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm text-white disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-line text-ink-4 disabled:opacity-50"
          >
            <span className="text-2xl">{busy ? "…" : "+"}</span>
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

      {error && <p className="text-xs text-red-600">{error}</p>}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewing(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storageUrl(viewing)}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
