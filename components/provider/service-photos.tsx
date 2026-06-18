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
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = photos.length >= 6;

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Photo must be under 8 MB.");
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
          <div key={path} className="group relative aspect-square overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={storageUrl(path)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(path)}
              disabled={busy}
              className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <span className="rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                Remove
              </span>
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
    </div>
  );
}
