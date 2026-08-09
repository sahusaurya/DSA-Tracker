import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { reclaimOrphanedUploads } from "./reclaim";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

/**
 * Where the vault lives. Running from a clone this is `data/` beside the source, which keeps
 * `npm run dev` self-contained. The desktop build overrides it with the OS application-data
 * folder, because an installed app must never write inside its own bundle.
 */
export const DATA_DIR = process.env.DSA_DATA_DIR || path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

/** Migrations are read at runtime, so packaged builds ship `drizzle/` and point here. */
const MIGRATIONS_DIR = process.env.DSA_MIGRATIONS_DIR || path.join(process.cwd(), "drizzle");

function connect() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const sqlite = new Database(path.join(DATA_DIR, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: MIGRATIONS_DIR });
  seedIfEmpty(database);
  reclaimOrphanedUploads(database, UPLOADS_DIR);
  return database;
}

// Dev hot-reload re-evaluates modules; without this each reload opens a new handle.
const globalForDb = globalThis as unknown as {
  __dsaNotesDb?: ReturnType<typeof connect>;
};

export const db = globalForDb.__dsaNotesDb ?? connect();
globalForDb.__dsaNotesDb = db;
