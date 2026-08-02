import { addProblemToList, getList, removeProblemFromList } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";

type Context = { params: Promise<{ listId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { listId } = await params;
  if (!(await getList(listId))) return jsonError("List not found", 404);

  const body = await readJson<{ problemId?: string }>(request);
  if (!body?.problemId) return jsonError("problemId is required");

  addProblemToList(listId, body.problemId);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const { listId } = await params;
  const body = await readJson<{ problemId?: string }>(request);
  if (!body?.problemId) return jsonError("problemId is required");

  removeProblemFromList(listId, body.problemId);
  return Response.json({ ok: true });
}
