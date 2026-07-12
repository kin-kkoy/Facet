# Editable Content (Cookbook)

**Everything the app teaches is plain files you can edit — no rebuild needed.**

## Where it lives

On first launch Facet copies its default content (embedded in the app) into an editable
folder in your OS app-data dir:

- **Linux:** `~/.local/share/com.makkaon.facet-app/curriculum/`
- **macOS:** `~/Library/Application Support/com.makkaon.facet-app/curriculum/`
- **Windows:** `%APPDATA%\com.makkaon.facet-app\curriculum\`

Edit files there, **relaunch the app**, and changes appear. (The app never overwrites this
folder once it exists — it's yours.) The shipped defaults live in the repo at
`facet-app/src-tauri/curriculum-seed/` and are baked into the binary; change those only when
you want to change what *new installs* start with (that needs a rebuild).

## Folder layout

```
curriculum/
├─ meta.json                 # title, .NET/C# version shown on the map
├─ branches/<id>.json        # one per branch (core, backend, cloud, game)
├─ nodes/<branch>/<id>.md    # one file per skill-tree node (frontmatter + body)
├─ atlas/     index.json + <part>/<page>.md    # the Syntax Atlas book
├─ mapbook/   index.json + <page>.md           # the Map (book)
└─ app-specs/ index.json + <page>.md           # this cookbook
```

## A node file

`nodes/<branch>/<id>.md` — YAML frontmatter, then an optional markdown body:

```markdown
---
id: "m04-t1"           # unique id
kind: "topic"          # chapter | topic | crossroad | checkpoint | project
group: "m04"           # (topics) the parent chapter id
order: 1               # (topics) position within the chapter
label: "The core five" # shown on the node
atlas: ["40-linq"]     # Syntax Companion → these Atlas page ids
example: |-            # optional C# snippet ("Try in lab")
  int[] xs = { 5, 2, 8 };
  ...
summary: "…"           # one-line description in the detail popover
---
Optional lesson prose (markdown).
```

Other frontmatter fields: `branch`, `tier` (chapter row), `icon` (Font Awesome class),
`est`, `doc`, `cert`, `checkpoint` (the chapter's checkpoint id), `defense` (projects),
`prereqs: [...]` (ids that must be complete), `topics: [...]` (a chapter's ordered topic ids),
`important: true` (rainbow ring when completed), and layout nudges `laneOffset` / `side`.

## A branch file

`branches/<id>.json`:

```json
{ "id": "game", "label": "Game Dev (C#)", "color": "#c678dd",
  "icon": "fa-solid fa-gamepad", "lane": 620, "side": 1, "order": 3 }
```

`lane` = the branch's horizontal position; `side` = which side topics/gates hang off.

## A book page (Atlas / Map book / App Specs)

Each book is a folder with an `index.json` manifest + markdown pages:

```json
{ "title": "C# Syntax Atlas",
  "parts": [ { "id": "part-1", "title": "Part I — The Language",
      "pages": [ { "id": "04-types", "title": "Types", "file": "part-1/04-types.md" } ] } ] }
```

Pages are ordinary markdown; **tag code fences with the language** (` ```csharp `, ` ```java `,
` ```c `) so they get syntax highlighting.

## Adding a node without touching files: the New Node form

On the **Map** tab there's a **➕ New node** button (top-right, beside Guiding Arrow). It opens a
form — pick the *kind* and *branch*, give an *id* and *label*, and (for a topic) its parent
chapter and order. On **Create node** it writes the node's `.md` file into your editable folder
for you, wires a topic into its parent chapter's `topics: [...]`, and refreshes the map. Fill in
the deeper bits (body prose, `example:`, `atlas:`, `important:`) by editing that file afterwards.
Use the form to scaffold; use the files for everything else.

## Recipes

- **Reword a lesson / fix a typo:** edit the node's body or a book page, relaunch.
- **Add a topic:** use the **New node** form (fastest), or by hand: create
  `nodes/<branch>/<id>.md` (set `group`, `order`) and add its id to the parent chapter's
  `topics: [...]`.
- **Add a whole branch off a crossroad:** add `branches/<id>.json` (pick a free `lane`), then add
  its chapter nodes with `prereqs: ["<crossroad-id>"]`. Lanes are data-driven — no code change.
- **Add an Atlas / Map-book page:** drop the `.md` in the book folder and add an entry to that
  book's `index.json`.
- **Give a node a rainbow ring:** add `important: true`.
- **Remove content:** delete the file (and any id references to it).

## Caveat when developing

If you edit files under **`src-tauri/curriculum-seed/`** while running `npm run tauri dev`,
Tauri recompiles and restarts the app (the defaults are embedded at build time). Editing the
**app-data `curriculum/` folder** does not — just relaunch.
