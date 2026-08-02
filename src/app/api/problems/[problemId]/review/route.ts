import { getProblemDetail, markReviewed, resetReview } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";

type Context = { params: Promise<{ problemId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { problemId } = await params;
  if (!(await getProblemDetail(problemId))) return jsonError("Problem not found", 404);

  const body = await readJson<{ action?: "advance" | "reset" }>(request);
  if (body?.action === "reset") resetReview(problemId);
  else if (body?.action === "advance") markReviewed(problemId);
  else return jsonError("action must be 'advance' or 'reset'");

  return Response.json({ ok: true });
}
