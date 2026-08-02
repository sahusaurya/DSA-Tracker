"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NodeKind } from "@/db/schema";

type Hit = { id: string; kind: NodeKind; title: string };

export function LinkPicker({ nodeId }: { nodeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      const res = await fetch(`/api/nodes?q=${encodeURIComponent(query)}`);
      if (res.ok) setHits((await res.json()).filter((h: Hit) => h.id !== nodeId));
    }, 150);
    return () => clearTimeout(id);
  }, [query, open, nodeId]);

  async function connect(dstId: string) {
    await fetch("/api/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ srcId: nodeId, dstId, kind: "manual" }),
    });
    setOpen(false);
    setQuery("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-text"
      >
        Link
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        ref={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Link to…"
        className="w-48 rounded-md border border-border-strong bg-bg px-2 py-1 text-xs outline-none"
      />
      {hits.length > 0 && (
        <ul className="absolute right-0 top-8 z-10 max-h-64 w-64 overflow-y-auto rounded-lg border border-border-strong bg-surface py-1 shadow-lg">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => connect(hit.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover"
              >
                <span className="truncate">{hit.title}</span>
                <span className="shrink-0 text-faint">{hit.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
