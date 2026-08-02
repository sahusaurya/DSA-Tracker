import { addEdge, getNode, removeEdge } from "@/db/queries";
import { EDGE_KINDS, type EdgeKind } from "@/db/schema";
import { jsonError, readJson } from "@/lib/api";

type Body = { srcId?: string; dstId?: string; kind?: EdgeKind };
type Edge = { srcId: string; dstId: string; kind: EdgeKind };

async function parse(request: Request): Promise<Edge | string> {
  const body = await readJson<Body>(request);
  if (!body?.srcId || !body.dstId) return "srcId and dstId are required";
  if (body.srcId === body.dstId) return "A node cannot link to itself";
  if (!body.kind || !EDGE_KINDS.includes(body.kind)) return "Unknown edge kind";
  if (body.kind === "wikilink") return "Wiki-link edges are derived from note text";
  if (!(await getNode(body.srcId)) || !(await getNode(body.dstId))) return "Node not found";

  return { srcId: body.srcId, dstId: body.dstId, kind: body.kind };
}

export async function POST(request: Request) {
  const edge = await parse(request);
  if (typeof edge === "string") return jsonError(edge);

  addEdge(edge.srcId, edge.dstId, edge.kind);
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const edge = await parse(request);
  if (typeof edge === "string") return jsonError(edge);

  removeEdge(edge.srcId, edge.dstId, edge.kind);
  return Response.json({ ok: true });
}
