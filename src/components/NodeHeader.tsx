"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NodeKind } from "@/db/schema";
import { IconTrash } from "./icons";

export function NodeHeader({
  id,
  title,
  kind,
}: {
  id: string;
  title: string;
  kind: NodeKind;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(title);

  async function rename() {
    if (draft === title) return;
    await fetch(`/api/nodes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft }),
    });
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete the ${kind} "${title}"? Its notes and links go with it.`)) return;
    const res = await fetch(`/api/nodes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/graph");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[11px] font-medium uppercase tracking-wider text-faint">
        {kind}
      </span>
      <div className="flex items-start gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-xl font-semibold tracking-tight outline-none hover:bg-surface-hover focus:bg-surface-hover"
        />
        <button
          type="button"
          onClick={remove}
          className="mt-1 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-hard"
          aria-label={`Delete ${kind}`}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}
