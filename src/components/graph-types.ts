import type { NodeKind } from "@/db/schema";

export type GraphNode = {
  id: string;
  kind: NodeKind;
  title: string;
  degree?: number;
  x?: number;
  y?: number;
};

export type GraphLink = { source: string; target: string; kind: string };
