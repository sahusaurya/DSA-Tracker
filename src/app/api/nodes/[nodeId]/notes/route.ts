import { getNode, updateNotes } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";

type Context = { params: Promise<{ nodeId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { nodeId } = await params;
  if (!(await getNode(nodeId))) return jsonError("Not found", 404);

  const body = await readJson<{ notes?: string }>(request);
  if (typeof body?.notes !== "string") return jsonError("notes must be a string");

  updateNotes(nodeId, body.notes);
  return Response.json({ ok: true, savedAt: Date.now() });
}
