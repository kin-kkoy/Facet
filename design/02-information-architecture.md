# 02 · Information Architecture

## Three spatial scopes + one cross-cutting layer

Facet has almost no hierarchy. Instead of folders and files it has **nested spatial
scopes** you move between by zooming, plus a single overlay layer for knowledge.

```
WORKSPACE  (the whole canvas: every Study + the Concept layer)
   │  zoom in
   ▼
STUDY      (one bounded investigation: a titled frame holding a cluster of cards)
   │  zoom in
   ▼
CARD       (one perspective: source / runtime / structure / steps / note / prediction)

   ┅┅┅ CONCEPT LAYER ┅┅┅  (cross-cutting: Concept nodes + links, overlaid on everything)
```

### Workspace
The top-level canvas. Everything you've ever studied lives here as spatial regions.
You don't "open a project" — you pan/zoom to the area you were thinking in. There is
exactly **one** workspace per person (with JSON export for backup/branching).

### Study
The core organizing object. A Study is a **titled frame** around a cluster of cards,
carrying a driving **question** ("How does reversing a list rewire `next`?"). A Study:
- can be **collapsed** to a single tile (for zoom-out / reuse),
- can be **dropped into another Study** as a referenced tile — this composition is how
  the knowledge map grows,
- is the unit you'd **export, review, or "quiz me" on** later.

### Card
The atom. One card = one perspective on the concept. Types: `source`, `runtime`,
`structure`, `steps`, `note`, `prediction` (see [`05-data-model.md`](05-data-model.md)).
Cards are movable, editable, linkable, and collapsible.

### Concept layer (the knowledge map)
Not a place you navigate *to* — a layer that's *always there*, usually invisible. A
**Concept** is a durable idea ("closures capture variables, not values"; "reference
types alias"). Cards `demonstrate` Concepts; Concepts link to each other. When you
**zoom all the way out**, cards fade and the Concept + link graph becomes the view.
That view *is* the "knowledge mapping" deliverable — with zero extra subsystem.

## Navigation model

| Want to… | Do this | Not this |
|---|---|---|
| Go to something you studied | **Zoom/pan** to its region; or search | Open a file/tab |
| See how ideas relate | **Zoom out** to the Concept layer | Open a separate mind-map app |
| Focus on one perspective | **Zoom in** to a card | Maximize a window |
| Jump by meaning | Follow a **link** to a Concept or related Study | Hunt through a tree |
| Find anything | **⌘/Ctrl-K** command palette + search | Sidebar file explorer |

Three deliberate absences: **no file tree, no tabs, no folders.** Position and links
carry the organization instead. This is the "spatial rather than document-centric"
constraint made literal.

## Semantic zoom (what renders at each level)

| Zoom | You see | Cards render as |
|---|---|---|
| Far | The Concept map — Concepts + collapsed Study tiles + links | dots / titles only |
| Mid | Inside one Study — all its cards laid out spatially | headers + summary |
| Near | One card, editable | full detail |

Zoom is the primary navigation gesture; the same `{x, y, zoom}` camera drives all three.

## Persistence & identity

- **One JSON document** (localStorage in the prototype; a single file you can sync later).
- Stable `id`s on every node/edge so links survive moves and edits.
- **Export/import** the whole workspace, or a single Study, as JSON — that's the entire
  "sharing/backup" story. No server. See [`05-data-model.md`](05-data-model.md).
