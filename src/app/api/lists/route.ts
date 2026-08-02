import { createList, getLists } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";

export async function GET() {
  return Response.json(await getLists());
}

export async function POST(request: Request) {
  const body = await readJson<{ name?: string; description?: string; emoji?: string }>(request);
  if (!body?.name?.trim()) return jsonError("A list name is required");

  const id = createList({
    name: body.name,
    description: body.description ?? null,
    emoji: body.emoji ?? null,
  });
  return Response.json({ id }, { status: 201 });
}
