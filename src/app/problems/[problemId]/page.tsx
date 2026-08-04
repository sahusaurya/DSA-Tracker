import { notFound } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { Connections } from "@/components/Connections";
import { FileStrip } from "@/components/FileStrip";
import { NotesEditor } from "@/components/NotesEditor";
import { ListMembership } from "@/components/ListMembership";
import { ProblemMeta } from "@/components/ProblemMeta";
import { getList, getLists, getNodeDetail, getProblemDetail } from "@/db/queries";
import { getViewMode } from "@/lib/prefs.server";

export default async function ProblemPage({
  params,
  searchParams,
}: {
  params: Promise<{ problemId: string }>;
  searchParams: Promise<{ list?: string }>;
}) {
  const { problemId } = await params;
  const problem = await getProblemDetail(problemId);
  if (!problem) notFound();

  const node = await getNodeDetail(problemId);
  if (!node) notFound();

  // Opened from a list, the way back runs through that list; otherwise straight home.
  const { list: listId } = await searchParams;
  const trail: Crumb[] = [{ label: "All problems", href: "/" }];
  const list = listId ? await getList(listId) : null;
  if (list) {
    trail.push({
      label: list.emoji ? `${list.emoji} ${list.name}` : list.name,
      href: `/lists/${list.id}`,
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
      <Breadcrumbs trail={trail} />
      <ProblemMeta
        id={problem.id}
        title={problem.title}
        url={problem.url}
        source={problem.source}
        difficulty={problem.difficulty}
        status={problem.status}
        nextReviewAt={problem.nextReviewAt}
        reviewDays={problem.reviewInterval}
      />
      <NotesEditor
        nodeId={problem.id}
        initialNotes={problem.notes}
        initialMode={await getViewMode()}
        wikiTargets={node.wikiTargets}
      />
      <ListMembership
        problemId={problem.id}
        memberships={problem.lists}
        allLists={await getLists()}
      />
      <Connections nodeId={problem.id} outgoing={node.outgoing} incoming={node.incoming} />
      <FileStrip nodeId={problem.id} files={problem.files} />
    </div>
  );
}
