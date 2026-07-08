# 09 · Keeping the MVP Small

The brief explicitly asks to fight feature bloat and challenge assumptions. This doc is
the ledger of every cut, why it's safe *for learning*, and what the MVP actually is.

## The cuts (and why each is safe)

| Cut | Tempting version | Why we don't need it for the MVP | Kept instead |
|---|---|---|---|
| **Four subsystems → one** | Separate visualizer, debugger, whiteboard, graph tool | Each is months of work and they'd never stay in sync | One canvas of typed, linkable cards |
| **Live .NET execution** | Embedded runtime, real debugging | Learning comes from *articulating* state; execution is verification, which can wait | Manual + simulated capture; stubbed toggle |
| **Auto Step generation** | Instrument code → auto-animate | *Authoring the steps by hand IS the learning*; auto-gen is high-effort, high-risk | Hand-authored / templated steps |
| **Automatic heap dump** | Reflect the whole object graph, auto-layout | Noise buries the one structure you care about | Intentional Structure card of a single structure |
| **Time-travel debugger** | Record/replay real memory | Among the hardest things to build; ~all the value is before/after compare | Discrete Step cursor over authored steps |
| **Knowledge-graph subsystem** | Graph DB, backlinks engine | Becomes a second inbox you stop feeding | Links you already drew, seen at zoom-out |
| **Semantic parsing (Roslyn)** | Real variable/scope resolution for sync | Name-string matching is 90% as good for one learner | Name-based highlighting |
| **Accounts / cloud / collab** | Sync service, sharing, multiplayer | It's for one person | localStorage + JSON export |
| **Template library** | Big catalog of prebuilt algorithms | Nice, but the loop works with zero templates | Deferred to P1 |
| **Free-ink whiteboarding** | Full drawing engine | Note cards + the canvas cover the essential need | Deferred to P1 |

## What the MVP *is*, in one sentence

> An infinite canvas of movable cards where you **predict**, then **step through a
> hand-authored algorithm animation** (or type runtime values), **see the diff**,
> **annotate** it, and **link** it to a concept — saved to localStorage.

That's it. Six card types, one shared step cursor, links, semantic zoom.

## Smallest-possible build order (inside P0)

Build in this order; each step is demoable on its own:
1. **Canvas + camera** — pan/zoom, draw a placeholder card. (Feels like a workspace.)
2. **Cards + JSON model + autosave** — create/move/edit/persist Source & Note cards.
3. **Structure card** — render a linked list (boxes + arrows) from data.
4. **Steps + shared cursor** — transport bar animates pointers + highlights source line.
5. **Runtime card + modes** — manual entry; simulated playback; stubbed live toggle.
6. **Prediction + compare** — lock, reveal, diff-highlight.
7. **Links + Concept zoom-out** — draw links; render the map at far zoom.

If time runs out, stopping after **step 4** already demonstrates the core magic
(synchronized perspectives on an algorithm). Steps 5–7 add the active-learning loop and
the knowledge map.

## Guardrails against creep
- **Every new feature must answer:** *"does this make a wrong mental model surface
  faster?"* If not, it's out (or it's a P1+ nicety).
- **No feature that only saves clicks.** Productivity is explicitly not the goal.
- **Prefer one more card type over one more subsystem.** The substrate is the moat;
  keep new capability expressible as cards + links + steps.
- **The simulated/manual escape hatch stays forever.** Even after live .NET lands, you
  must be able to run the whole loop with zero backend.

## The single riskiest assumption to validate first
Not a technical one — a pedagogical one: **does forcing a prediction before each
run/step actually improve understanding for you?** Build steps 1–4 + a minimal
prediction affordance, use it on ten real C# concepts for a week, and judge. If the
predict/compare habit doesn't stick or doesn't help, the whole premise needs rethinking
*before* any P1+ investment. Everything else is comparatively cheap to change.
