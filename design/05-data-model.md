# 05 · Data Model

One principle: **the whole workspace is a single graph of nodes and edges**, stored as
one JSON document. There is no separate "notes database," "diagram format," or
"knowledge graph store" — those are all just node/edge types in the same graph. This is
the data-layer expression of *one substrate, not four subsystems*.

```
Workspace = { studies[], cards[], concepts[], links[], camera, meta }
```

## Nodes

### Card
The atom on the canvas.
```jsonc
{
  "id": "card_9f",
  "type": "source | runtime | note | prediction | structure | steps",
  "studyId": "study_1",         // which Study frame it belongs to
  "x": 320, "y": 140,           // world coords
  "w": 300, "h": 200,
  "z": 3,                       // stacking
  "collapsed": false,
  "content": { /* type-specific, see below */ },
  "createdAt": "2026-07-02T10:00:00Z",
  "updatedAt": "2026-07-02T10:12:00Z"
}
```

**`content` by type:**
```jsonc
// source
{ "lang": "csharp", "code": "Node Reverse(Node head){ ... }" }

// runtime
{ "mode": "manual | sim | live",
  "output": "",
  "returnValue": "Node(1)",
  "vars": [ { "name": "prev", "value": "1" }, { "name": "curr", "value": "2" } ] }

// prediction
{ "text": "After step 3, curr = node 2",
  "revealed": false,
  "verdict": "unset | match | mismatch" }

// note
{ "markdown": "The list is never broken; `next` is saved first." }

// structure  — the box-and-arrow diagram
{ "kind": "linkedlist | tree | array | stack | queue | graph",
  "nodes":    [ { "id": "n1", "label": "1", "value": 1 }, { "id": "n2", "label": "2", "value": 2 } ],
  "edges":    [ { "from": "n1", "to": "n2", "kind": "next | child | ref", "label": "" } ],
  "pointers": [ { "name": "curr", "nodeId": "n2" }, { "name": "prev", "nodeId": "n1" } ],
  "layout": "auto | manual" }

// steps  — the animation timeline for the algorithm
{ "cursor": 3,                  // current step index (the SHARED cursor)
  "items": [ /* Step[] */ ] }
```

### Step
One atom of an algorithm animation. Stepping the cursor to index *i* applies
`items[i]` across **every** card in the Study — that's the synchronization.
```jsonc
{
  "id": "step_3",
  "activeLine": 6,                                   // → highlights in the Source card
  "narration": "flip node 1's link to prev",         // → shown on the transport bar
  "pointerMoves":  [ { "name": "curr", "toNodeId": "n2" } ],   // → Structure card
  "nodeHighlights": [ "n1" ],
  "edgeRewires":   [ { "from": "n1", "to": null } ], // node 1's next now → null
  "vars":          [ { "name": "prev", "value": "1" }, { "name": "curr", "value": "2" } ] // → Runtime card
}
```
A Step is intentionally **declarative and hand-authorable** (or template-generated). In
the MVP nothing has to *execute* to produce it — see [`09-mvp-minimization.md`](09-mvp-minimization.md).

### Study
A titled frame; groups cards; collapses to a tile.
```jsonc
{ "id": "study_1", "title": "Reverse a singly linked list",
  "question": "What happens to next on each node?",
  "x": 100, "y": 80, "w": 900, "h": 620,
  "color": "sand", "collapsed": false }
```

### Concept
A durable idea — the reusable knowledge object; the nodes of the zoomed-out map.
```jsonc
{ "id": "concept_ptr", "name": "Save-before-mutate when rewiring pointers",
  "aliases": ["pointer surgery"],
  "summary": "Cache the next reference before overwriting it, or you lose the tail." }
```

### Anchor (lightweight, often implicit)
The **sync handle** that lets perspectives highlight together. Kinds: `variable`,
`line`, `node`, `step`. In the MVP anchors are mostly implicit — a variable anchor is
just "the string `curr` appears here" (name-based highlighting), a line anchor is a line
number, a node anchor is a structure node id. Making anchors *explicit and semantic*
(via Roslyn) is a roadmap item, not an MVP need.
```jsonc
{ "id": "anchor_curr", "kind": "variable", "label": "curr" }
```

## Edges

### Link
Every relationship — card↔card, card↔concept, concept↔concept, study↔study.
```jsonc
{ "id": "link_5", "fromId": "note_2", "toId": "concept_ptr",
  "kind": "facet-of | demonstrates | answers | contradicts | references | derived-from" }
```
- `facet-of` — two cards are perspectives of the same concept (drives group sync).
- `demonstrates` — a card/Study shows a Concept in action.
- `answers` / `contradicts` — a Note resolves or challenges a Prediction/Concept.
- `references` / `derived-from` — soft relations for the map.

**The knowledge map is not stored separately** — it's the subgraph of `Concept` nodes
plus `Link` edges of kind `demonstrates | references | contradicts`, rendered when you
zoom out.

## Camera & meta
```jsonc
"camera": { "x": 0, "y": 0, "zoom": 1 },
"meta":   { "schemaVersion": 1, "title": "My C# workspace" }
```

## Persistence & portability
- **Storage:** one JSON blob in `localStorage` (prototype) → one file on disk (later).
- **Export/import:** whole workspace *or* a single Study subtree as JSON. That is the
  entire backup/sharing story — no accounts, no server.
- **Stability:** every node/edge has an immutable `id`; positions and content can change
  freely without breaking links.
