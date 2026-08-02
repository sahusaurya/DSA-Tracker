"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconPlus, IconTrash } from "./icons";

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

export function FileStrip({ nodeId, files }: { nodeId: string; files: Attachment[] }) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      await fetch(`/api/nodes/${nodeId}/files`, { method: "POST", body: form });
    }
    setBusy(false);
    if (picker.current) picker.current.value = "";
    router.refresh();
  }

  async function remove(file: Attachment) {
    if (!confirm(`Remove "${file.filename}"?`)) return;
    await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">
          Attachments
        </h2>
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={busy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
        >
          <IconPlus className="h-3.5 w-3.5" />
          {busy ? "Uploading…" : "Add"}
        </button>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-faint">
          Paste or drag an image straight into your notes, or add a file here.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-surface"
            >
              <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" className="block">
                {file.mimeType.startsWith("image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/files/${file.id}`}
                    alt={file.filename}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-faint">
                    {file.filename.split(".").pop()?.toUpperCase() ?? "FILE"}
                  </div>
                )}
                <span className="block truncate border-t border-border px-2 py-1 text-xs text-muted">
                  {file.filename}
                </span>
              </a>
              <button
                type="button"
                onClick={() => remove(file)}
                className="absolute right-1 top-1 rounded-md bg-surface/90 p-1 text-faint opacity-0 transition-opacity hover:text-hard group-hover:opacity-100"
                aria-label={`Remove ${file.filename}`}
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
