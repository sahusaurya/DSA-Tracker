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
};

const KINDS: NodeKind[] = ["problem", "topic"];
const LABEL_ZOOM = 0.9;
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
  const detachPointer = useRef<(() => void) | null>(null);
  // The graph is created asynchronously, so the latest data must be readable on arrival.
  const latestData = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });

  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<NodeKind>>(new Set());

  useEffect(() => {
    navigate.current = router.push;
  }, [router]);

  // Every node and link, always. Filtering dims rather than removes, so the layout the
  // reader has built a mental picture of stays put — and degree, hence node size, with it.
  const data = useMemo(() => {
    const degree = new Map<string, number>();
    for (const link of links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }

    return {
      nodes: nodes.map((node) => ({ ...node, degree: degree.get(node.id) ?? 0 })),
      links: links.map((link) => ({ ...link })),
    };
  }, [nodes, links]);

  /** What stays lit: the kind is showing, and the search term matches. `null` means all of it. */
  const highlightedIds = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (hidden.size === 0 && !term) return null;

    return new Set(
      data.nodes
        .filter(
          (node) =>
            !hidden.has(node.kind) && (!term || node.title.toLowerCase().includes(term)),
        )
        .map((node) => node.id),
    );
  }, [query, hidden, data.nodes]);

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

  /**
   * Hit-testing is done here rather than through force-graph's own pointer layer,
   * which reads back pixels from an offscreen canvas and silently detects nothing on
   * some setups — leaving nodes that look clickable but aren't. Comparing distances
   * against the same radius the painter uses keeps the target exactly the drawn circle.
   */
  const nodeAt = useCallback((clientX: number, clientY: number): GraphNode | null => {
    const graph = instance.current;
    const element = host.current;
    if (!graph || !element) return null;

    const box = element.getBoundingClientRect();
    const point = graph.screen2GraphCoords(clientX - box.left, clientY - box.top);

    let closest: GraphNode | null = null;
    let closestDistance = Infinity;
    for (const node of latestData.current.nodes) {
      const distance = Math.hypot((node.x ?? 0) - point.x, (node.y ?? 0) - point.y);
      if (distance <= nodeRadius(node) + 3 && distance < closestDistance) {
        closest = node;
        closestDistance = distance;
      }
    }
    return closest;
  }, []);

  const attachPointer = useCallback(
    (element: HTMLDivElement) => {
      // A pan or a node drag also ends in a click, so only a press that stayed put counts.
      let pressedAt: { x: number; y: number } | null = null;

      const onPointerDown = (event: PointerEvent) => {
        pressedAt = { x: event.clientX, y: event.clientY };
      };
      const onClick = (event: MouseEvent) => {
        // Only a press we actually saw travel counts as a drag; if the press never
        // reached us, treat it as a plain click rather than swallowing it.
        const dragged =
          pressedAt !== null &&
          Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 4;
        pressedAt = null;
        if (dragged) return;

        const node = nodeAt(event.clientX, event.clientY);
        if (node) navigate.current(nodeHref(node.kind, node.id));
      };
      const onMove = (event: MouseEvent) => {
        element.style.cursor = nodeAt(event.clientX, event.clientY) ? "pointer" : "";
      };
      const onLeave = () => {
        element.style.cursor = "";
      };

      // Capture phase: the zoom/drag behaviour on the canvas below stops these events
      // from bubbling, so a listener waiting on the way up never hears the press.
      const capture = { capture: true } as const;
      element.addEventListener("pointerdown", onPointerDown, capture);
      element.addEventListener("click", onClick, capture);
      element.addEventListener("mousemove", onMove, capture);
      element.addEventListener("mouseleave", onLeave);

      return () => {
        element.removeEventListener("pointerdown", onPointerDown, capture);
        element.removeEventListener("click", onClick, capture);
        element.removeEventListener("mousemove", onMove, capture);
        element.removeEventListener("mouseleave", onLeave);
        element.style.cursor = "";
      };
    },
    [nodeAt],
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
        // Pressing a node would otherwise begin a drag gesture, and the drag behaviour
        // cancels the click that follows it — so the node could never be opened.
        // Nodes here are for navigating, not rearranging.
        .enableNodeDrag(false)
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
        });

      graph.onEngineStop(() => graph?.zoomToFit(400, 60));
      graph.d3Force("charge")?.strength(-220).distanceMax(500);
      graph.d3Force("link")?.distance(70);

      const box = host.current.getBoundingClientRect();
      graph.width(box.width).height(box.height);
      graph.graphData(latestData.current);

      instance.current = graph;
      detachPointer.current = attachPointer(host.current);
    })();

    return () => {
      cancelled = true;
      detachPointer.current?.();
      detachPointer.current = null;
      graph?._destructor();
      instance.current = null;
    };
  }, [paintNode, attachPointer]);

  const fit = useCallback(() => instance.current?.zoomToFit(400, 50), []);

  // Push data in separately so filtering doesn't rebuild the whole graph.
  useEffect(() => {
    latestData.current = data;
    instance.current?.graphData(data);

    // Keep the view fitted while the force layout expands, then leave it to the user.
    const start = Date.now();
    const timer = setInterval(() => {
      instance.current?.zoomToFit(0, 50);
      if (Date.now() - start > 5000) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, [data]);

  useEffect(() => {
    highlighted.current = highlightedIds;
    instance.current?.nodeCanvasObject(paintNode);
  }, [highlightedIds, paintNode]);

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
