"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconPlus } from "./icons";

export function AddProblem({ listId }: { listId?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);

    // Anything that isn't a URL is treated as a plain title.
    const looksLikeUrl = /^(https?:\/\/|[\w-]+\.[\w-]+)/i.test(trimmed);
    const res = await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [looksLikeUrl ? "url" : "title"]: trimmed,
        listId,
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not add that problem");
      return;
    }

    setValue("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-border-strong">
        <IconPlus className="h-4 w-4 text-faint" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a problem URL, or type a title"
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {value.trim() && (
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add"}
          </button>
        )}
      </div>
      {error && <p className="px-1 text-xs text-hard">{error}</p>}
    </form>
  );
}
