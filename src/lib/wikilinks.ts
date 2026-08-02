/** Matches [[Target]] and [[Target|shown text]]. */
export const WIKILINK_PATTERN = /\[\[([^\]\n|]+?)(?:\|([^\]\n]+?))?\]\]/g;

/** Links inside code are examples, not references. */
function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

export function parseWikilinks(markdown: string): string[] {
  const seen = new Set<string>();
  for (const match of stripCode(markdown).matchAll(WIKILINK_PATTERN)) {
    const target = match[1].trim();
    if (target) seen.add(target);
  }
  return [...seen];
}
