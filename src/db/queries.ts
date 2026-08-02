import "server-only";

import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { and, asc, desc, eq, inArray, like, lte, or, sql } from "drizzle-orm";
import { db } from "./client";
import {
  type Difficulty,
  type EdgeKind,
  type NodeKind,
  type Status,
  edges,
  files,
  listItems,
  lists,
  nodes,
  problems,
} from "./schema";
import { nextReview } from "@/lib/review";
import { slugify } from "@/lib/text";
import { parseWikilinks } from "@/lib/wikilinks";

export const newId = () => randomUUID();

/** Reads run through this so synchronous SQLite queries never execute during prerender. */
async function ready() {
  await connection();
}

function uniqueSlug(base: string, excludeId?: string): string {
  const root = slugify(base) || "untitled";
  let candidate = root;
  for (let n = 2; ; n += 1) {
    const taken = db
      .select({ id: nodes.id })
      .from(nodes)
      .where(eq(nodes.slug, candidate))
      .get();
    if (!taken || taken.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
  }
}

export function createNode(kind: NodeKind, title: string, notes = "") {
  const id = newId();
  const now = new Date();
  db.insert(nodes)
    .values({
      id,
      kind,
      title: title.trim() || "Untitled",
      slug: uniqueSlug(title),
      notes,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

/* ---------------------------------- lists --------------------------------- */

export async function getLists() {
  await ready();
  return db
    .select({
      id: lists.id,
      name: lists.name,
      description: lists.description,
      emoji: lists.emoji,
      position: lists.position,
      count: sql<number>`(select count(*) from ${listItems} where ${listItems.listId} = ${lists.id})`,
    })
    .from(lists)
    .orderBy(asc(lists.position), asc(lists.createdAt))
    .all();
}

export async function getList(id: string) {
  await ready();
  return db.select().from(lists).where(eq(lists.id, id)).get() ?? null;
}

export function createList(input: {
  name: string;
  description?: string | null;
  emoji?: string | null;
}) {
  const id = newId();
  const max = db.select({ v: sql<number>`coalesce(max(${lists.position}), -1)` }).from(lists).get();
  db.insert(lists)
    .values({
      id,
      name: input.name.trim() || "Untitled list",
      description: input.description ?? null,
      emoji: input.emoji ?? null,
      position: (max?.v ?? -1) + 1,
      createdAt: new Date(),
    })
    .run();
  return id;
}

export function updateList(
  id: string,
  patch: Partial<{ name: string; description: string | null; emoji: string | null; position: number }>,
) {
  if (Object.keys(patch).length === 0) return;
  db.update(lists).set(patch).where(eq(lists.id, id)).run();
}

export function deleteList(id: string) {
  db.delete(lists).where(eq(lists.id, id)).run();
}

/* -------------------------------- problems -------------------------------- */

export type ProblemSummary = {
  id: string;
  title: string;
  slug: string;
  url: string | null;
  source: string | null;
  difficulty: Difficulty | null;
  status: Status;
  updatedAt: Date;
  nextReviewAt: Date | null;
  topics: { id: string; title: string; slug: string }[];
};

export type ProblemFilters = {
  listId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  status?: Status;
  q?: string;
};

export async function getProblems(filters: ProblemFilters = {}): Promise<ProblemSummary[]> {
  await ready();

  const conditions = [];
  if (filters.difficulty) conditions.push(eq(problems.difficulty, filters.difficulty));
  if (filters.status) conditions.push(eq(problems.status, filters.status));
  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(or(like(nodes.title, term), like(nodes.notes, term)));
  }
  if (filters.listId) {
    conditions.push(
      sql`exists (select 1 from ${listItems} where ${listItems.problemId} = ${problems.id} and ${listItems.listId} = ${filters.listId})`,
    );
  }
  if (filters.topicId) {
    conditions.push(
      sql`exists (select 1 from ${edges} where ${edges.srcId} = ${problems.id} and ${edges.dstId} = ${filters.topicId})`,
    );
  }

  // Inside a list, respect the manual ordering; elsewhere show most recently touched first.
  const order = filters.listId
    ? [
        asc(
          sql`(select ${listItems.position} from ${listItems} where ${listItems.problemId} = ${problems.id} and ${listItems.listId} = ${filters.listId})`,
        ),
      ]
    : [desc(nodes.updatedAt)];

  const rows = db
    .select({
      id: problems.id,
      title: nodes.title,
      slug: nodes.slug,
      updatedAt: nodes.updatedAt,
      url: problems.url,
      source: problems.source,
      difficulty: problems.difficulty,
      status: problems.status,
      nextReviewAt: problems.nextReviewAt,
    })
    .from(problems)
    .innerJoin(nodes, eq(nodes.id, problems.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...order)
    .all();

  const topicsByProblem = getTopicsFor(rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    topics: topicsByProblem.get(row.id) ?? [],
  }));
}

function getTopicsFor(problemIds: string[]) {
  const map = new Map<string, { id: string; title: string; slug: string }[]>();
  if (problemIds.length === 0) return map;

  const rows = db
    .select({
      problemId: edges.srcId,
      id: nodes.id,
      title: nodes.title,
      slug: nodes.slug,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.dstId))
    .where(and(inArray(edges.srcId, problemIds), eq(nodes.kind, "topic")))
    .orderBy(asc(nodes.title))
    .all();

  // A problem linked to a topic by several edge kinds is still tagged with it once.
  for (const row of rows) {
    const list = map.get(row.problemId) ?? [];
    if (!list.some((topic) => topic.id === row.id)) {
      list.push({ id: row.id, title: row.title, slug: row.slug });
      map.set(row.problemId, list);
    }
  }
  return map;
}

export async function getNode(id: string) {
  await ready();
  return db.select().from(nodes).where(eq(nodes.id, id)).get() ?? null;
}

export async function getProblemDetail(id: string) {
  await ready();
  const row = db
    .select()
    .from(problems)
    .innerJoin(nodes, eq(nodes.id, problems.id))
    .where(eq(problems.id, id))
    .get();
  if (!row) return null;

  return {
    ...row.nodes,
    ...row.problems,
    topics: getTopicsFor([id]).get(id) ?? [],
    lists: db
      .select({ id: lists.id, name: lists.name, emoji: lists.emoji })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .where(eq(listItems.problemId, id))
      .all(),
    files: db.select().from(files).where(eq(files.nodeId, id)).orderBy(asc(files.createdAt)).all(),
  };
}

export function createProblem(input: {
  title: string;
  url?: string | null;
  source?: string | null;
  difficulty?: Difficulty | null;
  listId?: string | null;
}) {
  if (input.url) {
    const existing = db
      .select({ id: problems.id })
      .from(problems)
      .where(eq(problems.url, input.url))
      .get();
    if (existing) {
      if (input.listId) addProblemToList(input.listId, existing.id);
      return { id: existing.id, created: false };
    }
  }

  const id = createNode("problem", input.title);
  db.insert(problems)
    .values({
      id,
      url: input.url ?? null,
      source: input.source ?? null,
      difficulty: input.difficulty ?? null,
      status: "todo",
    })
    .run();

  if (input.listId) addProblemToList(input.listId, id);
  return { id, created: true };
}

export function updateProblem(
  id: string,
  patch: Partial<{
    title: string;
    url: string | null;
    difficulty: Difficulty | null;
    status: Status;
  }>,
) {
  const { title, ...problemPatch } = patch;
  if (title !== undefined) renameNode(id, title);
  if (Object.keys(problemPatch).length > 0) {
    db.update(problems).set(problemPatch).where(eq(problems.id, id)).run();
  }
}

/**
 * The slug follows the title, so `[[New Title]]` resolves after a rename. Links still
 * spelling the old title become unresolved rather than silently pointing elsewhere.
 */
export function renameNode(id: string, title: string) {
  const clean = title.trim() || "Untitled";
  db.update(nodes)
    .set({ title: clean, slug: uniqueSlug(clean, id), updatedAt: new Date() })
    .where(eq(nodes.id, id))
    .run();
}

export function updateNotes(nodeId: string, notes: string) {
  db.update(nodes).set({ notes, updatedAt: new Date() }).where(eq(nodes.id, nodeId)).run();
  syncWikilinks(nodeId, notes);
}

export function deleteNode(id: string) {
  db.delete(nodes).where(eq(nodes.id, id)).run();
}

/* ----------------------------- export & import ---------------------------- */

/** The whole vault, in one read, for the backup/restore round trip. */
export async function getEverything() {
  await ready();
  return {
    nodes: db.select().from(nodes).all(),
    problems: db.select().from(problems).all(),
    edges: db.select().from(edges).all(),
    files: db.select().from(files).all(),
    lists: db.select().from(lists).orderBy(asc(lists.position)).all(),
    listItems: db.select().from(listItems).all(),
  };
}

export function findListByName(name: string) {
  return db.select().from(lists).where(eq(lists.name, name)).get() ?? null;
}

export function setProblemFields(
  id: string,
  fields: Partial<typeof problems.$inferInsert>,
) {
  db.insert(problems)
    .values({ id, ...fields })
    .onConflictDoUpdate({ target: problems.id, set: fields })
    .run();
}

/* --------------------------------- review --------------------------------- */

export function markReviewed(id: string) {
  const current = db
    .select({ interval: problems.reviewInterval })
    .from(problems)
    .where(eq(problems.id, id))
    .get();
  if (!current) return;

  db.update(problems).set(nextReview(current.interval)).where(eq(problems.id, id)).run();
}

export function resetReview(id: string) {
  db.update(problems)
    .set({ reviewInterval: 0, lastReviewedAt: null, nextReviewAt: null })
    .where(eq(problems.id, id))
    .run();
}

/** Everything due now, most overdue first. */
export async function getDueProblems() {
  await ready();
  const rows = db
    .select({
      id: problems.id,
      title: nodes.title,
      slug: nodes.slug,
      updatedAt: nodes.updatedAt,
      url: problems.url,
      source: problems.source,
      difficulty: problems.difficulty,
      status: problems.status,
      nextReviewAt: problems.nextReviewAt,
    })
    .from(problems)
    .innerJoin(nodes, eq(nodes.id, problems.id))
    .where(lte(problems.nextReviewAt, new Date()))
    .orderBy(asc(problems.nextReviewAt))
    .all();

  const topics = getTopicsFor(rows.map((r) => r.id));
  return rows.map((row) => ({ ...row, topics: topics.get(row.id) ?? [] }));
}

/* ------------------------------ nodes & edges ----------------------------- */

export function findNodeBySlug(slug: string) {
  return db.select().from(nodes).where(eq(nodes.slug, slug)).get() ?? null;
}

/** Used by wiki-link autocomplete: resolves an existing node or makes a new one. */
export function getOrCreateNode(kind: NodeKind, title: string) {
  const existing = findNodeBySlug(slugify(title));
  if (existing) return existing;
  const id = createNode(kind, title);
  return db.select().from(nodes).where(eq(nodes.id, id)).get()!;
}

export async function searchNodes(query: string, limit = 20) {
  await ready();
  const term = `%${query}%`;
  return db
    .select({ id: nodes.id, kind: nodes.kind, title: nodes.title, slug: nodes.slug })
    .from(nodes)
    .where(query ? like(nodes.title, term) : undefined)
    .orderBy(asc(nodes.title))
    .limit(limit)
    .all();
}

export function addEdge(srcId: string, dstId: string, kind: EdgeKind, label?: string) {
  if (srcId === dstId) return;
  db.insert(edges)
    .values({ id: newId(), srcId, dstId, kind, label: label ?? null, createdAt: new Date() })
    .onConflictDoNothing()
    .run();
}

export function removeEdge(srcId: string, dstId: string, kind: EdgeKind) {
  db.delete(edges)
    .where(and(eq(edges.srcId, srcId), eq(edges.dstId, dstId), eq(edges.kind, kind)))
    .run();
}

/**
 * Rewrites this node's wiki-link edges to match its text. Only links naming a node
 * that already exists become edges; manual edges are never touched.
 */
export function syncWikilinks(nodeId: string, notes: string) {
  const targets = parseWikilinks(notes)
    .map((title) => findNodeBySlug(slugify(title)))
    .filter((node) => node !== null && node.id !== nodeId)
    .map((node) => node!.id);

  const wanted = new Set(targets);
  const current = db
    .select({ dstId: edges.dstId })
    .from(edges)
    .where(and(eq(edges.srcId, nodeId), eq(edges.kind, "wikilink")))
    .all();

  for (const { dstId } of current) {
    if (!wanted.has(dstId)) removeEdge(nodeId, dstId, "wikilink");
  }
  const existing = new Set(current.map((e) => e.dstId));
  for (const dstId of wanted) {
    if (!existing.has(dstId)) addEdge(nodeId, dstId, "wikilink");
  }
}

export type Connection = {
  id: string;
  kind: NodeKind;
  title: string;
  slug: string;
  edgeKind: EdgeKind;
};

/** Everything this node points at, and everything pointing back at it. */
function getConnections(nodeId: string) {
  const outgoing = db
    .select({
      id: nodes.id,
      kind: nodes.kind,
      title: nodes.title,
      slug: nodes.slug,
      edgeKind: edges.kind,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.dstId))
    .where(eq(edges.srcId, nodeId))
    .orderBy(asc(nodes.title))
    .all();

  const incoming = db
    .select({
      id: nodes.id,
      kind: nodes.kind,
      title: nodes.title,
      slug: nodes.slug,
      edgeKind: edges.kind,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.srcId))
    .where(eq(edges.dstId, nodeId))
    .orderBy(asc(nodes.title))
    .all();

  return { outgoing, incoming };
}

/** Slug -> target, so the preview can tell a resolved wiki-link from a missing one. */
function resolveWikiTargets(notes: string) {
  const map: Record<string, { id: string; kind: NodeKind; title: string }> = {};
  for (const title of parseWikilinks(notes)) {
    const slug = slugify(title);
    const node = findNodeBySlug(slug);
    if (node) map[slug] = { id: node.id, kind: node.kind, title: node.title };
  }
  return map;
}

export async function getNodeDetail(id: string) {
  await ready();
  const node = db.select().from(nodes).where(eq(nodes.id, id)).get();
  if (!node) return null;

  return {
    ...node,
    ...getConnections(id),
    wikiTargets: resolveWikiTargets(node.notes),
    files: db.select().from(files).where(eq(files.nodeId, id)).orderBy(asc(files.createdAt)).all(),
  };
}

export async function getGraph() {
  await ready();
  return {
    nodes: db
      .select({
        id: nodes.id,
        kind: nodes.kind,
        title: nodes.title,
        difficulty: problems.difficulty,
        status: problems.status,
      })
      .from(nodes)
      .leftJoin(problems, eq(problems.id, nodes.id))
      .all(),
    edges: db
      .select({ source: edges.srcId, target: edges.dstId, kind: edges.kind })
      .from(edges)
      .all(),
  };
}

/* ---------------------------------- files --------------------------------- */

export function recordFile(input: {
  nodeId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
}) {
  const id = newId();
  db.insert(files).values({ id, ...input, createdAt: new Date() }).run();
  return id;
}

export function getFile(id: string) {
  return db.select().from(files).where(eq(files.id, id)).get() ?? null;
}

export function deleteFile(id: string) {
  db.delete(files).where(eq(files.id, id)).run();
}

/* ----------------------------- list membership ---------------------------- */

export function addProblemToList(listId: string, problemId: string) {
  const max = db
    .select({ v: sql<number>`coalesce(max(${listItems.position}), -1)` })
    .from(listItems)
    .where(eq(listItems.listId, listId))
    .get();

  db.insert(listItems)
    .values({ listId, problemId, position: (max?.v ?? -1) + 1, addedAt: new Date() })
    .onConflictDoNothing()
    .run();
}

export function removeProblemFromList(listId: string, problemId: string) {
  db.delete(listItems)
    .where(and(eq(listItems.listId, listId), eq(listItems.problemId, problemId)))
    .run();
}
