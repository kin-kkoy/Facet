# Onboarding

**Facet** is a desktop app for learning C# / .NET by *doing*, not just reading. It bundles a
skill-tree curriculum, a runnable C# lab, a syntax reference, and an AI tutor into one window
so you don't juggle four apps.

## The core loop

1. **Map** — open the concept map (skill tree). It shows the whole curriculum as connected
   nodes. Turn on the **Guiding Arrow** and it points at the next best thing to do.
2. **Learn** — read the concept in **Map (book)** (the curriculum as a readable book) and the
   exact syntax in the **Atlas**. Each map node also has a *Syntax Companion* that jumps
   straight to the relevant Atlas pages.
3. **Do** — go to **Study**, write C# in the Roslyn sandbox, hit **Compile & Run**, and watch
   it execute step-by-step in the visualizer *lenses* (Flow, Data Structures, OOP, …).
4. **Prove it** — at a **Checkpoint** (hexagon) or **Project** node, copy the generated prompt
   into your own Claude Code session for a closed-book exam / "defend your code" oral, then
   tick the node complete.

## First run

- Nothing to configure to start learning. Progress is saved automatically.
- To use the AI features (Tutor, code Refine, Note clean-up, Supercompile), open **Settings
  (⚙️)** and paste an **OpenRouter** or **Google Gemini** API key — free-tier models work.
  Keys are stored locally on your device.

## The tabs

| Tab | What it's for |
|---|---|
| **Map** | The interactive skill tree — your progress, prerequisites, the Guiding Arrow. |
| **Map (book)** | The same curriculum as a linear book to read and learn from. |
| **Atlas** | A C# syntax reference "book" (types, LINQ, async, …) with C#-vs-Java/C notes. |
| **Study** | The C# lab: editor, Compile & Run, and the visualizer lenses. |
| **App Specs** | This cookbook — how the app works and how to change its content. |

See **Features** for what each part does, and the **Cookbook** pages for how to edit the
curriculum and books without rebuilding the app.
