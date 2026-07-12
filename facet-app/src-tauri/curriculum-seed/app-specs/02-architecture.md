# Architecture

Facet is a **Tauri v2** desktop app. Three layers:

## 1. Frontend — React 19 + Vite (TypeScript)
`facet-app/src/`

- `App.tsx` — top-level shell: the tab bar (`Map · Map (book) · Atlas · Study · App Specs`) and
  the mounted views (kept mounted, toggled with `display` so state survives tab switches).
- `components/layout/MapView.tsx` — the skill tree. Renders nodes/edges as SVG in **world
  coordinates**; panning only mutates the SVG `viewBox` (no React re-render) so it stays
  smooth. Hosts the Guiding Arrow, the crossroad road-picker, rainbow rings, and the node
  detail popover with the Syntax Companion.
- `components/layout/BookView.tsx` — one generic reader (sidebar + markdown pane) used by the
  Atlas, Map (book), and App Specs tabs.
- `components/layout/LabView.tsx` — the Roslyn sandbox + visualizer lenses + panels
  (Source / Runtime / Note).
- `components/Markdown.tsx` — react-markdown + remark-gfm + rehype-highlight (code highlighting).
- `utils/curriculum.ts` — loads the curriculum, computes the tree layout, derives node status,
  and recommends the next action (Guiding Arrow).
- `utils/book.ts` — generic book loader (`loadBook(dir)`); `utils/atlas.ts` is a thin alias.
- `utils/progress.ts`, `utils/ai.ts`, `utils/studies.ts`, `utils/files.ts` — persistence + AI.

## 2. Native shell — Rust (`facet-app/src-tauri/`)
`src/lib.rs` exposes three commands to the frontend via `invoke`:

- `execute_csharp(code)` — pipes your C# into the `.NET` **facet-engine** and returns a trace.
- `load_curriculum()` — returns **every** `.json`/`.md` file under the editable curriculum
  folder (nodes, branches, atlas, mapbook, app-specs). Seeds that folder on first run from the
  defaults **embedded in the binary** (`include_dir!` over `curriculum-seed/`).
- `curriculum_path()` — the absolute path of that editable folder.

## 3. Execution engine — .NET / Roslyn (`facet-engine/`)
A separate .NET program that compiles and runs your snippet with Roslyn, does static AST
analysis and dynamic tracing (variable/heap state per step), and emits JSON the lenses render.

## Persistence
User data uses **`tauri-plugin-store`** (JSON files in the OS app-data dir):
`progress.json` (completed nodes, Guiding-Arrow state, chosen roads), `settings.json`
(AI provider/keys/model, teaching mode, theme), `studies.json`, `lab.json`. These survive
app updates because they live in the data dir, not the bundle.
