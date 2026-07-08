# 08 · Future Roadmap

Phased so that **each phase is independently useful** and the hardest/riskiest work is
last. You could stop after P0 and still have a real learning tool.

## P0 — MVP · "the loop works"
The smallest thing that delivers Predict → Step → Compare → Annotate → Link.
- Infinite canvas: pan, zoom, draggable cards (`{x,y,zoom}` camera).
- Card types: **Source, Prediction, Note, Runtime (manual + simulated), Structure, Steps.**
- **Structure card** (box-and-arrow) + **hand-authored Step sequences** with the shared
  step cursor synchronizing source line ↔ pointer arrows ↔ runtime values.
- Study frames; links between cards and to Concepts; **zoom-out Concept map**.
- localStorage persistence + JSON export/import.
- Live-.NET toggle **present but stubbed** (shows simulated data, badged).

**Explicitly out of P0:** live execution, auto heap capture, semantic parsing, templates,
review/spaced-repetition, ink. (See [`09-mvp-minimization.md`](09-mvp-minimization.md).)

## P1 — "less authoring friction"
Make the good MVP faster to use.
- **Template library** of structures/algorithms (linked list, BST, stack/queue, BFS/DFS,
  a sort) — fork-and-study starting points.
- More `structure` kinds and nicer auto-layout for each.
- **Free-ink / arrow annotation** layer over any card or the canvas (real whiteboarding).
- Multi-select, group-move, duplicate-Study.

## P2 — "wire to real .NET"
Flip the stubbed toggle into truth.
- Small local backend exposing Roslyn scripting (`CSharpScript.EvaluateAsync`) or
  `dotnet-script`.
- Runtime card **Live** mode: real console output + return value + top-level variable
  capture for a snippet.
- Keep manual/simulated as first-class — live is *additive*, never the only path.

## P3 — "the computer authors the animation"
The genuinely hard, genuinely valuable step.
- **Auto-generate Step sequences from a real run**: instrument the snippet (or walk the
  Roslyn syntax tree + trace) to produce real `activeLine` / `vars` / `pointerMoves`.
- Semantic **Anchors** (distinguish two `curr`s in different scopes) → better name-sync.
- Shallow, on-demand heap view for a *chosen* object (still not a full auto heap dump).

## P4 — "remember what you learned"
Turn the accumulated map into active recall.
- **Spaced-repetition review** over Concept cards and past Predictions.
- **"Quiz me"**: replay a Study with values hidden, ask you to predict each step.
- Export a Study as a self-contained, replayable artifact (shareable, or just archival).

## Sequencing rationale
- P0 proves the *pedagogy* (does the predict/step/compare loop actually help?) with the
  least code. Everything after is optional acceleration.
- Live .NET (P2) is deferred past templates (P1) because *manual capture teaches more*;
  execution is for verification, which matters once the habit exists.
- Auto-authoring (P3) is last among build features because it's the highest-effort,
  highest-risk piece — and P0's hand-authoring already delivers the visual.
- Review (P4) only pays off once you *have* a body of Concepts worth reviewing.
