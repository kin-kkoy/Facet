# Build & Release

## Prerequisites
- Node + npm, the Rust toolchain, and the **.NET SDK** (for `facet-engine`).
- Fresh checkout: `cd facet-app && npm install` (the repo is source-only — `node_modules`,
  `target`, and `dist` are gitignored).

## Run in development
```
cd facet-app
npm run tauri dev        # vite dev server on :1420 + the Rust app window
```
Editing `src/**` hot-reloads. Editing `src-tauri/**` (including `curriculum-seed/`) triggers a
Rust recompile + app restart.

## Type-check / build the frontend only
```
npm run build            # tsc + vite build → dist/
```

## Release build
```
npm run tauri build
```
Artifacts land in `facet-app/src-tauri/target/release/bundle/` (`appimage/*.AppImage`,
`deb/*.deb`, etc.). There is **no auto-updater** — updating means building a new bundle and
replacing the installed one. User data (progress, settings, the editable `curriculum/` folder)
lives in the OS app-data dir and survives updates.

## Versioning
Bump the version in **both** `src-tauri/tauri.conf.json` and `package.json`.

## Known gotcha
On Linux, AppImage bundling can fail to include **`librsvg-2.0`** (used for SVG icons). If a
build breaks there, ensure the librsvg dev package is installed on the build machine. See
`UPDATING.md` at the repo root for the current details.

## Repo map
- `facet-app/src/` — React frontend · `facet-app/src-tauri/` — Rust shell + embedded
  `curriculum-seed/` · `facet-engine/` — .NET Roslyn engine · `design/` — design docs ·
  `README.md`, `ARCHITECTURE.md`, `UPDATING.md` — product/architecture/ops notes.
