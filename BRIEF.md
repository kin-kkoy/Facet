# Facet — Project Brief & Ideation Context

> **Purpose of this document.** A self-contained context dump you can paste into a
> fresh conversation to keep ideating on Facet without re-explaining anything. It says
> what the app is, who it's for, what's been decided and built, what's deliberately
> *not* done, and where the open questions are. "Facet" is a placeholder name.

---

## 1. What it is, in one paragraph

Facet is a **personal workspace for *understanding* C# and .NET** — not an IDE,
not a productivity tool. It is designed as a **UI Mask layered on top of CS Visualizer**,
leveraging all of its capabilities while providing a structured, panel-based layout. 
The same programming concept is shown from several **synchronized perspectives at once** 
— the source code, the runtime values, a box-and-arrow diagram of the data structure, 
and your own notes and predictions — all sitting side by side and moving together as 
you step through an algorithm. It exists to fight one specific failure of self-study: 
*reading code and believing you understood it.* Facet makes you **predict before you 
run/step**, then shows you exactly where your mental model was wrong.

## 2. Who it's for and what it optimizes

- **One person** (the learner). No teams, accounts, cloud, or collaboration.
- Optimizes **understanding / mental-model formation**, explicitly **not** productivity
  or speed. If a feature only saves clicks, it doesn't belong.
- The vibe target: **calm, focused, and structured** — a clean panel layout,
  rather than an overwhelming IDE or infinite canvas.

## 3. The core design bet (the thing everything hangs on)

> **One cohesive view, not four disjoint tools.** Don't build a code-visualizer + a debugger +
> a whiteboard + a knowledge-graph app. Build **a unified panel interface**, leveraging CS Visualizer's 
> capabilities under the hood. Let notes be designated blocks where handwritten input transforms into text.

| The ambition | In Facet it's just… |
|---|---|
| code visualization | a **Source** panel |
| runtime inspection | a **Runtime** panel |
| algorithm / data-structure visuals | an **Algorithm** panel powered by CS Visualizer capabilities |
| data structure reference | a small floating **Legend** overlay on the Algorithm panel |
| note-taking | a designated **Note** block supporting **handwriting-to-text** via drawing pad. (Write directly on the block, press `Tab` to parse and continue). |
| freeform sketching | a dedicated **Scratch Pad** panel for testing your mental model with a drawing pad before coding. |
| knowledge mapping | a **Map** tab inside a Study |

Vocabulary:
- **Sidebar** = The main navigation container listing all your **Studies**.
- **Study** = The reusable knowledge object (e.g., *"How does reversing a linked list rewire `next`?"*). Each Study is opened from the sidebar and has two main views: a **Map** and a **Lab**.
- **Map View** = A high-level, gamified visual node graph (styled like an "RPG Stat Tree" with terminal/hacker aesthetics) showing how this Study connects to broader CS **Concepts** and other Studies. Generated dynamically.
- **Lab View (Study Tab)** = The working area containing synchronized **Panels** (Source, Algorithm, Runtime, Note, Scratch Pad). Note that prediction challenges are baked directly into the Runtime panel.
- **Concept** = A durable idea ("Pointer variables"). Studies *demonstrate* Concepts; Concepts link to each other. The map is built automatically via metadata tags on Studies, or auto-detected from keywords in the Source code.
- **Shared step cursor** = one integer per Study Lab; moving it updates *every* panel at once.

## 4. The signature interaction (the pedagogy)

**Predict → Run/Step → Compare → Annotate → Link.**
1. Write/paste a snippet (Source card).
2. Write what you *think* will happen — *before* running/stepping (Prediction card).
3. Run it (manual / simulated / — later — live .NET) **or** step the algorithm.
4. Facet **diffs prediction vs actual and highlights the mismatch.** The surprise is the learning.
5. Annotate the surprise (Note card).
6. Link the insight to a Concept → the knowledge map grows.

Steps 2 and 4 (predict, then get corrected) are the non-negotiable heart. A tool that
skips "predict" trains recognition, not understanding.

## 5. What has been produced so far

A full **design package + a working interactive prototype**, all in `facet/`:

- `README.md` — overview + how to run the mockup.
- `design/01…09` — nine markdown docs: concept & principles, information architecture,
  user workflow, UI layout (with wireframes), data model (JSON schema), interaction
  model, **algorithm & structure visualization**, roadmap, and MVP-minimization.
- `mockup/index.html` — a **single self-contained HTML file** (vanilla JS/CSS, no build,
  no dependencies). Static prototype with **canned data**.

### What the prototype actually demonstrates (verified working in-browser)
- Infinite canvas: pan (drag), zoom (wheel / buttons), draggable cards.
- **Step-by-step algorithm visualization**: *reverse a singly linked list* drawn as
  boxes (`value | next`) + arrows, with `prev`/`curr`/`next` as moving labeled pointers;
  reversed (backward) arrows render as the list flips; the node being mutated pulses.
- **Synchronized perspectives** from one shared step cursor: scrubbing the transport
  highlights the source line, moves the pointers, rewires the boxes, and updates the
  runtime values *together*, with a narration line.
- **Predict → Reveal** with a real diff (the "is the list broken after the first flip?" surprise).
- **Runtime mode toggle**: *Manual* (you type values) vs *Live .NET* — the latter clearly
  badged **⚠ SIMULATED**, with a tooltip noting where `CSharpScript.EvaluateAsync` would attach.
- **Cross-card variable highlight** (hover `curr` → highlights everywhere).
- **Zoom to concepts** → the knowledge-map overlay.

## 6. What is DECIDED / locked (so we don't relitigate)

- One-person tool; understanding over productivity; calm & structured.
- Built on top of CS Visualizer capabilities.
- Study / Panel / Concept / Link / Step vocabulary and the single JSON-graph data model.
- Synchronization = **shared step cursor + name-based highlighting**, deliberately NOT a
  general constraint engine.
- Runtime has three modes: **manual (default), simulated, live** — and manual/simulated
  must always work with **zero backend**, forever.
- Persistence = **localStorage + JSON export**. No server.
- Algorithm/structure visuals are **first-class and in the MVP**, but **hand-authored or
  templated**, *not* auto-generated from a running process (in the MVP).

## 7. What is DEFERRED / NOT built (and why)

Everything here is a conscious cut, not an oversight (see `design/09-mvp-minimization.md`):

| Deferred | Why it's not in the MVP | Where it lands |
|---|---|---|
| **Live .NET execution** (real Roslyn/`dotnet-script` backend) | Learning comes from articulating state; execution is verification, which can wait. Toggle exists but is stubbed. | Roadmap P2 |
| **Auto-generating step animations from a real run** | High effort/risk; hand-authoring the steps *is* the learning. | Roadmap P3 |
| **Automatic object-graph / heap dump** | Noisy, anti-pedagogical; buries the one structure you care about. | Shallow, on-demand only, later |
| **Time-travel over real memory** | Among the hardest things to build; ~all the value is before/after compare. | Covered by the Step cursor instead |
| **Template library** of algorithms | The loop works with zero templates. | Roadmap P1 |
| **Handwriting to text** | Write via drawing pad directly on Note blocks. Hotkey (`Tab`) instantly parses ink to text at caret so you can keep writing continuously. | Idea |
| **Auto-detection of Concepts** | Scanning source code to dynamically tag and link concepts (e.g., detecting `Node` implies `Pointers`). | Idea |
| **Semantic parsing (Roslyn) for sync** | Name-string matching is ~90% as good for one learner. | Roadmap P3 |
| **Spaced-repetition / "quiz me" review** | Only pays off once you have a body of Concepts. | Roadmap P4 |
| **Accounts / cloud / collaboration** | It's for one person. | Not planned |
| **The name, branding, visual identity** | "Facet" is a placeholder. | Open |

## 8. AI Integration Strategy (via OpenRouter)

AI is used as an opt-in enhancement, strictly designed not to break the core pedagogical loop. It leverages OpenRouter for flexible model access:
- **Toggleable Socratic Tutor:** During the prediction phase, an optional AI tutor can provide guiding hints rather than direct answers. Since this can sometimes be annoying when you just want a direct answer, it is fully toggleable.
- **Roadmap Generation (Map View):** Instead of just auto-tagging, the AI analyzes the concepts and *generates the entire roadmap* for the Map view. It builds the skill tree paths (unlit nodes), which then light up as you complete Studies, exactly like a PoE stat tree.
- **Note Refinement:** A manual "Refine w/ AI" button in the Note block. It cleans up parsed handwriting into polished, authentic notes. It includes an input field for extra instructions.
- **Code Optimization:** A "Refine w/ AI" button on the Source block that analyzes your code and proposes a more efficient, readable version with explanations for why the changes are better.

## 9. Known rough edges in the current prototype

- It's a **static demo with canned data** — cards aren't truly created/deleted/persisted;
  the one Study (linked-list reversal) is hardcoded.
- Pointer motion between steps is **instant** (redraw), not tweened/animated.
- The concept map and templates are illustrative, not interactive/editable.
- No real editing pipeline (the Source card isn't a real code editor; the Structure card
  can't yet be hand-built from scratch in the UI).

## 10. Open questions worth ideating on

**Pedagogy / product**
- Is "predict before every step" the right amount of friction, or will it get tedious?
  What's the lightest version that still forces a mental model?
- Should predictions be **free-text** (fuzzy to diff) or **structured** (pick a value /
  draw the pointer)? The prototype uses a mix.
- What's the *smallest* set of algorithm/structure templates that covers most early
  C#/.NET learning? (linked list, array, stack/queue, BST, graph BFS/DFS, a sort?)
- Does the "knowledge map = links at zoom-out" idea actually stay useful as it grows, or
  does it turn into spaghetti? What keeps it legible at 50+ Concepts?

**Scope / sequencing**
- Is manual-first genuinely better for *you*, or do you want live .NET sooner than P2?
- Is C#/.NET the right first domain, or should the substrate be language-agnostic from
  day one (with C# as the first "pack")?

**Interaction / spatial model**
- Is semantic zoom (Workspace ⇄ Study ⇄ Card) the right navigation, or is it disorienting
  without a minimap/breadcrumb? 
- How do you *author* a Structure + Step sequence without it being tedious? (This is the
  crux of whether the tool is usable day-to-day.)

**Meta**
- What's the single riskiest assumption to test first? (Current answer: the *pedagogical*
  one — does forcing prediction actually help — testable with just canvas + steps +
  a minimal predict affordance, before any further build.)
- Build target when it's real: single-file vanilla (like the mockup) → small web app →
  or a C#/.NET desktop app as dogfooding?

## 11. How to run what exists

Open `facet/mockup/index.html` in any browser (no server/build). Drag the transport
slider or press ← / → / space to step; hover a variable; toggle the runtime mode; click
"Zoom to concepts."

---

### One-line version for a fresh chat
*"I'm designing 'Facet', a calm spatial canvas for understanding C#/.NET where one
concept is shown as synchronized cards (source, runtime, box-and-arrow structure, notes)
that step through an algorithm together, and the core loop is predict → step → compare →
annotate → link. A design package + a working single-file prototype (linked-list reversal
demo) exist; live .NET, auto-animation, templates, and review are deferred. I want to
ideate on: [your topic]."*
