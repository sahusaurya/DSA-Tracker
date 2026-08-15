"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { setCookie } from "@/lib/cookies";
import {
  SIDEBAR_COLLAPSED_COOKIE,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH_COOKIE,
} from "@/lib/prefs";
import { Backup } from "./Backup";
import {
  IconGraph,
  IconMoon,
  IconPlus,
  IconRepeat,
  IconSettings,
  IconSidebar,
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

export function SidebarNav({
  lists,
  initialWidth,
  initialCollapsed,
}: {
  lists: ListEntry[];
  initialWidth: number;
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // Collapsed but hovered: shown floating over the page, without giving the space back.
  const [peeking, setPeeking] = useState(false);
  const dragging = useRef(false);

  // Kept pure. Writing the cookie inside the updater meant the side effect rode along with
  // React's development double-invocation, and the two toggles cancelled out.
  const toggleCollapsed = useCallback(() => {
    // Both in the handler, so they batch — a peek left open would otherwise keep the
    // sidebar on screen after collapsing it.
    setPeeking(false);
    setCollapsed((wasCollapsed) => !wasCollapsed);
  }, []);

  useEffect(() => {
    setCookie(SIDEBAR_COLLAPSED_COOKIE, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // The same shortcut every editor uses for this.
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  // Drag on the window rather than the handle, so a fast drag can't outrun the 4px target.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      event.preventDefault();
      setWidth(
        Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(event.clientX))),
      );
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist once at the end, not on every pixel of the drag.
      setWidth((current) => {
        setCookie(SIDEBAR_WIDTH_COOKIE, String(current));
        return current;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function startDrag(event: React.PointerEvent) {
    event.preventDefault();
    dragging.current = true;
    // Keep the resize cursor while the pointer is anywhere on screen mid-drag.
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const showing = !collapsed || peeking;

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
    <>
      {/* Collapsed: a thin strip along the edge that peeks the sidebar back on hover. */}
      {collapsed && (
        <div
          className="absolute inset-y-0 left-0 z-30 w-2"
          onPointerEnter={() => setPeeking(true)}
          aria-hidden
        />
      )}

      {/* Holds the layout column open. Zero-width when collapsed, so the page reclaims it. */}
      <div
        className="relative h-full shrink-0"
        style={{
          width: collapsed ? 0 : width,
          transition: dragging.current ? "none" : "width 150ms ease",
        }}
        onPointerLeave={() => setPeeking(false)}
      >
        <nav
          className={`absolute inset-y-0 left-0 flex h-full flex-col border-r border-border bg-surface ${
            showing ? "" : "pointer-events-none"
          } ${peeking ? "z-40 shadow-2xl" : ""}`}
          style={{
            width,
            transform: showing ? "translateX(0)" : `translateX(-${width}px)`,
            transition: dragging.current ? "none" : "transform 150ms ease",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-5 pb-3">
            <Link href="/" className="truncate text-sm font-semibold tracking-tight">
              DSA Tracker
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="shrink-0 rounded p-1 text-faint transition-colors hover:bg-surface-hover hover:text-text"
              aria-label="Hide sidebar"
              title="Hide sidebar (⌘\)"
            >
              <IconSidebar className="h-4 w-4" />
            </button>
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

          {/* Wider than it looks: a 1px border is not a pointer target. */}
          <div
            onPointerDown={startDrag}
            onDoubleClick={() => {
              setWidth(SIDEBAR_DEFAULT_WIDTH);
              setCookie(SIDEBAR_WIDTH_COOKIE, String(SIDEBAR_DEFAULT_WIDTH));
            }}
            className="absolute inset-y-0 -right-1 w-2 cursor-col-resize hover:bg-accent/30"
            role="separator"
            aria-label="Resize sidebar"
            title="Drag to resize · double-click to reset"
          />
        </nav>
      </div>

      {/* Collapsed: the only way back, since the toggle went with the sidebar. */}
      {collapsed && !peeking && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute top-4 left-3 z-30 rounded-md border border-border bg-surface/90 p-1.5 text-faint backdrop-blur transition-colors hover:text-text"
          aria-label="Show sidebar"
          title="Show sidebar (⌘\)"
        >
          <IconSidebar className="h-4 w-4" />
        </button>
      )}
    </>
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
