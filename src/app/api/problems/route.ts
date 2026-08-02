import { createProblem } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";
import { parseProblemUrl } from "@/lib/url-parse";

export async function POST(request: Request) {
  const body = await readJson<{ url?: string; title?: string; listId?: string }>(request);
  if (!body) return jsonError("Invalid JSON body");

  const rawUrl = body.url?.trim();
  const rawTitle = body.title?.trim();
  if (!rawUrl && !rawTitle) return jsonError("Provide a problem URL or a title");

  const parsed = rawUrl ? parseProblemUrl(rawUrl) : null;
  if (rawUrl && !parsed) return jsonError("That doesn't look like a valid URL");

  const result = createProblem({
    title: rawTitle || parsed?.title || "Untitled problem",
    url: parsed?.canonicalUrl ?? null,
    source: parsed?.source ?? null,
    listId: body.listId ?? null,
  });

  return Response.json(result, { status: result.created ? 201 : 200 });
}
