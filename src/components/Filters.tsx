"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DIFFICULTIES, STATUSES } from "@/db/schema";

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  attempted: "Attempted",
  solved: "Solved",
};

export function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(next.size ? `${pathname}?${next}` : pathname);
  }

  const difficulty = params.get("difficulty");
  const status = params.get("status");
  const query = params.get("q") ?? "";
  const active = difficulty || status || query;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        defaultValue={query}
        onChange={(e) => set("q", e.target.value || null)}
        placeholder="Filter by title or note text…"
        className="min-w-48 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-border-strong"
      />

      <Group
        value={difficulty}
        options={DIFFICULTIES}
        onPick={(v) => set("difficulty", v)}
        allLabel="Any level"
      />
      <Group
        value={status}
        options={STATUSES}
        onPick={(v) => set("status", v)}
        allLabel="Any status"
        label={(v) => STATUS_LABEL[v] ?? v}
      />

      {active && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="rounded-md px-1.5 py-1 text-xs text-faint transition-colors hover:text-text"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function Group<T extends string>({
  value,
  options,
  onPick,
  allLabel,
  label = (v: T) => v,
}: {
  value: string | null;
  options: readonly T[];
  onPick: (value: string | null) => void;
  allLabel: string;
  label?: (value: T) => string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onPick(e.target.value || null)}
      className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs capitalize outline-none"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {label(option)}
        </option>
      ))}
    </select>
  );
}
