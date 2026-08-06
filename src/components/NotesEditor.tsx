"use client";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { baseExtensions } from "./editor-setup";
import { compressPastedImage } from "@/lib/compress-image";
import { getCookie, setCookie } from "@/lib/cookies";
import { IMAGE_FORMAT_COOKIE, type ViewMode, parseImageFormat } from "@/lib/prefs";
import { MarkdownPreview, type WikiTargets } from "./MarkdownPreview";
import { wikilinkCompletion } from "./wikilink-complete";

type SaveState = "idle" | "pending" | "saved";
/** Where an attachment came from — pasted pixels, or a file the reader chose. */
type Origin = "paste" | "drop";

const MODES: ViewMode[] = ["edit", "split", "preview"];
const SAVE_DELAY = 800;
const PREVIEW_DELAY = 200;

export function NotesEditor({
  nodeId,
  initialNotes,
  initialMode,
  wikiTargets,
  placeholder = "Write your approach, complexity, edge cases… Type [[ to link.",
}: {
  nodeId: string;
  initialNotes: string;
  initialMode: ViewMode;
  wikiTargets?: WikiTargets;
  placeholder?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initialNotes);

  const router = useRouter();
  // Held in a ref so it can't become an effect dependency — that would tear down the editor.
  const refresh = useRef(router.refresh);
  useEffect(() => {
    refresh.current = router.refresh;
  }, [router]);

  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [previewText, setPreviewText] = useState(initialNotes);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploading, setUploading] = useState(0);

  function pickMode(next: ViewMode) {
    setMode(next);
    setCookie("notesView", next);
  }

  useEffect(() => {
    if (!host.current) return;

    function save(value: string) {
      saveTimer.current = null;
      void fetch(`/api/nodes/${nodeId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
        keepalive: true,
      }).then(() => setSaveState("saved"));
    }

    /** Uploads dropped/pasted files and writes markdown for them at the cursor. */
    async function attach(view: EditorView, fileList: FileList, origin: Origin) {
      const items = Array.from(fileList);
      if (items.length === 0) return;

      setUploading((n) => n + items.length);
      try {
        for (const original of items) {
          // Pasted screenshots get shrunk; a file chosen from disk is kept as it is.
          // Read per paste, so changing the setting takes effect without a reload.
          const file =
            origin === "paste"
              ? await compressPastedImage(original, parseImageFormat(getCookie(IMAGE_FORMAT_COOKIE)))
              : original;

          const form = new FormData();
          form.append("file", file);
          const res = await fetch(`/api/nodes/${nodeId}/files`, {
            method: "POST",
            body: form,
          });
          if (!res.ok) continue;

          const { id, filename, mimeType } = await res.json();
          const label = filename.replace(/[[\]]/g, "");
          const snippet = `${mimeType?.startsWith("image/") ? "!" : ""}[${label}](/api/files/${id})`;
          const at = view.state.selection.main.head;
          view.dispatch({
            changes: { from: at, insert: snippet },
            selection: { anchor: at + snippet.length },
          });
        }
      } finally {
        setUploading((n) => n - items.length);
        refresh.current();
      }
    }

    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: latest.current,
        extensions: [
          ...baseExtensions(placeholder),
          wikilinkCompletion(() => refresh.current()),
          EditorView.domEventHandlers({
            paste(event, view) {
              const files = event.clipboardData?.files;
              if (!files?.length) return false;
              event.preventDefault();
              void attach(view, files, "paste");
              return true;
            },
            drop(event, view) {
              const files = event.dataTransfer?.files;
              if (!files?.length) return false;
              event.preventDefault();
              void attach(view, files, "drop");
              return true;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const value = update.state.doc.toString();
            latest.current = value;

            setSaveState("pending");
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => save(value), SAVE_DELAY);

            if (previewTimer.current) clearTimeout(previewTimer.current);
            previewTimer.current = setTimeout(() => setPreviewText(value), PREVIEW_DELAY);
          }),
        ],
      }),
    });

    // Don't lose the last keystrokes when navigating away mid-debounce.
    function flush() {
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      save(latest.current);
    }
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
      if (previewTimer.current) clearTimeout(previewTimer.current);
      editor.destroy();
    };
  }, [nodeId, placeholder]);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMode(m)}
              className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                mode === m ? "bg-accent-soft text-accent" : "text-muted hover:text-text"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-xs text-faint">
          {uploading > 0
            ? `Uploading ${uploading} file${uploading > 1 ? "s" : ""}…`
            : saveState === "pending"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : ""}
        </span>
      </div>

      <div
        className={`min-h-96 rounded-lg border border-border bg-surface ${
          mode === "split" ? "grid grid-cols-2 divide-x divide-border" : ""
        }`}
      >
        {/* Kept mounted in every mode so the editor never loses its state. */}
        <div className={`px-4 py-3 ${mode === "preview" ? "hidden" : ""}`} ref={host} />
        {mode !== "edit" && (
          <div className="px-4 py-3">
            <MarkdownPreview source={previewText} wikiTargets={wikiTargets} />
          </div>
        )}
      </div>
    </section>
  );
}
