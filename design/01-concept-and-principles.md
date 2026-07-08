# 01 · Concept & Principles

## The problem this solves

Self-studying C#/.NET, the dangerous moment is not "I don't understand this" — it's
**"I read it and I think I understand it."** Passive reading produces a fluent-feeling
but wrong mental model that only breaks later, expensively. Facet is built to force
that break *early and cheaply*, on purpose, over and over.

Everything below is subordinate to that goal. If a feature doesn't make a wrong mental
model surface faster, it doesn't belong here.

## What Facet is / is not

| Facet **is** | Facet **is not** |
|---|---|
| A thinking surface for one learner | A team IDE or editor |
| Spatial, calm, canvas-first | Document/tab/file-tree centric |
| A place to be *wrong on purpose* then fix it | An autocomplete / productivity tool |
| A generator of reusable knowledge objects | A generator of throwaway screenshots |

## Core principles

1. **One concept, many synchronized facets.** Source, runtime, structure diagram,
   and notes are *views of the same thing* and update together. Splitting attention
   across un-synced windows is what textbooks already do badly.

2. **Everything is a movable, editable card.** No read-only "output panes." If it's on
   the canvas you can grab it, edit it, annotate it, and link it.

3. **Visualizations are objects, not images.** A linked-list animation you build is
   saved, named, re-openable, and droppable into another Study — not a static PNG.

4. **Notes, questions, and diagrams live *in* the workspace**, next to the thing they're
   about — never in a separate app you'll never reopen.

5. **Active over passive.** The primary verb is not "read," it's **predict**, then
   **run/step**, then **compare**. Annotation and experimentation are first-class.

6. **Calm and spatial.** Muted palette, generous whitespace, chrome hidden until asked
   for. You navigate by *moving through space*, not by clicking tabs.

## Assumptions challenged

The prompt names four big capabilities. Taken literally each is a multi-month build.
Each row below is a place we chose *understanding* over *completeness*.

| Assumption in the brief | Why it's questionable for **learning** | What Facet does instead |
|---|---|---|
| Needs a **live runtime debugger** | A debugger is a *productivity* tool. The learning happens when *you* state what a variable holds and get corrected — not when a pane fills itself in. | Manual + simulated capture in the MVP; "wire to real .NET" is a deferred, stubbed toggle. |
| Needs a **timeline / time-travel** view | Time-travel over a real process is among the hardest things to build, and most of its value is just before/after comparison. | A **hand-authored Step sequence** + one shared cursor. Authoring the steps *is* the learning. |
| Needs **automatic object-graph** layout | Dumping an arbitrary heap is noisy; auto-layout buries the one structure you care about under twenty you don't. | Intentional **Structure cards** — you draw/template the *single* structure under study. |
| **Knowledge mapping** is its own subsystem | A separate graph tool becomes a second inbox you stop maintaining. | The map is emergent: **the links you already drew, viewed zoomed-out.** No graph DB. |
| **Synchronized perspectives** need a real engine | A general constraint solver is huge and unnecessary at this scale. | Shared **step cursor** + **name-based highlighting**. Feels magical, costs almost nothing. |
| A learning tool needs **accounts/cloud/collab** | It's for one person. | localStorage + JSON export. Full stop. |

**Nuance worth repeating:** box-and-arrow algorithm visuals are *core and in the MVP*.
What we defer is **auto-generating** them from a running process. You author (or
template) the diagram and its steps — see [`07`](07-algorithm-and-structure-visualization.md).

## The simplification that pays for everything

> Don't build four subsystems. Build **one canvas of typed, linkable cards**, and let
> the four "features" be card types and zoom levels.

That single decision is what keeps an ambitious brief inside a one-person MVP. The rest
of these docs are mostly consequences of it.
