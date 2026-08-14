"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconTrash } from "./icons";

/**
 * The list's own header. The name is an input rather than a heading, so renaming a list works
 * the same way as renaming a problem or a topic — click it and type — instead of being the one
 * title in the app you can't change.
 */
export function ListHeader({
  listId,
  name,
  emoji,
  subtitle,
}: {
  listId: string;
  name: string;
  emoji: string | null;
  subtitle: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(name);
  const [, startTransition] = useTransition();

  async function rename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name); // an empty name is a slip, not an instruction
      return;
    }
    await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!confirm(`Delete the list "${name}"? The problems in it are kept.`)) return;
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {emoji && <span className="shrink-0 text-xl">{emoji}</span>}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(name);
                event.currentTarget.blur();
              }
            }}
            aria-label="List name"
            className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-xl font-semibold tracking-tight outline-none hover:bg-surface-hover focus:bg-surface-hover"
          />
        </div>
        <p className="mt-0.5 px-1 text-sm text-muted">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={remove}
        className="mt-1 shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-hard"
        aria-label="Delete list"
        title="Delete list"
      >
        <IconTrash />
      </button>
    </header>
  );
}
