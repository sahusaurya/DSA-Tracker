"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Connection } from "@/db/queries";
import type { EdgeKind, NodeKind } from "@/db/schema";
import { nodeHref } from "@/lib/nav";
import { IconX } from "./icons";
import { LinkPicker } from "./LinkPicker";

const KIND_DOT: Record<NodeKind, string> = {
  problem: "bg-accent",
  topic: "bg-medium",
};

type Direction = "outgoing" | "incoming";

/**
 * One row per linked node, remembering every edge kind that reached it — a node
 * linked both from note text and by hand is one chip, not two.
 */
type Grouped = Omit<Connection, "edgeKind"> & { edgeKinds: Set<EdgeKind> };

function group(items: Connection[]): Grouped[] {
  const byNode = new Map<string, Grouped>();
  for (const { edgeKind, ...node } of items) {
    const existing = byNode.get(node.id);
    if (existing) existing.edgeKinds.add(edgeKind);
    else byNode.set(node.id, { ...node, edgeKinds: new Set([edgeKind]) });
  }
  return [...byNode.values()];
}

/** Wiki-links are rebuilt from note text on every save, so deleting one achieves nothing. */
const REMOVABLE: EdgeKind[] = ["manual", "membership"];

function Chip({
  nodeId,
  item,
  direction,
}: {
  nodeId: string;
  item: Grouped;
  direction: Direction;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const removable = REMOVABLE.filter((kind) => item.edgeKinds.has(kind));
  const fromNotes = item.edgeKinds.has("wikilink");

  async function unlink() {
    setBusy(true);
    // The chip points away from this node in one direction and back at it in the other.
    const [srcId, dstId] =
      direction === "outgoing" ? [nodeId, item.id] : [item.id, nodeId];

    for (const kind of removable) {
      await fetch("/api/edges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srcId, dstId, kind }),
      });
    }
    setBusy(false);
    startTransition(() => router.refresh());
  }

  return (
    <li
      className={`flex items-center rounded-md border border-border bg-surface text-xs transition-colors hover:border-border-strong ${
        busy ? "opacity-50" : ""
      }`}
    >
      <Link
        href={nodeHref(item.kind, item.id)}
        className={`flex items-center gap-1.5 py-1 pl-2 text-muted transition-colors hover:text-text ${
          removable.length > 0 ? "pr-1" : "pr-2"
        }`}
        title={
          fromNotes
            ? removable.length > 0
              ? `Linked by hand and from your notes — unlinking leaves [[${item.title}]] in your notes`
              : `From your notes — delete [[${item.title}]] there to unlink`
            : "Linked by hand"
        }
      >
        <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[item.kind]}`} />
        {item.title}
      </Link>

      {removable.length > 0 && (
        <button
          type="button"
          onClick={unlink}
          disabled={busy}
          className="py-1 pr-1.5 pl-0.5 text-faint transition-colors hover:text-hard"
          aria-label={`Unlink ${item.title}`}
          title={
            fromNotes
              ? `Unlink ${item.title} — it will stay while your notes still say [[${item.title}]]`
              : `Unlink ${item.title}`
          }
        >
          <IconX className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}

function ConnectionList({
  nodeId,
  items,
  direction,
}: {
  nodeId: string;
  items: Connection[];
  direction: Direction;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {group(items).map((item) => (
        <Chip key={item.id} nodeId={nodeId} item={item} direction={direction} />
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
          <ConnectionList nodeId={nodeId} items={outgoing} direction="outgoing" />
        </div>
      )}

      {incoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-faint">Referenced by</span>
          <ConnectionList nodeId={nodeId} items={incoming} direction="incoming" />
        </div>
      )}
    </section>
  );
}
