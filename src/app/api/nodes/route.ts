import { getOrCreateNode, searchNodes } from "@/db/queries";
import { NODE_KINDS, type NodeKind } from "@/db/schema";
import { jsonError, readJson } from "@/lib/api";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await searchNodes(query));
}

export async function POST(request: Request) {
  const body = await readJson<{ kind?: NodeKind; title?: string }>(request);
  if (!body?.title?.trim()) return jsonError("A title is required");
  if (!body.kind || !NODE_KINDS.includes(body.kind)) return jsonError("Unknown node kind");
  if (body.kind === "problem") return jsonError("Create problems via /api/problems");

  const node = getOrCreateNode(body.kind, body.title);
  return Response.json(node, { status: 201 });
}
