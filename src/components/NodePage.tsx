import { notFound } from "next/navigation";
import { getNodeDetail, getProblems } from "@/db/queries";
import type { NodeKind } from "@/db/schema";
import { getViewMode } from "@/lib/prefs.server";
import { Connections } from "./Connections";
import { FileStrip } from "./FileStrip";
import { NodeHeader } from "./NodeHeader";
import { NotesEditor } from "./NotesEditor";
import { ProblemTable } from "./ProblemTable";

const PLACEHOLDER: Record<NodeKind, string> = {
  problem: "Write your approach, complexity, edge cases… Type [[ to link.",
  topic: "What's the core idea? When does this pattern apply? Type [[ to link.",
  bundle: "Describe what these files show. Type [[ to link.",
};

export async function NodePage({ id, kind }: { id: string; kind: NodeKind }) {
  const node = await getNodeDetail(id);
  if (!node || node.kind !== kind) notFound();

  const tagged = kind === "topic" ? await getProblems({ topicId: id }) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
      <NodeHeader id={node.id} title={node.title} kind={node.kind} />

      <NotesEditor
        nodeId={node.id}
        initialNotes={node.notes}
        initialMode={await getViewMode()}
        wikiTargets={node.wikiTargets}
        placeholder={PLACEHOLDER[kind]}
      />

      {kind === "topic" && tagged.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Problems tagged with this
          </h2>
          <ProblemTable problems={tagged} />
        </section>
      )}

      <Connections nodeId={node.id} outgoing={node.outgoing} incoming={node.incoming} />
      <FileStrip nodeId={node.id} files={node.files} />
    </div>
  );
}
