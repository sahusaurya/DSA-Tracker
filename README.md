# DSA Tracker

A local-first place to keep your DSA practice: problem lists, markdown notes attached to each
problem, images and files alongside them, and a knowledge graph that builds itself as you write.

Everything lives on your machine — a SQLite file and a folder of uploads. Nothing is sent
anywhere, and the app works with no internet connection at all.

## Download

Grab the installer for your system from the [latest release](../../releases/latest):

| System | File |
|---|---|
| macOS (Apple Silicon) | `DSA Tracker-<version>-arm64.dmg` |
| macOS (Intel) | `DSA Tracker-<version>.dmg` |
| Windows | `DSA Tracker Setup-<version>.exe` |
| Linux | `DSA Tracker-<version>.AppImage` or `.deb` |

**First launch.** The builds aren't code-signed — a certificate costs money every year, and
this is a free project — so your system will want reassurance the first time:

- **macOS** — right-click the app in Applications and choose *Open*, then *Open* again.
  Double-clicking shows a warning instead. Only needed once.
- **Windows** — click *More info*, then *Run anyway*.

If macOS says the app is **damaged**, you have a build from v0.2.0 or earlier, where the
signature didn't cover the whole bundle. Download v0.2.1 or later. To open a copy you already
have, clear the download flag:

```bash
xattr -dr com.apple.quarantine "/Applications/DSA Tracker.app"
```

Your notes are kept in your account's application-data folder, separate from the app itself,
so uninstalling or replacing the app never touches them.

## Building from source

```bash
npm install
npm run dev
```

That opens the app window with hot reload. There is no browser version — the app is the
desktop app, and `npm run dev` is the development loop for it, not a second way to use it.
The database and uploads folder are created on first run under `data/`, and migrations apply
automatically.

To build installers:

```bash
npm run dist
```

They land in `dist/`. Each platform must be built on that platform, which is why releases
come from CI rather than one machine.

## A note on the local server

Inside the app, the interface talks to a small server that Next.js runs. It listens on
`127.0.0.1` — loopback only, invisible to your network — on a port chosen fresh at each
launch, and **every request must carry a secret generated when the app starts**.

That last part matters. An unauthenticated port on `127.0.0.1` is reachable by more than the
app that opened it: a web page you happen to visit can send it a cross-origin `POST` without
so much as a preflight, and on a shared computer any other user account can reach it too.
Neither can obtain the secret, so both get a `403`.

## What it does

**Lists.** Group problems however you like: "Blind 75", "Graphs", "Company X prep". A problem can
sit in several lists at once and still have one set of notes, so nothing gets duplicated. The
*Lists* section on a problem adds and removes it from lists without deleting the problem.

**Notes.** Every problem and topic has a markdown editor with live preview. It autosaves
as you type. Code blocks get syntax highlighting; GFM tables and task lists work.

**Maths.** Write LaTeX between dollar signs: `$O(n \log n)$` inline, or `$$…$$` on its own lines
for a centred block. It renders with KaTeX, which is bundled rather than fetched, so formulas
still typeset offline. Dollar signs inside code stay literal.

**Attachments.** Paste a screenshot straight into the editor and it uploads and embeds itself.
Drag in a PDF or a photo of your handwritten working and it lands in the attachments strip.

Pasted images are re-encoded to WebP in the browser before they upload — a clipboard screenshot
arrives as lossless PNG, and a megabyte per paste adds up quickly. Files you pick or drag from
disk are stored byte for byte, on the grounds that choosing a file is a deliberate act and a
scanned page is worth keeping intact. **Settings** lets you switch pastes back to PNG if you'd
rather trade the space for lossless copies.

**Links and the graph.** Type `[[` anywhere in your notes to link to another problem or a topic —
with autocomplete, and an option to create the target on the spot. Those links become
edges in the graph at `/graph`, where topics act as hubs that cluster related problems. Every page
also lists what it links to and what references it back, each removable. A topic nothing links to
any more drops out of the graph, and can be deleted outright from its own page.

**Review.** Say how many days until you want to see a problem again — type `4`, hit *Set review*,
and it resurfaces in four days. `/review` lists everything scheduled, soonest first.

**Find things.** `⌘K` (or `Ctrl+K`) jumps to anything by name. List pages filter by difficulty,
status, and text — the text filter searches note bodies too, not just titles.

## Your data

The vault is a SQLite database plus a folder of attachments. Where it lives depends on how you
run the app:

| | Location |
|---|---|
| Desktop app (macOS) | `~/Library/Application Support/DSA Tracker/vault/` |
| Desktop app (Windows) | `%APPDATA%\DSA Tracker\vault\` |
| Desktop app (Linux) | `~/.config/DSA Tracker/vault/` |
| `npm run dev` | `data/` beside the code (gitignored) |

The two are deliberately separate, so experimenting with `npm run dev` can't disturb the notes
in your installed app. To move a vault between them — or between machines — use **Export** in
one and **Import** in the other. Back up either by copying the folder, or with Export.

Export produces a zip of plain markdown files with YAML frontmatter, wiki-links intact, plus the
attachments they reference. It opens as an Obsidian vault as-is, and **Import** reads it back.
Notes are matched by filename, so importing over an existing vault overwrites matching notes and
adds fresh copies of attachments — import into an empty `data/` for a clean restore.

## Layout

```
src/app/          pages and API routes
src/components/   UI
src/db/           schema.ts, client.ts, queries.ts  ← all data access
src/lib/          storage, wiki-link parsing, URL parsing, review scheduling
electron/         desktop shell: boots the server, owns the window and menus
drizzle/          migrations (committed)
data/             your database and uploads when run from source (gitignored)
```

The desktop app is the same code, not a port: Electron starts the Next.js server on a private
localhost port and points a native window at it, so there is one implementation of every
feature rather than two that can drift apart.

Everything that can appear in the graph is a **node** (`problem` or `topic`) and every
connection is an **edge**, which is why tagging, linking, and the graph are all the same mechanism
rather than three separate features.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the app with hot reload |
| `npm run desktop` | Run the app as it ships, from a production build |
| `npm run dist` | Build installers for this platform into `dist/` |
| `npm run build` | Production build (a step inside the two above) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run db:studio` | Browse the database |
