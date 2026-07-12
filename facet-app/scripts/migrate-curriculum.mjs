// One-time migration: convert the single public/curriculum/curriculum.json (+ the
// module/checkpoint markdown docs) into an editable, per-node folder that the app
// reads at runtime. Also re-emits an *enriched* compiled curriculum.json (branch
// lane/side + node laneOffset/side) that stays as the browser-dev fallback.
//
// Output:
//   src-tauri/curriculum-seed/
//     meta.json
//     branches/<branch>.json            (adds lane / side / order for layout)
//     nodes/<branch>/<id>.md            (YAML frontmatter + lesson/companion body)
//   public/curriculum/curriculum.json   (overwritten, enriched — dev fallback)
//
// Run from facet-app/:  node scripts/migrate-curriculum.mjs
//
// No npm deps — YAML frontmatter is hand-emitted so this runs before `npm install`.
// The RUNTIME loader parses these files with js-yaml (a real dependency).

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');                       // facet-app/
const CUR = join(APP, 'public', 'curriculum');         // source content
const SEED = join(APP, 'src-tauri', 'curriculum-seed');// output seed folder

// ── Layout enrichment ────────────────────────────────────────────────────
// Mirrors the constants that used to be hardcoded in utils/curriculum.ts so
// that lanes are now pure data. Adding a branch later = add a branch file.
const BRANCH_META = {
  core:    { lane: 0,    side: 1,  order: 0 },
  backend: { lane: -600, side: -1, order: 1 },
  cloud:   { lane: 0,    side: -1, order: 2 },
  game:    { lane: 620,  side: 1,  order: 3 },
};
// Per-node lane/side overrides (were the UNITY / GODOT special-cased sets).
const NODE_OVERRIDE = {
  u01: { laneOffset: -280, side: -1 }, u02: { laneOffset: -280, side: -1 },
  cpg1: { laneOffset: -280, side: -1 }, 'pg-unity': { laneOffset: -280, side: -1 },
  gd01: { laneOffset: 280, side: 1 }, gd02: { laneOffset: 280, side: 1 },
  cpg2: { laneOffset: 280, side: 1 }, 'pg-godot': { laneOffset: 280, side: 1 },
};

// ── YAML emission (single-line scalars via JSON; multi-line via literal block)
function yamlScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(String(v)); // JSON double-quoted string is valid YAML
}
function yamlArray(arr) {
  return '[' + arr.map((x) => yamlScalar(x)).join(', ') + ']';
}
function yamlBlock(key, text) {
  // literal block scalar, strip-chomped (|-) so no trailing newline is added.
  const lines = String(text).split('\n').map((l) => (l.length ? '  ' + l : ''));
  return `${key}: |-\n${lines.join('\n')}`;
}

// Field order for readable frontmatter. `example` handled separately (block scalar).
const FIELD_ORDER = ['id', 'kind', 'branch', 'tier', 'order', 'group', 'label',
  'icon', 'est', 'doc', 'cert', 'checkpoint', 'defense', 'important', 'atlas', 'laneOffset', 'side',
  'prereqs', 'topics'];

function frontmatter(node) {
  const out = [];
  for (const k of FIELD_ORDER) {
    if (!(k in node)) continue;
    const v = node[k];
    if (Array.isArray(v)) out.push(`${k}: ${yamlArray(v)}`);
    else out.push(`${k}: ${yamlScalar(v)}`);
  }
  // example: null → simple; non-null (code) → literal block for readability.
  if ('example' in node) {
    if (node.example == null) out.push('example: null');
    else out.push(yamlBlock('example', node.example));
  }
  return out.join('\n');
}

// ── Load source ──────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(join(CUR, 'curriculum.json'), 'utf8'));
const realNodes = raw.nodes.filter((n) => n.id && n.kind);
const byId = new Map(realNodes.map((n) => [n.id, n]));

function branchOf(node) {
  if (node.branch) return node.branch;
  if (node.group && byId.get(node.group)?.branch) return byId.get(node.group).branch; // topics
  return 'core';
}
function readDoc(docPath) {
  if (!docPath) return '';
  const p = join(CUR, docPath);
  return existsSync(p) ? readFileSync(p, 'utf8').trim() : '';
}

// ── Fresh seed folder (only nodes/branches/meta — preserve atlas/) ───────
for (const sub of ['nodes', 'branches', 'meta.json']) {
  const p = join(SEED, sub);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}
mkdirSync(join(SEED, 'branches'), { recursive: true });
mkdirSync(join(SEED, 'nodes'), { recursive: true });

// meta.json
writeFileSync(join(SEED, 'meta.json'), JSON.stringify(raw.meta, null, 2) + '\n');

// branches/<b>.json  (id + label/color/icon + enriched lane/side/order)
for (const [id, b] of Object.entries(raw.branches)) {
  const meta = BRANCH_META[id] ?? { lane: 0, side: 1, order: 99 };
  const rec = { id, label: b.label, color: b.color, icon: b.icon, ...meta };
  writeFileSync(join(SEED, 'branches', `${id}.json`), JSON.stringify(rec, null, 2) + '\n');
}

// nodes/<branch>/<id>.md
let count = 0;
for (const node of realNodes) {
  const b = branchOf(node);
  const enriched = { ...node, ...(NODE_OVERRIDE[node.id] ?? {}) };
  const body = node.kind === 'chapter' || node.kind === 'checkpoint' ? readDoc(node.doc) : '';
  const md = `---\n${frontmatter(enriched)}\n---\n\n${body ? body + '\n' : ''}`;
  const dir = join(SEED, 'nodes', b);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${node.id}.md`), md);
  count++;
}

// ── Enriched compiled fallback (browser dev only) ────────────────────────
const compiled = {
  meta: raw.meta,
  branches: Object.fromEntries(Object.entries(raw.branches).map(([id, b]) => {
    const meta = BRANCH_META[id] ?? { lane: 0, side: 1, order: 99 };
    return [id, { ...b, ...meta }];
  })),
  nodes: raw.nodes.map((n) => (n.id ? { ...n, ...(NODE_OVERRIDE[n.id] ?? {}) } : n)),
};
writeFileSync(join(CUR, 'curriculum.json'), JSON.stringify(compiled, null, 2) + '\n');

console.log(`✓ Wrote ${count} node files + ${Object.keys(raw.branches).length} branches to curriculum-seed/`);
console.log(`✓ Re-emitted enriched public/curriculum/curriculum.json (dev fallback)`);
