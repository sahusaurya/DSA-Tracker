import { deleteFile, getFile } from "@/db/queries";
import { jsonError } from "@/lib/api";
import { blobStore } from "@/lib/storage";

type Context = { params: Promise<{ fileId: string }> };

// Only formats the browser renders harmlessly. Notably excludes SVG, which can carry script.
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export async function GET(_request: Request, { params }: Context) {
  const { fileId } = await params;
  const file = getFile(fileId);
  if (!file) return jsonError("File not found", 404);

  const data = await blobStore.read(file.storageKey).catch(() => null);
  if (!data) return jsonError("File is missing from storage", 410);

  const inline = INLINE_TYPES.has(file.mimeType);
  const encoded = encodeURIComponent(file.filename);

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ? file.mimeType : "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encoded}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { fileId } = await params;
  const file = getFile(fileId);
  if (!file) return jsonError("File not found", 404);

  await blobStore.remove(file.storageKey).catch(() => {});
  deleteFile(fileId);
  return Response.json({ ok: true });
}
