import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { files } from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

/**
 * Deletes upload bytes that no `files` row points at.
 *
 * Node deletion used to take the database rows and leave the bytes, so a vault can arrive
 * here with orphans already on disk — invisible in the app, but counted in every backup.
 * The `files` table is the authority on what is still reachable; anything else under
 * `uploads/` is unreachable by definition.
 *
 * Runs at startup, before the first request is served, so it can't race an in-flight
 * upload writing its bytes just before recording its row.
 */
export function reclaimOrphanedUploads(db: Db, uploadsDir: string) {
  let folders: string[];
  try {
    folders = fs.readdirSync(uploadsDir);
  } catch {
    return;
  }

  const reachable = new Set(
    db.select({ storageKey: files.storageKey }).from(files).all().map((row) => row.storageKey),
  );

  let reclaimed = 0;
  let bytes = 0;

  for (const folder of folders) {
    const dir = path.join(uploadsDir, folder);
    let entries: string[];
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (reachable.has(`${folder}/${entry}`)) continue;
      const full = path.join(dir, entry);
      try {
        bytes += fs.statSync(full).size;
        fs.rmSync(full, { force: true });
        reclaimed += 1;
      } catch {
        // A file we can't stat or remove is one to leave alone.
      }
    }

    // Succeeds only when the folder is empty, which is exactly when it's worth removing.
    try {
      fs.rmdirSync(dir);
    } catch {
      // Still holding reachable files.
    }
  }

  if (reclaimed > 0) {
    const mb = (bytes / 1024 / 1024).toFixed(1);
    console.log(
      `[dsa-tracker] Reclaimed ${reclaimed} orphaned upload${reclaimed === 1 ? "" : "s"} (${mb} MB) that no note referenced.`,
    );
  }
}
