import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";

type NodeHit = { id: string; kind: string; title: string; slug: string };

const KIND_LABEL: Record<string, string> = {
  problem: "problem",
  topic: "topic",
  bundle: "bundle",
};

async function createNode(kind: "topic" | "bundle", title: string) {
  await fetch("/api/nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, title }),
  });
}

/** Completes `[[…` against existing nodes, and offers to create one that doesn't exist. */
export function wikilinkCompletion(onCreated: () => void) {
  return autocompletion({
    override: [
      async (context: CompletionContext): Promise<CompletionResult | null> => {
        const match = context.matchBefore(/\[\[([^\]\n|]*)$/);
        if (!match || (match.from === match.to && !context.explicit)) return null;

        const typed = match.text.slice(2).trim();

        const res = await fetch(`/api/nodes?q=${encodeURIComponent(typed)}`);
        if (!res.ok) return null;
        const hits: NodeHit[] = await res.json();

        const options: Completion[] = hits.map((hit) => ({
          label: hit.title,
          detail: KIND_LABEL[hit.kind] ?? hit.kind,
          type: "text",
          apply: `${hit.title}]]`,
        }));

        const exact = hits.some((h) => h.title.toLowerCase() === typed.toLowerCase());
        if (typed && !exact) {
          for (const kind of ["topic", "bundle"] as const) {
            options.push({
              label: `${typed}`,
              displayLabel: `Create ${kind} "${typed}"`,
              detail: `new ${kind}`,
              type: "keyword",
              apply: (view, _completion, from, to) => {
                view.dispatch({
                  changes: { from, to, insert: `${typed}]]` },
                  selection: { anchor: from + typed.length + 2 },
                });
                void createNode(kind, typed).then(onCreated);
              },
            });
          }
        }

        return { from: match.from + 2, options, validFor: /^[^\]\n|]*$/ };
      },
    ],
  });
}
