import "server-only";

/**
 * The export format is a plain folder of markdown files with YAML frontmatter,
 * wiki-links left intact, plus the attachments they reference. It opens as an
 * Obsidian vault as-is, which is what makes it a real backup rather than a dump.
 */

const FILE_URL = /\/api\/files\/([0-9a-f-]{36})/g;

export type FileRef = { id: string; nodeSlug: string; filename: string };

export function attachmentPath(nodeSlug: string, filename: string) {
  return `attachments/${nodeSlug}/${filename}`;
}

/** `/api/files/<id>` → `attachments/<slug>/<name>`, so the export is self-contained. */
export function toPortableLinks(markdown: string, byId: Map<string, FileRef>) {
  return markdown.replace(FILE_URL, (whole, id: string) => {
    const ref = byId.get(id);
    return ref ? attachmentPath(ref.nodeSlug, ref.filename) : whole;
  });
}

/** The reverse, run after import has created new file ids. */
export function toLiveLinks(markdown: string, byPath: Map<string, string>) {
  return markdown.replace(/attachments\/([^)\s]+)/g, (whole, path: string) => {
    const id = byPath.get(`attachments/${decodeURIComponent(path)}`);
    return id ? `/api/files/${id}` : whole;
  });
}

export function buildFrontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length ? `${key}:\n${value.map((v) => `  - ${quote(String(v))}`).join("\n")}` : null;
      }
      return `${key}: ${quote(String(value))}`;
    })
    .filter((line) => line !== null);

  return `---\n${lines.join("\n")}\n---\n\n`;
}

function quote(value: string) {
  return /^[\w./: -]+$/.test(value) && !value.includes(": ") ? value : JSON.stringify(value);
}
