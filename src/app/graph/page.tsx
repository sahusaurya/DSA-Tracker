import { GraphCanvas } from "@/components/GraphCanvas";
import { getGraph } from "@/db/queries";

export default async function GraphPage() {
  const { nodes, edges } = await getGraph();

  return (
    <div className="h-full">
      <GraphCanvas nodes={nodes} links={edges} />
    </div>
  );
}
