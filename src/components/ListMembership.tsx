"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconX } from "./icons";

export type ListChip = { id: string; name: string; emoji: string | null };

function label(list: ListChip) {
  return list.emoji ? `${list.emoji} ${list.name}` : list.name;
}

/**
 * List membership lives in its own table, not in the graph, so it can't be undone from
 * Connections — removing a wiki-link there leaves the problem sitting in the list.
 * This is the one place membership is added and taken away.
 */
export function ListMembership({
  problemId,
  memberships,
  allLists,
}: {
  problemId: string;
  memberships: ListChip[];
  allLists: ListChip[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [, startTransition] = useTransition();

  const joined = new Set(memberships.map((list) => list.id));
  const available = allLists.filter((list) => !joined.has(list.id));

  async function change(listId: string, method: "POST" | "DELETE") {
    setBusy(listId);
    await fetch(`/api/lists/${listId}/problems`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId }),
    });
    setBusy(null);
    setPicking(false);
    startTransition(() => router.refresh());
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">Lists</h2>

        {available.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPicking((open) => !open)}
              className="rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              Add to list
            </button>

            {picking && (
              <ul className="absolute right-0 top-7 z-10 max-h-64 w-56 overflow-y-auto rounded-lg border border-border-strong bg-surface py-1 shadow-lg">
                {available.map((list) => (
                  <li key={list.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => change(list.id, "POST")}
                      className="w-full truncate px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover"
                    >
                      {label(list)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {memberships.length === 0 ? (
        <p className="text-xs text-faint">Not in any list yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {memberships.map((list) => (
            <li
              key={list.id}
              className={`flex items-center rounded-md border border-border bg-surface text-xs transition-colors hover:border-border-strong ${
                busy === list.id ? "opacity-50" : ""
              }`}
            >
              <a
                href={`/lists/${list.id}`}
                className="truncate py-1 pl-2 pr-1 text-muted transition-colors hover:text-text"
              >
                {label(list)}
              </a>
              <button
                type="button"
                onClick={() => change(list.id, "DELETE")}
                disabled={busy === list.id}
                className="py-1 pr-1.5 pl-0.5 text-faint transition-colors hover:text-hard"
                aria-label={`Remove from ${list.name}`}
                title={`Remove from ${list.name} — the problem itself is kept`}
              >
                <IconX className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
