import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/db/client";

export interface BlobStore {
  /** Returns the storage key the bytes were written under. */
  put(nodeId: string, filename: string, data: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  /** Drops a node's now-empty folder so `uploads/` doesn't fill with husks. */
  pruneFolder(nodeId: string): Promise<void>;
}

/** Keys are `<nodeId>/<uuid><ext>` — never derived from user-supplied paths. */
function buildKey(nodeId: string, filename: string) {
  const rawExt = path.extname(filename).slice(1).toLowerCase();
  const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? `.${rawExt}` : "";
  return `${nodeId}/${randomUUID()}${ext}`;
}

function resolveKey(key: string) {
  const full = path.resolve(UPLOADS_DIR, key);
  // Defence in depth: a key from the database should never escape the uploads dir.
  if (full !== UPLOADS_DIR && !full.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error("Refusing to access a path outside the uploads directory");
  }
  return full;
}

class LocalDiskStore implements BlobStore {
  async put(nodeId: string, filename: string, data: Buffer) {
    const key = buildKey(nodeId, filename);
    const full = resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return key;
  }

  async read(key: string) {
    return fs.readFile(resolveKey(key));
  }

  async remove(key: string) {
    await fs.rm(resolveKey(key), { force: true });
  }

  async pruneFolder(nodeId: string) {
    // rmdir refuses a non-empty directory, which is the behaviour worth having: anything
    // unaccounted for is left for the startup sweep to judge rather than deleted blind.
    await fs.rmdir(resolveKey(nodeId)).catch(() => {});
  }
}

export const blobStore: BlobStore = new LocalDiskStore();
