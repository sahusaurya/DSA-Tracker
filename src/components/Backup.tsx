"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function Backup() {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function importVault(file: File | undefined) {
    if (!file) return;
    if (!confirm(`Import "${file.name}"? Notes with matching names will be overwritten.`)) return;

    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: form });
    setBusy(false);
    if (picker.current) picker.current.value = "";

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Import failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 px-2 pb-1 text-xs text-faint">
      <a href="/api/export" className="rounded px-1.5 py-1 transition-colors hover:text-text">
        Export
      </a>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => picker.current?.click()}
        disabled={busy}
        className="rounded px-1.5 py-1 transition-colors hover:text-text disabled:opacity-50"
      >
        {busy ? "Importing…" : "Import"}
      </button>
      <input
        ref={picker}
        type="file"
        accept=".zip"
        hidden
        onChange={(e) => importVault(e.target.files?.[0])}
      />
    </div>
  );
}
