import { Suspense } from "react";
import { AddProblem } from "@/components/AddProblem";
import { Filters } from "@/components/Filters";
import { PageHeader } from "@/components/PageHeader";
import { ProblemTable } from "@/components/ProblemTable";
import { getProblems } from "@/db/queries";
import { parseFilters, type SearchParams } from "@/lib/filters";

export default async function AllProblemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  const problems = await getProblems(filters);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-8 py-10">
      <PageHeader
        title="All problems"
        subtitle={problems.length === 1 ? "1 problem" : `${problems.length} problems`}
      />
      <AddProblem />
      <Suspense>
        <Filters />
      </Suspense>
      <ProblemTable
        problems={problems}
        empty="Paste a problem URL above to add your first one."
      />
    </div>
  );
}
