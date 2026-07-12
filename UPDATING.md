# Updating & Releasing Facet — notes for future AI sessions

> Read this before helping with builds, updates, or "how do I ship a new version".

## What Facet is (why updates work the way they do)
Facet is a **Tauri desktop app**, not a hosted web app:
- Frontend: React + Vite in `facet-app/`
- Native shell: Rust in `facet-app/src-tauri/`
- C# execution engine: Roslyn in `facet-engine/`

It compiles to a **native binary** (on Linux: an AppImage + a `.deb`). There is **no server and no "push-to-deploy"** like Vercel — **any code change requires a rebuild** to produce a new binary.

## Build
This repo is kept **source-only** (no `node_modules`/`target` — they're gitignored and ~6 GB).
On a fresh clone/checkout, restore deps first:
```bash
cd facet-app
npm install              # restore node_modules (first time only)
npm run tauri build      # runs `npm run build` (tsc + vite) then compiles Rust in release mode
```
(First build after a clean checkout recompiles all Rust deps — several minutes.)
Artifacts land in `facet-app/src-tauri/target/release/bundle/`:
- `appimage/*.AppImage` (portable — double-click to run)
- `deb/*.deb`

For day-to-day work you don't build at all — `npm run tauri dev` runs it live (port 1420; `fuser -k 1420/tcp` first if the port is taken).

## User data is SAFE across rebuilds/updates
Studies (files + chats + notes), settings/API keys, and curriculum progress persist via the Tauri store to the **OS user-data dir**, *not* inside the app bundle:
- Linux: `~/.local/share/com.makkaon.facet-app/` → `studies.json`, `settings.json`, `progress.json`

Because this is outside the bundle, **replacing the AppImage never wipes user data.** (App identifier: `com.makkaon.facet-app`.)

## Versioning
Bump the version in **both** files and keep them in sync:
- `facet-app/src-tauri/tauri.conf.json` → `"version"`
- `facet-app/package.json` → `"version"`

Current: **0.1.0**.

## Current update strategy — "A" (manual)
No auto-updater is wired in yet (`tauri-plugin-updater` is **not** installed; `bundle.targets` = `"all"`).
- To update: change code → `npm run tauri build` → replace the installed AppImage with the new one. Data persists.
- This is the right choice while it's single-user / local.

## Future update strategy — "B" (auto-update, for real releases)
The owner plans future releases (e.g. **additional language support like C++**). When distributing to other people, set this up:
1. **`tauri-plugin-updater`** in `src-tauri` — the installed app checks a remote manifest, downloads, and self-updates. Needs a **signing keypair** (`npx tauri signer generate`); the app verifies update signatures with the public key. Keep the private key + password secret (GitHub Actions secrets).
2. **GitHub Actions + `tauri-action`** — on a version-tag push, auto-build every target, publish to **GitHub Releases**, and generate the updater manifest (`latest.json`). This is the "push a tag → it builds & ships → installed apps self-update" flow (as close to Vercel as a desktop app gets).
3. **CRITICAL:** the updater must be baked into the **first released build**. A build made *without* the updater cannot self-update — users would have to manually replace it once to get an updater-enabled version. So decide on "B" *before* the first public release.

The repo is already initialized locally (git, branch `main`). Add a GitHub remote when ready:
```bash
gh repo create facet --private --source=. --remote=origin --push
```

## Gotchas
- **Moved directory:** the project was relocated to `~/Documents/Projects/Finished/facet`. After a move, Cargo may recompile the Rust `target/` from scratch **once** (absolute-path change). Normal, just slower that one time.
- **Don't commit build artifacts:** `.gitignore` excludes `node_modules/`, `**/target/`, `dist/`, `**/bin/`, `**/obj/` (that's ~4 GB).

### AppImage bundling fails: `no 'libdir' variable for 'librsvg-2.0'`  ← IMPORTANT, recurs
The `.deb`/`.rpm` build fine, but the **AppImage** step (`linuxdeploy-plugin-gtk`) needs the
pkg-config file `librsvg-2.0.pc` (from `librsvg2-dev`) to locate & bundle the SVG loader. If that
`-dev` package isn't installed, bundling dies with:
`there is no 'libdir' variable for 'librsvg-2.0' library`.

Two fixes:
1. **With sudo (cleanest):** `sudo apt install librsvg2-dev` then rebuild.
2. **Without sudo (what was used here):** synthesize the missing `.pc` and point pkg-config at it:
   ```bash
   mkdir -p ~/.cache/tauri-extra-pc
   cat > ~/.cache/tauri-extra-pc/librsvg-2.0.pc <<'PC'
   prefix=/usr
   libdir=/usr/lib/x86_64-linux-gnu
   includedir=/usr/include
   Name: librsvg
   Description: librsvg (synthetic .pc for AppImage bundling)
   Version: 2.0.0
   Libs: -L${libdir} -lrsvg-2
   Cflags: -I${includedir}
   PC
   cd facet-app
   PKG_CONFIG_PATH="$HOME/.cache/tauri-extra-pc:$PKG_CONFIG_PATH" APPIMAGE_EXTRACT_AND_RUN=1 \
     npm run tauri build -- --bundles appimage
   ```
   (Adjust `libdir` if `librsvg-2.so.2` lives elsewhere: `ldconfig -p | grep rsvg`.)

Notes: changing `PKG_CONFIG_PATH` forces a one-time rebuild of the `*-sys` crates (webkit2gtk-sys etc.).
`APPIMAGE_EXTRACT_AND_RUN=1` also avoids FUSE issues if `linuxdeploy` (itself an AppImage) can't mount.
Artifacts land in `facet-app/src-tauri/target/release/bundle/{appimage,deb,rpm}/`.
