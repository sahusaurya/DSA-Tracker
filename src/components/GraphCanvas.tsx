"use client";

import type ForceGraph from "force-graph";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind } from "@/db/schema";
import { nodeHref } from "@/lib/nav";
import type { GraphLink, GraphNode } from "./graph-types";

export type { GraphNode };

type Instance = ForceGraph<GraphNode, GraphLink>;
type Palette = Record<string, string>;

const KIND_VAR: Record<NodeKind, string> = {
  problem: "--accent",
  topic: "--medium",
  bundle: "--easy",
};

const KINDS: NodeKind[] = ["problem", "topic", "bundle"];
const LABEL_ZOOM = 0.9;
const MAX_ZOOM = 2.2;
const FONT_STACK = "system-ui, -apple-system, sans-serif";

function truncate(text: string, max = 26) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Well-connected nodes read as hubs. */
function nodeRadius(node: GraphNode) {
  return 3 + Math.min(node.degree ?? 0, 8) * 0.9;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string) => style.getPropertyValue(name).trim();
  return {
    problem: pick("--accent") || "#3b6ef5",
    topic: pick("--medium") || "#b5730d",
    bundle: pick("--easy") || "#16855c",
    muted: pick("--muted") || "#777",
    faint: pick("--faint") || "#aaa",
  };
}

export function GraphCanvas({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const router = useRouter();
  const host = useRef<HTMLDivElement | null>(null);
  const instance = useRef<Instance | null>(null);

  // Read by the canvas painters, which must stay stable for the graph's lifetime.
  const palette = useRef<Palette>({});
  const highlighted = useRef<Set<string> | null>(null);
  const navigate = useRef(router.push);
  // The graph is created asynchronously, so the latest data must be readable on arrival.
  const latestData = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });

  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<NodeKind>>(new Set());

  useEffect(() => {
    navigate.current = router.push;
  }, [router]);

  const data = useMemo(() => {
    const visible = nodes.filter((node) => !hidden.has(node.kind));
    const ids = new Set(visible.map((node) => node.id));
    const visibleLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target));

    const degree = new Map<string, number>();
    for (const link of visibleLinks) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }

    return {
      nodes: visible.map((node) => ({ ...node, degree: degree.get(node.id) ?? 0 })),
      links: visibleLinks.map((link) => ({ ...link })),
    };
  }, [nodes, links, hidden]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return new Set(data.nodes.filter((n) => n.title.toLowerCase().includes(term)).map((n) => n.id));
  }, [query, data.nodes]);

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const radius = nodeRadius(node);
      const dimmed = highlighted.current !== null && !highlighted.current.has(node.id);

      ctx.globalAlpha = dimmed ? 0.12 : 1;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = palette.current[node.kind] ?? "#888";
      ctx.fill();

      // Labels only once there's room for them, so dense graphs stay readable.
      if (scale > LABEL_ZOOM && !dimmed) {
        ctx.font = `${10 / scale}px ${FONT_STACK}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = palette.current.muted ?? "#888";
        ctx.fillText(truncate(node.title), node.x ?? 0, (node.y ?? 0) + radius + 3 / scale);
      }
      ctx.globalAlpha = 1;
    },
    [],
  );

  // Create the graph once; everything after is pushed in through the instance.
  useEffect(() => {
    let cancelled = false;
    let graph: Instance | null = null;

    void (async () => {
      const { default: ForceGraphCtor } = await import("force-graph");
      if (cancelled || !host.current) return;

      palette.current = readPalette();
      graph = new ForceGraphCtor<GraphNode, GraphLink>(host.current)
        .backgroundColor("transparent")
        .nodeRelSize(4)
        .nodeLabel((node) => node.title)
        .linkColor(() => palette.current.faint ?? "#aaa")
        .linkWidth(1)
        .cooldownTicks(120)
        .nodeCanvasObject(paintNode)
        .nodePointerAreaPaint((node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius(node) + 3, 0, 2 * Math.PI);
          ctx.fill();
        })
        .onNodeClick((node) => navigate.current(nodeHref(node.kind, node.id)));

      graph.onEngineStop(() => graph?.zoomToFit(400, 60));
      graph.d3Force("charge")?.strength(-220).distanceMax(500);
      graph.d3Force("link")?.distance(70);

      const box = host.current.getBoundingClientRect();
      graph.width(box.width).height(box.height);
      graph.graphData(latestData.current);

      instance.current = graph;
    })();

    return () => {
      cancelled = true;
      graph?._destructor();
      instance.current = null;
    };
  }, [paintNode]);

  // Fitting a handful of nodes would otherwise blow them up to fill the screen.
  const fit = useCallback((durationMs = 400) => {
    const graph = instance.current;
    if (!graph) return;
    graph.zoomToFit(durationMs, 50);
    if (graph.zoom() > MAX_ZOOM) graph.zoom(MAX_ZOOM, durationMs);
  }, []);

  // Push data in separately so filtering doesn't rebuild the whole graph.
  useEffect(() => {
    latestData.current = data;
    instance.current?.graphData(data);

    // Keep the view fitted while the force layout expands, then leave it to the user.
    const start = Date.now();
    const timer = setInterval(() => {
      fit(0);
      if (Date.now() - start > 5000) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, [data, fit]);

  useEffect(() => {
    highlighted.current = matches;
    instance.current?.nodeCanvasObject(paintNode);
  }, [matches, paintNode]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      instance.current
        ?.width(entry.contentRect.width)
        .height(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Canvas colours don't cascade, so re-read them whenever the theme flips.
  useEffect(() => {
    function refresh() {
      palette.current = readPalette();
      instance.current?.nodeCanvasObject(paintNode);
    }
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", refresh);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", refresh);
    };
  }, [paintNode]);

  function toggleKind(kind: NodeKind) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-sm text-muted">Your graph is empty.</p>
        <p className="max-w-sm text-xs text-faint">
          Add a problem, then write <code>[[Sliding Window]]</code> in its notes. Nodes and links
          appear here as you write.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the graph…"
          className="pointer-events-auto w-56 rounded-lg border border-border bg-surface/90 px-3 py-1.5 text-sm outline-none backdrop-blur focus:border-border-strong"
        />
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border bg-surface/90 p-0.5 backdrop-blur">
          {KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs capitalize transition-opacity ${
                hidden.has(kind) ? "opacity-35" : ""
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: `var(${KIND_VAR[kind]})` }}
              />
              {kind}s
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={fit}
          className="pointer-events-auto rounded-lg border border-border bg-surface/90 px-2.5 py-1.5 text-xs text-muted backdrop-blur transition-colors hover:text-text"
        >
          Fit
        </button>
      </div>

      <div ref={host} className="h-full w-full" />
    </div>
  );
}
