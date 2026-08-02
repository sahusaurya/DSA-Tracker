import JSZip from "jszip";
import { getEverything } from "@/db/queries";
import { blobStore } from "@/lib/storage";
import {
  attachmentPath,
  buildFrontmatter,
  toPortableLinks,
  type FileRef,
} from "@/lib/vault";

export async function GET() {
  const vault = await getEverything();
  const zip = new JSZip();

  const slugById = new Map(vault.nodes.map((node) => [node.id, node.slug]));
  const titleById = new Map(vault.nodes.map((node) => [node.id, node.title]));

  const filesById = new Map<string, FileRef>();
  for (const file of vault.files) {
    const nodeSlug = slugById.get(file.nodeId);
    if (nodeSlug) filesById.set(file.id, { id: file.id, nodeSlug, filename: file.filename });
  }

  const problemById = new Map(vault.problems.map((problem) => [problem.id, problem]));

  // Manual links are authored; wiki-links are re-derived from the note text on import.
  const manualLinks = new Map<string, string[]>();
  for (const edge of vault.edges) {
    if (edge.kind === "wikilink") continue;
    const target = titleById.get(edge.dstId);
    if (!target) continue;
    manualLinks.set(edge.srcId, [...(manualLinks.get(edge.srcId) ?? []), target]);
  }

  const listsByProblem = new Map<string, string[]>();
  const listNameById = new Map(vault.lists.map((list) => [list.id, list.name]));
  for (const item of vault.listItems) {
    const name = listNameById.get(item.listId);
    if (!name) continue;
    listsByProblem.set(item.problemId, [...(listsByProblem.get(item.problemId) ?? []), name]);
  }

  for (const node of vault.nodes) {
    const problem = problemById.get(node.id);
    const frontmatter = buildFrontmatter({
      title: node.title,
      kind: node.kind,
      url: problem?.url,
      source: problem?.source,
      difficulty: problem?.difficulty,
      status: problem?.status,
      reviewInterval: problem?.reviewInterval,
      nextReviewAt: problem?.nextReviewAt?.toISOString(),
      lists: listsByProblem.get(node.id) ?? [],
      links: manualLinks.get(node.id) ?? [],
    });

    zip.file(`notes/${node.slug}.md`, frontmatter + toPortableLinks(node.notes, filesById));
  }

  for (const file of vault.files) {
    const ref = filesById.get(file.id);
    if (!ref) continue;
    const bytes = await blobStore.read(file.storageKey).catch(() => null);
    if (bytes) zip.file(attachmentPath(ref.nodeSlug, ref.filename), bytes);
  }

  zip.file(
    "lists.json",
    JSON.stringify(
      vault.lists.map((list) => ({
        name: list.name,
        description: list.description,
        emoji: list.emoji,
        position: list.position,
      })),
      null,
      2,
    ),
  );

  const archive = await zip.generateAsync({ type: "arraybuffer" });
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dsa-notes-${stamp}.zip"`,
      "Content-Length": String(archive.byteLength),
    },
  });
}
