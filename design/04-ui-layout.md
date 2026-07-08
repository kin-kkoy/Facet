# 04 · UI Layout & UX Mockups

Design intent: **calm, spatial, chrome-light.** The canvas is the whole screen; UI
appears only when summoned. If a textbook is a stack of pages, Facet is a quiet table
you spread things out on.

## Screen anatomy (mid-zoom, inside a Study)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Reverse a singly linked list                                   ⌘K   ◔ zoom  │  ← thin ribbon: Study title + question (top-left), palette + zoom hint (right)
│ "What exactly happens to next on each node?"                                 │
│                                                                              │
│    ┌─ Source ───────────────┐        ┌─ Structure (linkedlist) ──────────┐   │
│    │ 1 Node Reverse(head){  │        │                                   │   │
│    │ 2   prev = null;       │        │   prev      curr     next         │   │
│    │ 3   curr = head;   ◀───┼─sync──▶│    ▼         ▼        ▼            │   │
│    │ 4   while(curr!=null){ │        │  [1|•]──▶ [2|•]──▶ [3|•]──▶ null   │   │
│    │ 5     next=curr.Next;  │        │                                   │   │
│    │ …                      │        └───────────────────────────────────┘   │
│    └────────────────────────┘                                                │
│                                                                              │
│    ┌─ Prediction ───────────┐        ┌─ Runtime  [Manual|Sim ▸] SIMULATED┐   │
│    │ After step 3, curr = 2 │        │  prev = 1   curr = 2   next = 2   │   │
│    │        [ Reveal actual]│        │  console: (none)                  │   │
│    └────────────────────────┘        └───────────────────────────────────┘   │
│                                                                              │
│    ┌─ Note ─────────────────┐                                                │
│    │ The list is never      │      ◀ ▮▮ ▶  ├─────●──────────┤  step 3 / 6   │  ← shared step transport (drives every card)
│    │ broken; next is saved… │      "flip node 1's link to prev"             │
│    └────────────────────────┘                                                │
│                                                                              │
│ ┌─────┐                                                              search🔍│
│ │ mini│  ← minimap (bottom-left)                                            │
│ └─────┘                                                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

Key layout rules:
- **One ribbon, top.** Study title + question on the left; command-palette hint and
  zoom control on the right. No multi-row toolbars.
- **Transport bar** (`◀ ▮▮ ▶` + slider + narration) is the *only* persistent control
  at mid-zoom, because stepping is the core verb. It drives the shared cursor.
- **Minimap** bottom-left; **search** bottom-right. Both muted until hovered.
- **Inspector** (card properties) is not a fixed panel — it slides in from the right
  edge *only when a card is selected*, and slides away when you deselect. Calm by default.

## The three semantic-zoom levels

**Far — Concept map (the knowledge deliverable):**
```
        ┌ Pointers ┐
        │          │──demonstrates──┐
   ┌────┴────┐              ┌────────┴─────────┐
   │ Reverse │──relates──▶ │ BST delete       │
   │  list   │             │ (Study tile)     │
   └─────────┘             └──────────────────┘
        │ demonstrates
   ┌────┴───────────────┐
   │ Save-before-mutate │  ← a Concept
   └────────────────────┘
```
Studies collapse to tiles; Concepts and links become the foreground.

**Mid — inside a Study:** the anatomy diagram above.

**Near — one card:** full editor for that perspective (code editor, note markdown,
structure editor, etc.). Everything else dims.

## Adding things — radial menu, no toolbar

Double-click empty canvas → a small **radial menu** of card types appears at the cursor:

```
        ◍ Source
   ◍ Note        ◍ Runtime
        ◍ Structure
   ◍ Predict     ◍ Steps
```

No palette of buttons cluttering the edge. Creation happens *where you're looking*.

## Visual language (calm & spatial)

- **Palette:** warm paper background, soft ink, one restrained accent for the active
  step/highlight. Surprise/mismatch uses a single alert hue — used sparingly so it
  *means* something.
- **Cards:** rounded corners, soft shadow, thin type-coloured top border to tell types
  apart at a glance (source / runtime / structure / note / prediction).
- **Links:** gentle bezier curves, low contrast; labeled only on hover.
- **Motion:** pointer arrows and box rewires **animate** between steps (short, eased) —
  motion is what makes an algorithm legible; nothing else moves on its own.
- **Typography:** monospace inside Source/Runtime/Structure; humanist sans for notes and
  chrome. Roomy line-height. No dense grids.

The mockup in [`../mockup/index.html`](../mockup/index.html) realizes this layout with
live interaction and canned data.
