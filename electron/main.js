/**
 * Desktop shell for DSA Tracker.
 *
 * The app is a Next.js server, so the shell starts that server on a private localhost port
 * and points a native window at it. Everything the user sees — notes, graph, SQLite, uploads
 * — is the same code that runs under `npm run dev`; only the window around it is new.
 *
 * The server binds to 127.0.0.1 only. Nothing is reachable from the network, and loopback
 * avoids the firewall prompt that listening on a public interface would trigger.
 */
const { app, BrowserWindow, Menu, dialog, session, shell, screen } = require("electron");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

/**
 * Proves a request came from this window. The server refuses anything without it, which is
 * what stops a web page you happen to visit from POSTing to our loopback port, and stops
 * another user account on the same machine from reaching it. Fresh every launch.
 */
const APP_TOKEN = process.env.DSA_APP_TOKEN || randomUUID();
const TOKEN_HEADER = "x-dsa-token";

const isDev = !app.isPackaged;
const APP_NAME = "DSA Tracker";

/** Packaged, the server and migrations ride along in resources/. */
const resources = isDev ? path.join(__dirname, "..") : process.resourcesPath;
const serverEntry = isDev
  ? path.join(resources, ".next", "standalone", "server.js")
  : path.join(resources, "standalone", "server.js");
const migrationsDir = isDev
  ? path.join(resources, "drizzle")
  : path.join(resources, "standalone", "drizzle");

let serverProcess = null;
let mainWindow = null;
let serverPort = null;

const appOrigin = () => `http://127.0.0.1:${serverPort}`;

/** Remembering where the window was is most of what makes a wrapper feel like an app. */
const boundsFile = () => path.join(app.getPath("userData"), "window-state.json");

function readBounds() {
  try {
    const saved = JSON.parse(fs.readFileSync(boundsFile(), "utf8"));
    // A window restored onto a monitor that is no longer attached is invisible.
    const area = screen.getDisplayMatching(saved).workArea;
    const onScreen =
      saved.x + saved.width > area.x &&
      saved.y + saved.height > area.y &&
      saved.x < area.x + area.width &&
      saved.y < area.y + area.height;
    return onScreen ? saved : null;
  } catch {
    return null;
  }
}

function saveBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
  try {
    fs.writeFileSync(boundsFile(), JSON.stringify(mainWindow.getNormalBounds()));
  } catch {
    // Losing window position is not worth surfacing to the user.
  }
}

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

/** Resolves once the server answers, so the window is never shown against a dead port. */
function waitForServer(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(
        {
          host: "127.0.0.1",
          port,
          path: "/",
          timeout: 2000,
          headers: { [TOKEN_HEADER]: APP_TOKEN },
        },
        (response) => {
          response.resume();
          resolve();
        },
      );
      request.on("error", retry);
      request.on("timeout", () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error("The app's server did not start in time."));
        return;
      }
      setTimeout(attempt, 200);
    };

    attempt();
  });
}

async function startServer() {
  // `npm run dev` starts Next itself so hot reload works; attach to that instead of
  // building and spawning a production bundle on every keystroke.
  if (process.env.DSA_DEV_SERVER_URL) {
    const port = Number(new URL(process.env.DSA_DEV_SERVER_URL).port);
    await waitForServer(port);
    serverPort = port;
    return port;
  }

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server bundle missing at ${serverEntry}. Run \`npm run build:desktop\`.`);
  }

  const port = await freePort();

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.dirname(serverEntry),
    env: {
      ...process.env,
      // Run Electron's bundled Node as plain Node for the server child.
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DSA_APP_TOKEN: APP_TOKEN,
      // The vault belongs in the OS application-data folder; an installed app must never
      // write inside its own bundle, which is read-only on macOS anyway.
      DSA_DATA_DIR: path.join(app.getPath("userData"), "vault"),
      DSA_MIGRATIONS_DIR: migrationsDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => console.log(`[server] ${chunk}`.trimEnd()));
  serverProcess.stderr.on("data", (chunk) => console.error(`[server] ${chunk}`.trimEnd()));
  serverProcess.on("exit", (code) => {
    serverProcess = null;
    // A server that dies while the app is open leaves a window that can do nothing.
    if (code !== 0 && !app.isQuitting && mainWindow) {
      dialog.showErrorBox(APP_NAME, "The app's background service stopped unexpectedly.");
    }
  });

  await waitForServer(port);
  serverPort = port;
  return port;
}

function stopServer() {
  if (!serverProcess) return;
  serverProcess.kill();
  serverProcess = null;
}

function createWindow(port) {
  const saved = readBounds();

  mainWindow = new BrowserWindow({
    ...(saved ?? { width: 1280, height: 860 }),
    minWidth: 720,
    minHeight: 520,
    title: APP_NAME,
    backgroundColor: "#111111",
    // Created hidden: showing it before the page paints gives a white flash that reads
    // as a broken launch.
    show: false,
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);
  mainWindow.on("close", saveBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const origin = `http://127.0.0.1:${port}`;
  serverPort = port;

  // Stamp every request this window makes to our own server. Scoped to that origin so the
  // token can never travel anywhere else.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${origin}/*`] },
    (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, [TOKEN_HEADER]: APP_TOKEN } });
    },
  );

  // Two kinds of link wear the same target="_blank": a problem's page on LeetCode, and an
  // attachment served by our own server. The first belongs in the user's browser; the second
  // must stay in the app or previewing a screenshot would bounce them out of it.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: { title: APP_NAME, backgroundColor: "#111111" },
      };
    }
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // Same reasoning for in-place navigation: never let the window itself leave the app.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(origin)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });

  // Export is an ordinary link to /api/export. Left alone, Electron saves it silently to the
  // downloads folder; a backup the user can't find isn't a backup.
  mainWindow.webContents.session.on("will-download", (_event, item) => {
    item.setSaveDialogOptions({
      title: "Save export",
      defaultPath: path.join(app.getPath("downloads"), item.getFilename()),
    });
  });

  // A window that fails to load shows a bare browser error, which looks like the app is
  // broken with no explanation. Say what happened instead.
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`[window] failed to load ${url}: ${description} (${code})`);
    dialog.showErrorBox(APP_NAME, `${APP_NAME} could not load its window.\n\n${description}`);
  });
  mainWindow.webContents.on("did-finish-load", () => console.log("[window] loaded"));

  mainWindow.loadURL(origin);
}

/**
 * On macOS the clipboard shortcuts are wired by the menu, not by the web page: without an
 * Edit menu carrying these roles, Cmd+V silently stops working — and pasting screenshots is
 * a core feature here. The menu is a functional requirement, not decoration.
 */
function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            if (serverPort) mainWindow?.loadURL(`${appOrigin()}/settings`);
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
      ],
    },
    { role: "windowMenu" },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// The vault path comes from the app name, which Electron reads from `productName` in
// package.json before this file runs — setting it here would be too late to move userData.
/**
 * One copy at a time.
 *
 * Nothing stopped a second launch before, and a second copy is not harmless: it starts its own
 * server against the *same* SQLite vault, so two processes write the same notes. It also looks
 * like the app is refusing to start — you click, and the window that appears belongs to a
 * different instance than the one you were using. Hand the click to the running copy instead.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      if (serverPort) createWindow(serverPort);
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  start();
}

async function start() {
  await app.whenReady();
  buildMenu();

  try {
    const port = await startServer();
    createWindow(port);
  } catch (error) {
    dialog.showErrorBox(APP_NAME, `${APP_NAME} could not start.\n\n${error.message}`);
    app.quit();
    return;
  }

  // macOS keeps the app running with no windows; clicking the Dock icon reopens one.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverPort) createWindow(serverPort);
  });
}

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", stopServer);
process.on("exit", stopServer);
