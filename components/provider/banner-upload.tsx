"use client";

import { useActionState, useRef } from "react";
import { uploadBanner, deleteBanner } from "@/lib/dashboard/photo-actions";
import { storageUrl } from "@/lib/storage-url";

type State = { error?: string; ok?: true };

export function BannerUpload({
  currentPath,
  providerName,
  city,
}: {
  currentPath?: string | null;
  providerName: string;
  city?: string | null;
}) {
  const [uploadState, uploadAction, uploading] = useActionState<State, FormData>(
    uploadBanner,
    {},
  );
  const [deleteState, deleteAction, deleting] = useActionState<State, FormData>(
    deleteBanner,
    {},
  );
  const inputRef = useRef<HTMLInputElement>(null);

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
            {city && (
              <p className="ml-2 text-sm text-white/70">{city}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <form action={uploadAction}>
          <input
            ref={inputRef}
            type="file"
            name="banner"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                e.target.form?.requestSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : currentPath ? "Replace photo" : "Upload your own photo"}
          </button>
        </form>

        {currentPath && (
          <form action={deleteAction}>
            <button
              type="submit"
              disabled={deleting}
              className="text-sm text-red-600 underline disabled:opacity-50"
            >
              {deleting ? "Removing…" : "Remove"}
            </button>
          </form>
        )}
      </div>

      {(uploadState.error || deleteState.error) && (
        <p className="text-sm text-red-600">
          {uploadState.error === "too_large" || deleteState.error === "too_large"
            ? "Photo must be under 5 MB."
            : "Something went wrong — please try again."}
        </p>
      )}

      <p className="text-xs text-ink-4">
        {currentPath
          ? "This photo appears at the top of your booking page."
          : "The branded banner above is shown by default. Upload a photo to personalise it."}
      </p>
    </div>
  );
}
