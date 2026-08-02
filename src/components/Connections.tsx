import Link from "next/link";
import type { Connection } from "@/db/queries";
import type { NodeKind } from "@/db/schema";
import { nodeHref } from "@/lib/nav";
import { LinkPicker } from "./LinkPicker";

const KIND_DOT: Record<NodeKind, string> = {
  problem: "bg-accent",
  topic: "bg-medium",
  bundle: "bg-easy",
};

/** A node linked both by a wiki-link and manually is still one connection. */
function dedupe(items: Connection[]): Connection[] {
  const byNode = new Map<string, Connection>();
  for (const item of items) {
    if (!byNode.has(item.id)) byNode.set(item.id, item);
  }
  return [...byNode.values()];
}

function ConnectionList({ items }: { items: Connection[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {dedupe(items).map((item) => (
        <li key={item.id}>
          <Link
            href={nodeHref(item.kind, item.id)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-text"
            title={item.edgeKind === "wikilink" ? "Linked from your notes" : item.edgeKind}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[item.kind]}`} />
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Connections({
  nodeId,
  outgoing,
  incoming,
}: {
  nodeId: string;
  outgoing: Connection[];
  incoming: Connection[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">
          Connections
        </h2>
        <LinkPicker nodeId={nodeId} />
      </div>

      {outgoing.length === 0 && incoming.length === 0 && (
        <p className="text-xs text-faint">
          Write <code className="text-muted">[[Sliding Window]]</code> in your notes, or use Link,
          to connect this to something.
        </p>
      )}

      {outgoing.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-faint">Links to</span>
          <ConnectionList items={outgoing} />
        </div>
      )}

      {incoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-faint">Referenced by</span>
          <ConnectionList items={incoming} />
        </div>
      )}
    </section>
  );
}
