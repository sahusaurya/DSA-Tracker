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
  // Wait for another connection's write rather than failing instantly with SQLITE_BUSY.
  sqlite.pragma("busy_timeout = 5000");

  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: MIGRATIONS_DIR });
  seedIfEmpty(database);
  reclaimOrphanedUploads(database, UPLOADS_DIR);
  return database;
}

type Db = ReturnType<typeof connect>;

// Dev hot-reload re-evaluates modules; without this each reload opens a new handle.
const globalForDb = globalThis as unknown as { __dsaNotesDb?: Db };

function connection(): Db {
  if (!globalForDb.__dsaNotesDb) globalForDb.__dsaNotesDb = connect();
  return globalForDb.__dsaNotesDb;
}

/**
 * Connects on first use, not on import.
 *
 * `next build` imports every route to collect its metadata, and it does so in parallel
 * workers. Connecting at module scope meant each worker raced to create, migrate and seed
 * the same file, which fails with "database is locked" on a machine that has no vault yet —
 * a fresh clone, or CI. Nothing about building the app should touch the database at all.
 */
export const db = new Proxy({} as Db, {
  get(_target, property) {
    const real = connection() as unknown as Record<string | symbol, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
