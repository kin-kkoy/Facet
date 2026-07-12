# Feature Reference

A quick tour of every feature and where it lives in the code.

## Map (skill tree)
The curriculum as a graph. **Node kinds:** chapter (big circle), topic (small circle),
crossroad (diamond), checkpoint (hexagon), project (hexagon). **Branches:** Core, Backend/Web,
Cloud/DevOps, Game. Node **status** is derived: *completed* (ticked), *available* (all
prerequisites done), *locked*. Click a node for its detail popover; double-click a node with an
example to load it into the Study lab. *(`MapView.tsx`, `curriculum.ts`)*

## Guiding Arrow
A toggle beside **Reset view**. When on, a solid arrow points at the **next best action**:
the next incomplete topic, then its chapter, then the checkpoint, and so on. It orients from
the side a node branches off (← / → / ↓). At a **crossroad** it shows a **road picker**
(e.g. Backend / Cloud / Game); your choice is remembered and the arrow follows that path.
*(`recommendNext()` in `curriculum.ts`)*

## Rainbow rings
Top-priority skills carry `important: true`. When you **complete** such a node, a static
rainbow ring appears around it to mark mastery of a high-value skill. *(no animation/glow)*

## Map (book)
The concept map rendered as a readable book — concept explanations, C#-vs-Java/C notes, the
relevant Atlas syntax folded in, and the practice angle. For learning on slow days without the
internet or AI.

## Atlas + Syntax Companion
A C# syntax reference book (Part I–VI + appendices: types, OOP, collections, modern C#,
concurrency, the .NET ecosystem). Each map node maps to Atlas pages via its `atlas:` field;
the node's **Syntax Companion** buttons jump straight there.

## Study (the lab)
A **Roslyn sandbox**: write C#, hit **Compile & Run**, and step through execution in the
**lenses** — Flow (debugger-style), Data Structures, OOP Concepts, Recursion, Algorithm,
Complexity. Panels: **Source** (editor + AI *Refine*), **Runtime** (variables + predict-next),
**Note** (with AI clean-up). *Supercompile* uses the AI to stub missing types so partial code
still runs. *(`LabView.tsx`, panels, visualizers)*

## AI Tutor
A right-side chat drawer with two modes: **Socratic** (asks probing questions, never gives
answers) and **Tutor** (gives real answers *and* the reasoning). Powered by OpenRouter or
Gemini (your key). *(`SocraticDrawer.tsx`, `ai.ts`)*

## Checkpoints & project defenses
Gates that can't be self-graded. Their detail popover generates a **copy-paste prompt for your
own Claude Code session** — a closed-book exam (checkpoint) or a "defend your code" oral
(project). Pass it, then tick the node. *(`handoff.ts`)*
