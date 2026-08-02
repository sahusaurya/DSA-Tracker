import { deleteList, getList, updateList } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";

type Context = { params: Promise<{ listId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { listId } = await params;
  if (!(await getList(listId))) return jsonError("List not found", 404);

  const body = await readJson<{ name?: string; description?: string | null; emoji?: string | null }>(
    request,
  );
  if (!body) return jsonError("Invalid JSON body");
  if (body.name !== undefined && !body.name.trim()) return jsonError("A list name is required");

  updateList(listId, body);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { listId } = await params;
  deleteList(listId);
  return Response.json({ ok: true });
}
