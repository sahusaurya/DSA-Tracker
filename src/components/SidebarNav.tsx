"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setCookie } from "@/lib/cookies";
import { Backup } from "./Backup";
import {
  IconGraph,
  IconMoon,
  IconPlus,
  IconRepeat,
  IconSettings,
  IconStack,
  IconSun,
} from "./icons";

type ListEntry = {
  id: string;
  name: string;
  emoji: string | null;
  count: number;
};

const NAV = [
  { href: "/", label: "All problems", Icon: IconStack },
  { href: "/graph", label: "Graph", Icon: IconGraph },
  { href: "/review", label: "Review", Icon: IconRepeat },
];

export function SidebarNav({ lists }: { lists: ListEntry[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return closeForm();

    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    closeForm();
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/lists/${id}`);
      router.refresh();
    }
  }

  function closeForm() {
    setCreating(false);
    setName("");
  }

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-4 pt-5 pb-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          DSA Notes
        </Link>
      </div>

      <div className="flex flex-col gap-px px-2">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={rowClass(
              href === "/" ? pathname === "/" : pathname.startsWith(href),
            )}
          >
            <Icon />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-faint">Lists</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded p-0.5 text-faint transition-colors hover:bg-surface-hover hover:text-text"
          aria-label="New list"
        >
          <IconPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-px overflow-y-auto px-2 pb-2">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/lists/${list.id}`}
            className={rowClass(pathname === `/lists/${list.id}`)}
          >
            <span className="w-4 shrink-0 text-center text-xs">{list.emoji ?? "•"}</span>
            <span className="flex-1 truncate">{list.name}</span>
            <span className="text-xs tabular-nums text-faint">{list.count || ""}</span>
          </Link>
        ))}

        {creating && (
          <form onSubmit={submit} className="px-1 py-1">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => e.key === "Escape" && closeForm()}
              placeholder="List name"
              className="w-full rounded-md border border-border-strong bg-bg px-2 py-1 text-sm outline-none"
            />
          </form>
        )}

        {lists.length === 0 && !creating && (
          <p className="px-2 py-1 text-xs text-faint">No lists yet</p>
        )}
      </div>

      <Backup />
      <Link
        href="/settings"
        className={`mx-2 ${rowClass(pathname.startsWith("/settings"))}`}
      >
        <IconSettings />
        <span className="truncate">Settings</span>
      </Link>
      <ThemeToggle />
    </nav>
  );
}

function rowClass(active: boolean) {
  return [
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
    active
      ? "bg-accent-soft font-medium text-accent"
      : "text-muted hover:bg-surface-hover hover:text-text",
  ].join(" ");
}

/**
 * Which label shows is decided by CSS, not state — the server can't know the visitor's
 * system preference, and guessing it in an effect causes a flash of the wrong label.
 */
function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    root.dataset.theme = next;
    setCookie("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="m-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-text"
    >
      <span className="when-dark items-center gap-2">
        <IconSun />
        Light mode
      </span>
      <span className="when-light items-center gap-2">
        <IconMoon />
        Dark mode
      </span>
    </button>
  );
}
