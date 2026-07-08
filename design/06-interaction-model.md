# 06 · Interaction Model

How the workspace *feels* to use: the sync mechanics that make perspectives move
together, the gestures, and the three runtime modes.

## Synchronization — the cheap version that feels expensive

Two mechanisms, no constraint engine.

### 1. The shared step cursor
Each Study's `steps` card holds a single integer `cursor`. Moving it (slider, `◀ ▶`,
`space` to play) applies `steps.items[cursor]` to every card at once:

```
                      ┌──────────────── steps.cursor = 3 ───────────────┐
                      │                                                 │
   Source card ◀──────┤ activeLine → highlight line 6                   │
   Structure card ◀───┤ pointerMoves + edgeRewires → animate arrows     │
   Runtime card ◀─────┤ vars → show prev=1, curr=2, next=2              │
   Transport bar ◀────┤ narration → "flip node 1's link to prev"        │
                      └─────────────────────────────────────────────────┘
```

One source of truth (`cursor`), fanned out to subscribers. That's the *entire* "multiple
synchronized perspectives" implementation. Cheap, predictable, debuggable.

### 2. Name-based highlighting
Hovering (or selecting) a token highlights every matching **Anchor** across cards:
hover `curr` in the Source card → `curr` lights up in the Runtime card's var list and
the Structure card's pointer arrow. Matching is by label string in the MVP; a later
Roslyn pass makes it semantic (distinguishing two different `curr`s in different scopes).

## Gestures & input

| Gesture | Action |
|---|---|
| Drag empty canvas | Pan |
| Mouse wheel / pinch | Zoom (semantic zoom levels) |
| Drag a card | Move it |
| Drag card body edge → another card | Create a **link** (pick kind on drop) |
| Double-click empty canvas | **Radial add-card menu** at cursor |
| Double-click a card | Zoom to *near* level (edit that perspective) |
| Click card, then Esc | Deselect / hide inspector |
| `⌘/Ctrl-K` | Command palette (create, jump, search, export) |
| `←` / `→` | Step cursor back / forward |
| `space` | Play / pause the step sequence |
| `f` | Frame-select to fit current Study |
| `⌘/Ctrl-Z` | Undo (single linear history over the JSON graph) |

Design stance: **keyboard for verbs, mouse for space.** No modal tool palette — you're
never "in rectangle mode." The radial menu and palette replace a toolbar.

## Editing model
- Every card is directly editable at *near* zoom; edits write straight to the JSON graph
  and autosave to localStorage (debounced).
- **Prediction lock:** once you type a prediction and press *Run/Step*, the prediction
  text is locked (visibly) until you *Reveal actual*. This enforces "predict before you
  peek" — the one bit of friction we add on purpose.
- **Compare:** on reveal, Facet diffs prediction text/values against the Runtime/Step
  state and marks the card `match` or `mismatch`, highlighting the differing token(s).

## The three runtime modes

A single toggle on the Runtime card. Same slots, three sources of truth:

| Mode | Where values come from | Cost | Purpose |
|---|---|---|---|
| **Manual** (default) | *You type them* | zero integration | Forces you to track state — most learning |
| **Simulated** | Canned script attached to the Study | zero integration | Fast replay of a worked example; **badged SIMULATED** |
| **Live .NET** *(roadmap)* | Real Roslyn / `dotnet-script` eval | needs a backend | Truth for open-ended experiments |

In the prototype the **Live** toggle is present but **stubbed** — flipping it shows the
simulated data with a `SIM` badge and a tooltip: *"A real run would call
`CSharpScript.EvaluateAsync` here."* This lets you feel the affordance without building
the backend (see [`08-roadmap.md`](08-roadmap.md), P2).

Why manual is the default, not live: the goal is *understanding*, and typing `curr = 2`
yourself is the moment the model forms. Live execution is for verification and
exploration, which come later.

## Feedback & motion
- Step transitions **animate** (short, eased) so pointer moves and rewires are legible —
  a jump-cut hides the very thing you're trying to see.
- Mismatch is the only thing that uses the alert hue; it's rare, so it reads as *"look
  here."*
- Nothing else auto-animates; the canvas is calm unless you're stepping.
