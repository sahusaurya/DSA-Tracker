"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DIFFICULTIES, STATUSES, type Difficulty, type Status } from "@/db/schema";
import { MAX_REVIEW_DAYS, describeDue } from "@/lib/review";
import { IconExternal, IconTrash } from "./icons";

const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  attempted: "Attempted",
  solved: "Solved",
};

export function ProblemMeta({
  id,
  title,
  url,
  source,
  difficulty,
  status,
  nextReviewAt,
  reviewDays,
}: {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  difficulty: Difficulty | null;
  status: Status;
  nextReviewAt: Date | null;
  /** The gap you last chose, so the box is ready with it next time. */
  reviewDays: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDays, setDraftDays] = useState(reviewDays > 0 ? String(reviewDays) : "");
  const due = describeDue(nextReviewAt);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/problems/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    startTransition(() => router.refresh());
  }

  async function review(body: { days: number } | { action: "reset" }) {
    await fetch(`/api/problems/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    startTransition(() => router.refresh());
  }

  async function schedule() {
    const days = Number(draftDays);
    if (!Number.isInteger(days) || days < 0 || days > MAX_REVIEW_DAYS) return;
    await review({ days });
  }

  async function remove() {
    if (!confirm(`Delete "${title}" and its notes? This cannot be undone.`)) return;
    const res = await fetch(`/api/problems/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={() => draftTitle !== title && patch({ title: draftTitle })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-xl font-semibold tracking-tight outline-none hover:bg-surface-hover focus:bg-surface-hover"
        />
        <button
          type="button"
          onClick={remove}
          className="mt-1 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-hard"
          aria-label="Delete problem"
          title="Delete problem"
        >
          <IconTrash />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        <select
          value={difficulty ?? ""}
          onChange={(e) => patch({ difficulty: e.target.value || null })}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs capitalize outline-none"
        >
          <option value="">No difficulty</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => patch({ status: e.target.value })}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted transition-colors hover:text-accent"
          >
            <IconExternal className="h-3.5 w-3.5" />
            {source ?? "Open"}
          </a>
        )}

        <div className="ml-auto flex items-center gap-2">
          {due && <span className="text-xs text-faint">{due}</span>}

          <div className="flex items-center rounded-md border border-border bg-surface">
            <input
              type="number"
              min={0}
              max={MAX_REVIEW_DAYS}
              value={draftDays}
              onChange={(e) => setDraftDays(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && schedule()}
              placeholder="7"
              aria-label="Review in how many days"
              className="w-12 bg-transparent py-1 pl-2 text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="py-1 text-xs text-faint">days</span>
            <button
              type="button"
              onClick={schedule}
              className="py-1 pr-2 pl-2 text-xs text-muted transition-colors hover:text-text"
            >
              Set review
            </button>
          </div>

          {nextReviewAt && (
            <button
              type="button"
              onClick={() => review({ action: "reset" })}
              className="rounded-md px-1.5 py-1 text-xs text-faint transition-colors hover:text-text"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
