"use client";

import { useActionState, useRef, useOptimistic } from "react";
import { uploadServicePhoto, deleteServicePhoto } from "@/lib/dashboard/photo-actions";
import { storageUrl } from "@/lib/storage-url";

type State = { error?: string; ok?: true };

export function ServicePhotoGrid({
  serviceId,
  photos,
}: {
  serviceId: string;
  photos: string[];
}) {
  const [optimisticPhotos, addOptimistic] = useOptimistic(
    photos,
    (current, action: { type: "add"; url: string } | { type: "remove"; path: string }) => {
      if (action.type === "remove") return current.filter((p) => p !== action.path);
      return current;
    },
  );

  const [uploadState, uploadAction, uploading] = useActionState<State, FormData>(
    uploadServicePhoto,
    {},
  );
  const [, deleteAction] = useActionState<State, FormData>(deleteServicePhoto, {});
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = optimisticPhotos.length >= 6;

  return (
    <div className="space-y-3 border-t border-line pt-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-4">
        Photos ({optimisticPhotos.length}/6)
      </p>

      {optimisticPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {optimisticPhotos.map((path) => (
            <div key={path} className="group relative aspect-square overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storageUrl(path)}
                alt=""
                className="h-full w-full object-cover"
              />
              <form
                action={async (fd) => {
                  addOptimistic({ type: "remove", path });
                  await deleteAction(fd);
                }}
                className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <input type="hidden" name="service_id" value={serviceId} />
                <input type="hidden" name="path" value={path} />
                <button
                  type="submit"
                  className="rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}

          {!atLimit && (
            <form action={uploadAction}>
              <input type="hidden" name="service_id" value={serviceId} />
              <input
                ref={inputRef}
                type="file"
                name="photo"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) e.target.form?.requestSubmit();
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-line text-ink-4 disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-xl">…</span>
                ) : (
                  <span className="text-2xl">+</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {optimisticPhotos.length === 0 && (
        <form action={uploadAction}>
          <input type="hidden" name="service_id" value={serviceId} />
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) e.target.form?.requestSubmit();
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border border-dashed border-line px-4 py-2.5 text-sm text-ink-3 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "+ Add photos"}
          </button>
        </form>
      )}

      {uploadState.error && (
        <p className="text-xs text-red-600">
          {uploadState.error === "limit_reached"
            ? "Maximum 6 photos per service."
            : uploadState.error === "too_large"
              ? "Photo must be under 8 MB."
              : "Upload failed — please try again."}
        </p>
      )}
    </div>
  );
}
