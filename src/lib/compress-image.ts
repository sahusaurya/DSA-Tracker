/**
 * Shrinks screenshots on their way into a note.
 *
 * A pasted screenshot is clipboard pixels with no file behind it, so the browser hands
 * over lossless PNG — often a megabyte for a rectangle of text. Paste a few a day and
 * the vault grows far faster than the notes themselves do. Re-encoding to WebP keeps
 * these readable at a fraction of the size.
 *
 * This deliberately does not touch files chosen from disk: those are things the reader
 * picked on purpose, and a scan of a textbook page is theirs to keep byte for byte.
 *
 * Done in the browser so the bytes are already small when they cross the wire, and so a
 * fresh clone needs no native image library to build.
 */

import type { ImageFormat } from "./prefs";

/** Beyond this, a screenshot is bigger than any screen it will be read on. */
const MAX_DIMENSION = 2000;
const QUALITY = 0.85;
/** Re-encoding costs fidelity, so only accept it when the saving is real. */
const WORTH_IT = 0.9;

// GIFs would lose their animation and SVGs are already tiny text, so both pass straight through.
const COMPRESSIBLE = new Set(["image/png", "image/jpeg", "image/webp"]);

function toWebpName(filename: string) {
  const base = filename.replace(/\.[^./\\]+$/, "");
  return `${base || "image"}.webp`;
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/webp", quality: QUALITY });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
}

/**
 * Returns a smaller image, or the original whenever shrinking wouldn't pay off.
 * Choosing "png" in Settings opts out entirely: the paste is stored exactly as it arrived.
 */
export async function compressPastedImage(
  file: File,
  format: ImageFormat = "webp",
): Promise<File> {
  if (format === "png") return file;
  if (!COMPRESSIBLE.has(file.type)) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const blob = await encode(bitmap, width, height);
    if (!blob || blob.size >= file.size * WORTH_IT) return file;

    return new File([blob], toWebpName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    // An image we can't decode is still an image worth keeping — upload it untouched.
    return file;
  } finally {
    bitmap?.close();
  }
}
