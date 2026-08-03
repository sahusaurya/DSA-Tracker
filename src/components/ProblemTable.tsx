import Link from "next/link";
import type { ProblemSummary } from "@/db/queries";
import { describeDue } from "@/lib/review";
import { DifficultyPill, StatusChip, relativeTime } from "./ui";

export function ProblemTable({
  problems,
  empty = "No problems yet.",
  listId,
}: {
  problems: ProblemSummary[];
  empty?: string;
  /** Carried into the link so the problem page can offer a way back to this list. */
  listId?: string;
}) {
  if (problems.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-faint">
        {empty}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {problems.map((problem) => (
        <li key={problem.id}>
          <Link
            href={listId ? `/problems/${problem.id}?list=${listId}` : `/problems/${problem.id}`}
            className="flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-surface-hover"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{problem.title}</span>
              {problem.topics.length > 0 && (
                <span className="mt-0.5 block truncate text-xs text-faint">
                  {problem.topics.map((t) => t.title).join(" · ")}
                </span>
              )}
            </span>

            <span className="hidden w-20 shrink-0 sm:block">
              <DifficultyPill value={problem.difficulty} />
            </span>
            <span className="hidden w-24 shrink-0 md:block">
              <StatusChip value={problem.status} />
            </span>
            <span className="hidden w-20 shrink-0 text-right text-xs text-faint lg:block">
              {describeDue(problem.nextReviewAt) ?? relativeTime(problem.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
