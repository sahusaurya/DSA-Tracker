import { notFound } from "next/navigation";
import { Connections } from "@/components/Connections";
import { FileStrip } from "@/components/FileStrip";
import { NotesEditor } from "@/components/NotesEditor";
import { ProblemMeta } from "@/components/ProblemMeta";
import { getNodeDetail, getProblemDetail } from "@/db/queries";
import { getViewMode } from "@/lib/prefs.server";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;
  const problem = await getProblemDetail(problemId);
  if (!problem) notFound();

  const node = await getNodeDetail(problemId);
  if (!node) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
      <ProblemMeta
        id={problem.id}
        title={problem.title}
        url={problem.url}
        source={problem.source}
        difficulty={problem.difficulty}
        status={problem.status}
        nextReviewAt={problem.nextReviewAt}
      />
      <NotesEditor
        nodeId={problem.id}
        initialNotes={problem.notes}
        initialMode={await getViewMode()}
        wikiTargets={node.wikiTargets}
      />
      <Connections nodeId={problem.id} outgoing={node.outgoing} incoming={node.incoming} />
      <FileStrip nodeId={problem.id} files={problem.files} />
    </div>
  );
}
