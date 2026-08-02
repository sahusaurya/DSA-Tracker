import type { NodeKind } from "@/db/schema";

const SEGMENT: Record<NodeKind, string> = {
  problem: "problems",
  topic: "topics",
  bundle: "bundles",
};

export function nodeHref(kind: NodeKind, id: string) {
  return `/${SEGMENT[kind]}/${id}`;
}
