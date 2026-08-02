import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const NODE_KINDS = ["problem", "bundle", "topic"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const STATUSES = ["todo", "attempted", "solved"] as const;
export const EDGE_KINDS = ["wikilink", "manual", "membership"] as const;

export type NodeKind = (typeof NODE_KINDS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type Status = (typeof STATUSES)[number];
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const nodes = sqliteTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: NODE_KINDS }).notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    notes: text("notes").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("nodes_kind_idx").on(t.kind)],
);

export const problems = sqliteTable(
  "problems",
  {
    id: text("id")
      .primaryKey()
      .references(() => nodes.id, { onDelete: "cascade" }),
    url: text("url").unique(),
    source: text("source"),
    difficulty: text("difficulty", { enum: DIFFICULTIES }),
    status: text("status", { enum: STATUSES }).notNull().default("todo"),
    reviewInterval: integer("review_interval").notNull().default(0),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
    nextReviewAt: integer("next_review_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("problems_next_review_idx").on(t.nextReviewAt)],
);

export const edges = sqliteTable(
  "edges",
  {
    id: text("id").primaryKey(),
    srcId: text("src_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    dstId: text("dst_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: EDGE_KINDS }).notNull(),
    label: text("label"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [
    unique("edges_unique").on(t.srcId, t.dstId, t.kind),
    index("edges_src_idx").on(t.srcId),
    index("edges_dst_idx").on(t.dstId),
  ],
);

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("files_node_idx").on(t.nodeId)],
);

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const listItems = sqliteTable(
  "list_items",
  {
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    problemId: text("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [primaryKey({ columns: [t.listId, t.problemId] })],
);

export type NodeRow = typeof nodes.$inferSelect;
export type ProblemRow = typeof problems.$inferSelect;
export type EdgeRow = typeof edges.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type ListRow = typeof lists.$inferSelect;
