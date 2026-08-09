/**
 * The development loop for the desktop app.
 *
 * There is no browser-based version of this app any more, but rebuilding and repackaging on
 * every keystroke would be unusable. So this runs Next's dev server — bound to loopback and
 * gated by the same launch token as the real app — and points Electron at it, which keeps
 * hot reload while the only way in is still the app window.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const root = path.join(import.meta.dirname, "..");
const token = randomUUID();

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const port = await freePort();
const url = `http://127.0.0.1:${port}`;
const children = [];

function shutdown(code = 0) {
  for (const child of children) child.kill();
  process.exit(code);
}

const next = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
  { cwd: root, stdio: "inherit", env: { ...process.env, DSA_APP_TOKEN: token } },
);
children.push(next);
next.on("exit", (code) => shutdown(code ?? 0));

const electron = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["electron", "."],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DSA_APP_TOKEN: token, DSA_DEV_SERVER_URL: url },
  },
);
children.push(electron);
// Closing the window ends the session, the same as quitting any other app.
electron.on("exit", (code) => shutdown(code ?? 0));

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
