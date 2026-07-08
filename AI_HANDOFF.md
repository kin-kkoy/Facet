# AI Handoff Prompt & Project State

Welcome! If you are reading this, you are the next AI assistant picking up development on **Facet**.

**Facet** is an interactive computer science education suite built with **Tauri + React + Vite** on the frontend, and a **C# Roslyn** engine on the backend. It allows users to write C# code, executes it instantly, and visualizes exactly what happens under the hood (memory pointers, AST flowcharts, etc.).

---

## 📂 Codebase Structure
The project has been strictly organized. Please respect this structure:
- `facet-app/` - The Tauri + React frontend.
  - `src/components/layout/` - Shell components (`LabView`, `MapView`, `VisualizerShell`).
  - `src/components/panels/` - Left/Bottom UI panels (`SourcePanel`, `RuntimePanel`, `NotePanel`).
  - `src/components/modals/` - Floating/Overlay UI (`SettingsModal`, `SocraticDrawer`).
  - `src/components/visualizers/` - The individual educational "Lenses" (e.g., `DataStructureVisualizer.tsx`).
- `facet-engine/` - The C# backend engine.
  - `Program.cs` - Contains the `CSharpSyntaxRewriter` for injecting traces, the `SyntaxTreeAnalyzer` for building the AST, and the Reflection logic for deep-copying the memory heap.

---

## ✅ What Has Been Implemented (Current State)
1. **The Roslyn Engine:** It successfully parses code, builds a static AST, injects trace statements per line, deeply reflects the Heap (handling circular references via `ref_x` ID mapping), and emits everything as a giant JSON object.
2. **The IPC Pipeline:** Tauri smoothly triggers the C# executable and streams the JSON back to React.
3. **Data Structure Visualizer:** Renders the memory `heap` using a custom, high-performance SVG drawing engine to map `ref` pointers (No React Flow/heavy libraries used).
4. **Flowchart Visualizer:** Renders the `ast` statically using a sleek "Nested Block" aesthetic that visually wraps inner branches rather than drawing chaotic spaghetti lines. It actively highlights the executing block based on the transport slider.

---

## 🎨 UI & Aesthetic Rules (CRITICAL)
- The app uses a highly customized **glassmorphism / dark hacker** aesthetic. Do NOT convert this to generic Tailwind.
- Continue using absolute positioning, SVG paths, and CSS filters (`backdrop-filter: blur()`, `box-shadow`) to maintain the premium feel.
- Colors must stick to the palette defined in `index.css` (e.g., `var(--bg0)`, `var(--accent)`).

---

## 🚀 Next Steps (The Backlog)
When you resume work with the user, these are the remaining lenses/features to build:
1. **OOP Concepts Visualizer:** Leverage the existing Heap data to draw class hierarchies and inheritance trees.
2. **Recursion Visualizer:** Parse the `stack` traces to build a Call Tree diagram showing recursive function depths and return values.
3. **Complexity (Big O) Analyzer:** Enhance the Roslyn `SyntaxTreeAnalyzer` to mathematically calculate loop depth and plot growth charts.
4. **Algorithm Animation Mode:** Add a speed slider to automatically scrub the transport timeline and highlight array sorting swaps.

Please ask the user which feature they want to tackle first, and refer to `ARCHITECTURE.md` if you need deeper context on the engine!
