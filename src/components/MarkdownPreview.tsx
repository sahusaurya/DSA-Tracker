"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { NodeKind } from "@/db/schema";
import { nodeHref } from "@/lib/nav";
import { slugify } from "@/lib/text";
import { WIKILINK_PATTERN } from "@/lib/wikilinks";

export type WikiTargets = Record<string, { id: string; kind: NodeKind; title: string }>;

// A relative path, not a custom scheme: react-markdown strips unknown schemes to "".
const WIKI_PREFIX = "/__wiki__/";

/** Rewrites [[Target|label]] into a markdown link so react-markdown can render it. */
function expandWikilinks(markdown: string): string {
  return markdown.replace(WIKILINK_PATTERN, (_full, target: string, label?: string) => {
    const name = target.trim();
    const shown = (label ?? name).trim();
    return `[${shown}](${WIKI_PREFIX}${encodeURIComponent(name)})`;
  });
}

export function MarkdownPreview({
  source,
  wikiTargets = {},
}: {
  source: string;
  wikiTargets?: WikiTargets;
}) {
  const router = useRouter();

  if (!source.trim()) {
    return <p className="text-sm text-faint">Nothing written yet.</p>;
  }

  async function createMissing(name: string) {
    const res = await fetch("/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "topic", title: name }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="prose-notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        // A malformed formula shows in red where it sits instead of blanking the note.
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }], rehypeHighlight]}
        components={{
          a({ href, children, ...rest }) {
            if (!href?.startsWith(WIKI_PREFIX)) {
              return (
                <a href={href} target="_blank" rel="noreferrer" {...rest}>
                  {children}
                </a>
              );
            }

            const name = decodeURIComponent(href.slice(WIKI_PREFIX.length));
            const target = wikiTargets[slugify(name)];

            if (!target) {
              return (
                <button
                  type="button"
                  onClick={() => createMissing(name)}
                  className="cursor-pointer border-b border-dashed border-faint text-faint"
                  title={`"${name}" doesn't exist yet — click to create it as a topic`}
                >
                  {children}
                </button>
              );
            }

            return <Link href={nodeHref(target.kind, target.id)}>{children}</Link>;
          },
        }}
      >
        {expandWikilinks(source)}
      </ReactMarkdown>
    </div>
  );
}
