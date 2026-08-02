import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile in a parent directory otherwise wins the workspace-root inference.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
