"use client";

import { useState } from "react";
import { setCookie } from "@/lib/cookies";
import { IMAGE_FORMAT_COOKIE, type ImageFormat } from "@/lib/prefs";

const OPTIONS: { value: ImageFormat; title: string; blurb: string; note: string }[] = [
  {
    value: "webp",
    title: "WebP",
    blurb: "Re-encoded before upload. A screenshot typically drops by around 90%.",
    note: "Slightly lossy, and fine for screenshots and diagrams.",
  },
  {
    value: "png",
    title: "PNG",
    blurb: "Stored exactly as pasted, pixel for pixel.",
    note: "Lossless, and often ten times the size.",
  },
];

export function ImageFormatSetting({ initial }: { initial: ImageFormat }) {
  const [format, setFormat] = useState<ImageFormat>(initial);
  const [saved, setSaved] = useState(false);

  function choose(next: ImageFormat) {
    setFormat(next);
    setCookie(IMAGE_FORMAT_COOKIE, next);
    setSaved(true);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-medium">Pasted images</h2>
          <p className="mt-0.5 text-xs text-muted">
            Applies to images pasted into the editor. Files you drag in or pick from disk are
            always kept exactly as they are.
          </p>
        </div>
        {saved && <span className="shrink-0 text-xs text-faint">Saved</span>}
      </div>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => {
          const active = format === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              aria-pressed={active}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <span
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  active ? "border-accent" : "border-border-strong"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm ${active ? "text-accent" : ""}`}>
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{option.blurb}</span>
                <span className="mt-0.5 block text-xs text-faint">{option.note}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-faint">
        Changing this affects images pasted from now on. Anything already in your notes stays
        as it was stored.
      </p>
    </section>
  );
}
