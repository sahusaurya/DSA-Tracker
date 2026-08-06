import { deleteNode, getNode, renameNode } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";

type Context = { params: Promise<{ nodeId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { nodeId } = await params;
  if (!(await getNode(nodeId))) return jsonError("Not found", 404);

  const body = await readJson<{ title?: string }>(request);
  if (!body?.title?.trim()) return jsonError("A title is required");

  renameNode(nodeId, body.title);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { nodeId } = await params;
  await deleteNode(nodeId);
  return Response.json({ ok: true });
}
