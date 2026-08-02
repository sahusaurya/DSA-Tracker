"use client";

import { useRouter } from "next/navigation";
import { IconTrash } from "./icons";

export function ListActions({ listId, name }: { listId: string; name: string }) {
  const router = useRouter();

  async function remove() {
    if (!confirm(`Delete the list "${name}"? The problems in it are kept.`)) return;

    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      className="rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-hard"
      aria-label="Delete list"
      title="Delete list"
    >
      <IconTrash />
    </button>
  );
}
