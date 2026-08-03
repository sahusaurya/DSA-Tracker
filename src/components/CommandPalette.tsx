"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeKind } from "@/db/schema";
import { nodeHref } from "@/lib/nav";
import { IconSearch } from "./icons";

type Hit = { id: string; kind: NodeKind; title: string };

const KIND_DOT: Record<NodeKind, string> = {
  problem: "bg-accent",
  topic: "bg-medium",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/nodes?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        setHits(await res.json());
        setActive(0);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [query, open]);

  const go = useCallback(
    (hit: Hit) => {
      setOpen(false);
      setQuery("");
      router.push(nodeHref(hit.kind, hit.id));
    },
    [router],
  );

  if (!open) return null;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") return setOpen(false);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    }
    if (event.key === "Enter" && hits[active]) go(hits[active]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <IconSearch className="h-4 w-4 text-faint" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a problem or topic…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-faint">
            esc
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto py-1">
          {hits.map((hit, index) => (
            <li key={hit.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                  index === active ? "bg-surface-hover" : ""
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[hit.kind]}`} />
                <span className="flex-1 truncate">{hit.title}</span>
                <span className="shrink-0 text-xs text-faint">{hit.kind}</span>
              </button>
            </li>
          ))}
          {hits.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-faint">Nothing matches that.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
