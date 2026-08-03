import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddProblem } from "@/components/AddProblem";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Filters } from "@/components/Filters";
import { ListActions } from "@/components/ListActions";
import { PageHeader } from "@/components/PageHeader";
import { ProblemTable } from "@/components/ProblemTable";
import { getList, getProblems } from "@/db/queries";
import { parseFilters, type SearchParams } from "@/lib/filters";

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { listId } = await params;
  const list = await getList(listId);
  if (!list) notFound();

  const problems = await getProblems({ ...parseFilters(await searchParams), listId });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-8 py-10">
      <Breadcrumbs trail={[{ label: "All problems", href: "/" }]} />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {list.emoji && <span>{list.emoji}</span>}
            {list.name}
          </span>
        }
        subtitle={
          list.description ||
          (problems.length === 1 ? "1 problem" : `${problems.length} problems`)
        }
        actions={<ListActions listId={list.id} name={list.name} />}
      />
      <AddProblem listId={listId} />
      <Suspense>
        <Filters />
      </Suspense>
      <ProblemTable problems={problems} empty="Nothing in this list yet." listId={listId} />
    </div>
  );
}
