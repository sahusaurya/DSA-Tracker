import matter from "gray-matter";
import JSZip from "jszip";
import {
  addEdge,
  createList,
  createNode,
  findListByName,
  findNodeBySlug,
  addProblemToList,
  recordFile,
  renameNode,
  setProblemFields,
  updateNotes,
} from "@/db/queries";
import {
  DIFFICULTIES,
  STATUSES,
  NODE_KINDS,
  type Difficulty,
  type NodeKind,
  type Status,
} from "@/db/schema";
import { jsonError } from "@/lib/api";
import { blobStore } from "@/lib/storage";
import { slugify } from "@/lib/text";
import { toLiveLinks } from "@/lib/vault";

type Parsed = {
  slug: string;
  title: string;
  kind: NodeKind;
  body: string;
  data: Record<string, unknown>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const upload = form?.get("file");
  if (!(upload instanceof File)) return jsonError("Expected a .zip upload");

  const zip = await JSZip.loadAsync(await upload.arrayBuffer()).catch(() => null);
  if (!zip) return jsonError("That file isn't a readable zip");

  // 1. Read every note first, so links can be resolved once all nodes exist.
  const notes: Parsed[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.startsWith("notes/") || !path.endsWith(".md")) continue;

    const { data, content } = matter(await entry.async("string"));
    const slug = path.slice("notes/".length, -".md".length);
    const kind = asString(data.kind);

    notes.push({
      slug,
      title: asString(data.title) ?? slug,
      kind: NODE_KINDS.includes(kind as NodeKind) ? (kind as NodeKind) : "problem",
      body: content.trimStart(),
      data,
    });
  }

  // 2. Create or match every node, so wiki-links and manual links can resolve.
  const idBySlug = new Map<string, string>();
  for (const note of notes) {
    const existing = findNodeBySlug(note.slug);
    if (existing) {
      renameNode(existing.id, note.title);
      idBySlug.set(note.slug, existing.id);
    } else {
      idBySlug.set(note.slug, createNode(note.kind, note.title));
    }
  }

  // 3. Restore attachments and remember where each one landed.
  const fileIdByPath = new Map<string, string>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.startsWith("attachments/")) continue;

    const [, nodeSlug, ...rest] = path.split("/");
    const filename = rest.join("/");
    const nodeId = idBySlug.get(nodeSlug);
    if (!nodeId || !filename) continue;

    const bytes = Buffer.from(await entry.async("uint8array"));
    const storageKey = await blobStore.put(nodeId, filename, bytes);
    const id = recordFile({
      nodeId,
      filename,
      mimeType: guessType(filename),
      size: bytes.byteLength,
      storageKey,
    });
    fileIdByPath.set(path, id);
  }

  // 4. Write notes (which also re-derives wiki-link edges) and problem metadata.
  for (const note of notes) {
    const id = idBySlug.get(note.slug)!;
    updateNotes(id, toLiveLinks(note.body, fileIdByPath));

    if (note.kind === "problem") {
      const difficulty = asString(note.data.difficulty);
      const status = asString(note.data.status);
      const nextReviewAt = asString(note.data.nextReviewAt);

      setProblemFields(id, {
        url: asString(note.data.url) ?? null,
        source: asString(note.data.source) ?? null,
        difficulty: DIFFICULTIES.includes(difficulty as Difficulty)
          ? (difficulty as Difficulty)
          : null,
        status: STATUSES.includes(status as Status) ? (status as Status) : "todo",
        reviewInterval: Number(note.data.reviewInterval) || 0,
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : null,
      });
    }
  }

  // 5. Lists, then membership and manual links.
  const listsFile = zip.file("lists.json");
  if (listsFile) {
    const parsed = JSON.parse(await listsFile.async("string")) as {
      name?: string;
      description?: string | null;
      emoji?: string | null;
    }[];
    for (const list of parsed) {
      if (list.name && !findListByName(list.name)) {
        createList({ name: list.name, description: list.description, emoji: list.emoji });
      }
    }
  }

  for (const note of notes) {
    const id = idBySlug.get(note.slug)!;

    for (const listName of asList(note.data.lists)) {
      const list = findListByName(listName) ?? { id: createList({ name: listName }) };
      addProblemToList(list.id, id);
    }
    for (const target of asList(note.data.links)) {
      const targetId = idBySlug.get(slugify(target)) ?? findNodeBySlug(slugify(target))?.id;
      if (targetId) addEdge(id, targetId, "manual");
    }
  }

  return Response.json({ ok: true, notes: notes.length, files: fileIdByPath.size });
}

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
};

function guessType(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? "application/octet-stream";
}
