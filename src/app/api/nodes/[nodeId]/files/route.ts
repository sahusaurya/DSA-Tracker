import { getNode, recordFile } from "@/db/queries";
import { jsonError } from "@/lib/api";
import { blobStore } from "@/lib/storage";

const MAX_BYTES = 25 * 1024 * 1024;

type Context = { params: Promise<{ nodeId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { nodeId } = await params;
  if (!(await getNode(nodeId))) return jsonError("Not found", 404);

  const form = await request.formData().catch(() => null);
  const upload = form?.get("file");
  if (!(upload instanceof File)) return jsonError("Expected a file upload");
  if (upload.size === 0) return jsonError("That file is empty");
  if (upload.size > MAX_BYTES) return jsonError("Files are limited to 25 MB", 413);

  const data = Buffer.from(await upload.arrayBuffer());
  const filename = upload.name || "attachment";
  const storageKey = await blobStore.put(nodeId, filename, data);

  const id = recordFile({
    nodeId,
    filename,
    mimeType: upload.type || "application/octet-stream",
    size: data.byteLength,
    storageKey,
  });

  return Response.json(
    { id, filename, mimeType: upload.type, url: `/api/files/${id}` },
    { status: 201 },
  );
}
