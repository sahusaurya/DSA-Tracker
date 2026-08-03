import { getProblemDetail, resetReview, scheduleReview } from "@/db/queries";
import { jsonError, readJson } from "@/lib/api";
import { MAX_REVIEW_DAYS, isValidReviewDays } from "@/lib/review";

type Context = { params: Promise<{ problemId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { problemId } = await params;
  if (!(await getProblemDetail(problemId))) return jsonError("Problem not found", 404);

  const body = await readJson<{ action?: "reset"; days?: number }>(request);
  if (body?.action === "reset") {
    resetReview(problemId);
  } else if (isValidReviewDays(body?.days)) {
    scheduleReview(problemId, body.days);
  } else {
    return jsonError(`Send a whole number of days between 0 and ${MAX_REVIEW_DAYS}, or reset`);
  }

  return Response.json({ ok: true });
}
