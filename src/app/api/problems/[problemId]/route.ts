import { deleteNode, getProblemDetail, updateProblem } from "@/db/queries";
import { DIFFICULTIES, STATUSES, type Difficulty, type Status } from "@/db/schema";
import { jsonError, readJson } from "@/lib/api";
import { parseProblemUrl } from "@/lib/url-parse";

type Context = { params: Promise<{ problemId: string }> };

type Patch = {
  title?: string;
  url?: string | null;
  difficulty?: Difficulty | null;
  status?: Status;
};

export async function PATCH(request: Request, { params }: Context) {
  const { problemId } = await params;
  if (!(await getProblemDetail(problemId))) return jsonError("Problem not found", 404);

  const body = await readJson<Patch>(request);
  if (!body) return jsonError("Invalid JSON body");

  if (body.difficulty != null && !DIFFICULTIES.includes(body.difficulty)) {
    return jsonError("Unknown difficulty");
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return jsonError("Unknown status");
  }

  const patch: Patch = { ...body };
  if (body.url !== undefined) {
    if (!body.url) {
      patch.url = null;
    } else {
      const parsed = parseProblemUrl(body.url);
      if (!parsed) return jsonError("That doesn't look like a valid URL");
      patch.url = parsed.canonicalUrl;
    }
  }

  updateProblem(problemId, patch);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { problemId } = await params;
  await deleteNode(problemId);
  return Response.json({ ok: true });
}
