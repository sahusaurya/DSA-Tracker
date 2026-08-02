# DSA Tracker

A local-first place to keep your DSA practice: problem lists, markdown notes attached to each
problem, images and files alongside them, and a knowledge graph that builds itself as you write.

Everything lives on your machine — a SQLite file and a folder of uploads under `data/`. Nothing
is sent anywhere.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database and uploads folder are created on first run, and
migrations apply automatically — there's no setup step.

## What it does

**Lists.** Group problems however you like: "Blind 75", "Graphs", "Company X prep". A problem can
sit in several lists at once and still have one set of notes, so nothing gets duplicated.

**Notes.** Every problem, topic, and bundle has a markdown editor with live preview. It autosaves
as you type. Code blocks get syntax highlighting; GFM tables and task lists work.

**Attachments.** Paste a screenshot straight into the editor and it uploads and embeds itself.
Drag in a PDF or a photo of your handwritten working and it lands in the attachments strip.

**Links and the graph.** Type `[[` anywhere in your notes to link to another problem, a topic, or
a bundle — with autocomplete, and an option to create the target on the spot. Those links become
edges in the graph at `/graph`, where topics act as hubs that cluster related problems. Every page
also lists what it links to and what references it back.

**Review.** Hit *Mark reviewed* on a problem and it comes back at 1, 3, 7, 16, then 35 days.
`/review` shows what's due, most overdue first.

**Find things.** `⌘K` (or `Ctrl+K`) jumps to anything by name. List pages filter by difficulty,
status, and text — the text filter searches note bodies too, not just titles.

## Your data

`data/app.db` is the database; `data/uploads/` holds attachments. Both are gitignored. Back them
up by copying the folder, or use **Export** in the sidebar.

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
drizzle/          migrations (committed)
data/             your database and uploads (gitignored)
```

Everything that can appear in the graph is a **node** (`problem`, `topic`, or `bundle`) and every
connection is an **edge**, which is why tagging, linking, and the graph are all the same mechanism
rather than three separate features.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run db:studio` | Browse the database |
