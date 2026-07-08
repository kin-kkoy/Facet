# Facet

> A personal, spatial workspace for **understanding** C# and .NET — not for shipping code faster.
> Working name; trivially renameable.

Facet is a single infinite canvas where the same concept is visible from several
**synchronized perspectives** at once — the source code, the runtime values, a
box-and-arrow diagram of the data structure, your own notes and predictions — all
sitting side by side and moving together as you step through an algorithm.

It exists to fight one specific failure mode of self-study: *reading code and
believing you understood it*. Facet makes you **predict** before you **run/step**,
then shows you exactly where your mental model was wrong, and lets you pin that
correction somewhere you'll see it again.

---

## The one idea

**One substrate, not four apps.** "Code visualization + runtime inspection +
whiteboarding + knowledge mapping" is not four subsystems — it's **one canvas of
typed, linkable cards** seen at different zoom levels:

| The prompt asked for… | In Facet it's just… |
|---|---|
| code visualization | a **Source** card |
| runtime inspection | a **Runtime** card (manual / simulated / — later — live .NET) |
| algorithm & data-structure visuals | a **Structure** card (boxes + arrows) + a **Step** sequence |
| whiteboarding | **Note** cards + the canvas itself |
| knowledge mapping | *nothing new* — it's what you see when you **zoom out** and look at the links |

Everything is a **Card**. A cluster of related cards is a **Study**. Links between
cards — and the **Concepts** they point to — are the knowledge map. That's the
whole architecture: `canvas + card types + links + semantic zoom`.

## The loop that does the teaching

**Predict → Run/Step → Compare → Annotate → Link.**
You write what you *think* will happen before running or stepping; Facet diffs your
prediction against reality and highlights the mismatch. The surprise is the point.

## Step-by-step algorithm visualization is first-class

A **Structure** card draws a linked list as boxes (`value | next`) joined by arrows,
with `prev`/`curr`/`next` shown as labeled pointer arrows. A **Step** sequence plays
the algorithm one move at a time; a single shared *step cursor* keeps the source
line, the pointer arrows, and the runtime values **in lock-step**. See
[`design/07-algorithm-and-structure-visualization.md`](design/07-algorithm-and-structure-visualization.md).

---

## What's deliberately NOT here (and why)

Facet is aggressively small on purpose. The full reasoning is in
[`design/09-mvp-minimization.md`](design/09-mvp-minimization.md); the short version:

- **No live debugger in the MVP.** A debugger optimizes *productivity*; articulating
  state yourself optimizes *understanding*. Manual/simulated capture, with a stubbed
  "wire to real .NET" toggle for later.
- **No time-travel over real memory.** You author a Step sequence by hand — that
  authoring *is* the learning — and get before/after comparison almost for free.
- **No automatic heap dump.** Auto-laying-out an arbitrary object graph is noisy and
  anti-pedagogical. You draw the *one* structure that matters.
- **No graph database for "knowledge mapping."** The links you already drew, viewed
  zoomed-out, are the map.
- **No accounts, cloud, or collaboration.** It's for one person. localStorage + JSON export.

## Run the prototype

Open [`mockup/index.html`](mockup/index.html) directly in a browser — no server, no
build, no dependencies. It's a **static prototype with canned data**; anything that
would need a real .NET runtime is clearly labeled **SIMULATED**.

Try this:
1. Use the **▶ / step slider** on the *Reverse a linked list* Study and watch the
   pointer arrows move, the boxes rewire, the source line highlight, and the runtime
   values update — all together.
2. Fill in the **Prediction** card, then hit **Reveal actual** to see the diff.
3. Flip the Runtime card between **Manual** and **Simulate live .NET** (note the badge).
4. Hover a variable name (`curr`) to see it highlight across every card.
5. Hit **Zoom to concepts** to see this Study as a tile in the knowledge map.

---

## Map of the design docs

| File | Deliverable it covers |
|---|---|
| [`design/01-concept-and-principles.md`](design/01-concept-and-principles.md) | Core principles + challenged assumptions |
| [`design/02-information-architecture.md`](design/02-information-architecture.md) | Information architecture |
| [`design/03-user-workflow.md`](design/03-user-workflow.md) | User workflow |
| [`design/04-ui-layout.md`](design/04-ui-layout.md) | UI layout + UX mockups (wireframes) |
| [`design/05-data-model.md`](design/05-data-model.md) | Data model |
| [`design/06-interaction-model.md`](design/06-interaction-model.md) | Interaction model |
| [`design/07-algorithm-and-structure-visualization.md`](design/07-algorithm-and-structure-visualization.md) | Step-by-step algorithm visuals |
| [`design/08-roadmap.md`](design/08-roadmap.md) | Future roadmap |
| [`design/09-mvp-minimization.md`](design/09-mvp-minimization.md) | Keeping the MVP small |
| [`mockup/index.html`](mockup/index.html) | UX mockup (interactive) |
