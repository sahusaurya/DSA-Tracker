// `output: "standalone"` deliberately leaves out `public/` and `.next/static`, on the
// assumption that a CDN serves them. A desktop app has no CDN, so copy them in beside
// server.js, which is where the minimal server looks for them.
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error("No .next/standalone — run `next build` first.");
  process.exit(1);
}

const copies = [
  [path.join(root, "public"), path.join(standalone, "public")],
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
  // Migrations are read at runtime by drizzle's migrator.
  [path.join(root, "drizzle"), path.join(standalone, "drizzle")],
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) continue;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

// Belt and braces: the tracer resolves the default vault path from src/db/client.ts and has
// been seen copying a developer's own notes into the build. next.config excludes it; make
// certain none of it reaches an installer.
const leaked = path.join(standalone, "data");
if (fs.existsSync(leaked)) {
  fs.rmSync(leaked, { recursive: true, force: true });
  console.warn("removed a stray data/ directory from the build output");
}
