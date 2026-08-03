import type { NodeKind } from "@/db/schema";

const SEGMENT: Record<NodeKind, string> = {
  problem: "problems",
  topic: "topics",
};

export function nodeHref(kind: NodeKind, id: string) {
  return `/${SEGMENT[kind]}/${id}`;
}
