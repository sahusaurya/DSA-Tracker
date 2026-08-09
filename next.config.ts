import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile in a parent directory otherwise wins the workspace-root inference.
  turbopack: { root: import.meta.dirname },

  // Emits `.next/standalone/server.js` with only the files the server needs, which is what
  // the desktop build ships and runs. Harmless for `npm run dev` and plain `next start`.
  output: "standalone",

  // better-sqlite3 picks its `.node` binary at runtime, so static tracing can't see it.
  // Without this the packaged server starts and then fails the moment it opens the database.
  outputFileTracingIncludes: {
    "/*": ["node_modules/better-sqlite3/**/*"],
  },

  // The tracer sees the `fs` calls in src/db/client.ts, resolves the default `data/` path and
  // helpfully copies the whole vault into the build — which would put the developer's own
  // notes and screenshots inside every installer. The vault is created at runtime; never ship it.
  outputFileTracingExcludes: {
    "/*": ["data/**/*"],
  },
};

export default nextConfig;
