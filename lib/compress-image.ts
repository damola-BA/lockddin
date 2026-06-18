"use client";

// Downscale + re-encode an image in the browser before upload. Service photos
// and banners only ever display small (thumbnails, a ~448px column, a gallery),
// so a 1600px JPEG is plenty and keeps multi-MB iPhone photos under ~1 MB.
// Respects EXIF orientation so portrait shots aren't rotated.

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  // Only handle raster images we can decode; anything else passes through.
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Some formats (e.g. certain HEIC) can't be decoded by the browser.
    // iOS usually hands the file picker a JPEG, but if not, fall back.
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) return file;

  // If compression somehow produced something bigger, keep the original.
  if (blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
