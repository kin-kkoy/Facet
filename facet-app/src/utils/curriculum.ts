// Loads the curriculum and computes a skill-tree layout (positions + edges) plus
// derives per-node status from the user's completed set.
//
// Source of truth is the user-editable per-node folder (nodes/<branch>/<id>.md +
// branches/<b>.json), read at runtime via the Rust `load_curriculum` command — so
// adding/removing nodes or whole branches needs no rebuild. In the browser (plain
// `npm run dev`, no Tauri) it falls back to the bundled compiled curriculum.json.

import yaml from 'js-yaml';

export interface RawNode {
  id: string;
  kind: 'chapter' | 'topic' | 'crossroad' | 'checkpoint' | 'project';
  branch?: string;
  tier?: number;
  order?: number;
  group?: string;         // topic → its chapter id
  label: string;
  icon?: string;
  summary?: string;
  est?: string;
  doc?: string;
  cert?: string;
  example?: string | null;
  defense?: boolean;
  prereqs?: string[];
  topics?: string[];
  checkpoint?: string;
  laneOffset?: number;    // horizontal nudge off the branch lane (e.g. Unity/Godot sub-lanes)
  side?: -1 | 1;          // which side topics/gates hang; overrides the branch default
  body?: string;          // markdown lesson / syntax-companion prose (from the node file)
  important?: boolean;    // a top-priority skill — gets a rainbow ring once completed
  atlas?: string[];       // Syntax Atlas page ids that are this node's companion (#3)
}

export interface Branch {
  label: string;
  color: string;
  icon: string;
  lane?: number;          // x position of this branch's spine
  side?: -1 | 1;          // default side topics/gates hang off
  order?: number;
}

export interface Curriculum {
  meta: any;
  branches: Record<string, Branch>;
  nodes: RawNode[];
}

// ── parsing the editable folder (Tauri path) ─────────────────────────────
interface CurriculumFile { path: string; content: string; }

function parseFrontmatter(text: string): { data: any; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  let data: any = {};
  try { data = yaml.load(m[1]) ?? {}; } catch { data = {}; }
  return { data, body: m[2] ?? '' };
}

function assembleCurriculum(files: CurriculumFile[]): Curriculum {
  let meta: any = {};
  const branches: Record<string, Branch> = {};
  const nodes: RawNode[] = [];
  for (const f of files) {
    const path = f.path.replace(/\\/g, '/');
    if (path === 'meta.json') {
      try { meta = JSON.parse(f.content); } catch { /* keep default */ }
    } else if (path.startsWith('branches/') && path.endsWith('.json')) {
      try {
        const b = JSON.parse(f.content);
        const id = b.id ?? path.slice('branches/'.length, -'.json'.length);
        branches[id] = b;
      } catch { /* skip a malformed branch file */ }
    } else if (path.startsWith('nodes/') && path.endsWith('.md')) {
      const { data, body } = parseFrontmatter(f.content);
      if (data && data.id && data.kind) nodes.push({ ...data, body: body.trim() || undefined });
    }
  }
  return { meta, branches, nodes };
}

export interface LaidOutNode extends RawNode {
  x: number;
  y: number;
  color: string;
}

export interface Edge { from: string; to: string; kind: 'spine' | 'topic'; }

export type Status = 'completed' | 'available' | 'locked';

// ── layout constants ─────────────────────────────────────────────
const ROW_H = 300;       // vertical distance per tier
const TOPIC_DX = 190;    // horizontal offset of a topic column from its chapter
const TOPIC_V = 60;      // vertical spacing between stacked topics
const GATE_DX = 120;     // checkpoint/project offset from the spine

// Lane (x) and side are now pure data: each branch declares its lane/side, and a
// node may nudge itself with laneOffset/side (e.g. the Unity/Godot sub-lanes). So a
// brand-new branch off a crossroad lays out correctly with no code change here.
function laneOf(n: RawNode, branches: Record<string, Branch>): number {
  const b = branches[n.branch ?? 'core'];
  return (b?.lane ?? 0) + (n.laneOffset ?? 0);
}
// Which side the topic column / gates hang off (keeps them out of neighbor lanes).
function sideOf(n: RawNode, branches: Record<string, Branch>): number {
  if (n.side === -1 || n.side === 1) return n.side;
  return branches[n.branch ?? 'core']?.side ?? 1;
}

export async function loadCurriculum(): Promise<Curriculum> {
  // In the desktop app, read the user-editable folder via Rust.
  if ((window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const files = await invoke<CurriculumFile[]>('load_curriculum');
      return assembleCurriculum(files);
    } catch (e) {
      console.error('Falling back to bundled curriculum:', e);
    }
  }
  // Browser/dev fallback: the bundled compiled snapshot.
  const res = await fetch('/curriculum/curriculum.json');
  const data = await res.json();
  data.nodes = (data.nodes as any[]).filter((n) => n.id && n.kind); // drop _section markers
  return data as Curriculum;
}

export function layout(cur: Curriculum): { nodes: LaidOutNode[]; edges: Edge[]; bounds: { minX: number; minY: number; maxX: number; maxY: number } } {
  const byId = new Map(cur.nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const colorFor = (n: RawNode) => cur.branches[n.branch ?? 'core']?.color ?? '#61afef';

  // 1) Chapters, crossroads on their branch lane at tier height.
  for (const n of cur.nodes) {
    if (n.kind === 'chapter' || n.kind === 'crossroad') {
      pos.set(n.id, { x: laneOf(n, cur.branches), y: (n.tier ?? 0) * ROW_H });
    }
  }

  // 2) Topics: stacked column beside their chapter, ordered.
  const topicsByGroup = new Map<string, RawNode[]>();
  for (const n of cur.nodes) if (n.kind === 'topic' && n.group) {
    (topicsByGroup.get(n.group) ?? topicsByGroup.set(n.group, []).get(n.group)!).push(n);
  }
  for (const [gid, topics] of topicsByGroup) {
    const chap = byId.get(gid);
    const cp = chap && pos.get(gid);
    if (!chap || !cp) continue;
    topics.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const n = topics.length;
    if (chap.branch === 'core') {
      // Core spine: scatter topics on BOTH sides, surrounding the parent.
      const left = topics.filter((_, k) => k % 2 === 1);
      const right = topics.filter((_, k) => k % 2 === 0);
      const place = (arr: RawNode[], sign: number) => arr.forEach((t, k) =>
        pos.set(t.id, { x: cp.x + sign * TOPIC_DX, y: cp.y + (k - (arr.length - 1) / 2) * TOPIC_V }));
      place(right, 1); place(left, -1);
    } else {
      const side = sideOf(chap, cur.branches);
      topics.forEach((t, k) => pos.set(t.id, { x: cp.x + side * TOPIC_DX, y: cp.y + (k - (n - 1) / 2) * TOPIC_V }));
    }
  }

  // 3) Checkpoints sit ON the spine between chapters; projects hang to the side.
  // Checkpoints anchor on chapters (placed above); projects anchor on checkpoints,
  // so place ALL checkpoints before ANY project — otherwise a project whose gate
  // isn't positioned yet falls back to the origin. Order-independent of file order.
  const gates = cur.nodes
    .filter((n) => n.kind === 'checkpoint' || n.kind === 'project')
    .sort((a, b) => (a.kind === 'checkpoint' ? 0 : 1) - (b.kind === 'checkpoint' ? 0 : 1));
  for (const n of gates) {
    const anchorId = n.prereqs?.[0];
    const ap = anchorId ? pos.get(anchorId) : null;
    const anchor = anchorId ? byId.get(anchorId) : null;
    if (!ap || !anchor) { pos.set(n.id, { x: 0, y: 0 }); continue; }
    if (n.kind === 'checkpoint') {
      // midway down the spine between this chapter and the next.
      pos.set(n.id, { x: ap.x, y: ap.y + ROW_H * 0.5 });
    } else {
      // project defense — off to the side of its gate/chapter.
      pos.set(n.id, { x: ap.x + sideOf(anchor, cur.branches) * (GATE_DX + 120), y: ap.y + ROW_H * 0.25 });
    }
  }

  // Any leftover unplaced node → origin (defensive).
  const nodes: LaidOutNode[] = cur.nodes.map((n) => {
    const p = pos.get(n.id) ?? { x: 0, y: 0 };
    return { ...n, x: p.x, y: p.y, color: colorFor(n) };
  });

  // Edges: prereq links (spine) + chapter→topic links.
  const edges: Edge[] = [];
  for (const n of cur.nodes) {
    for (const p of n.prereqs ?? []) if (byId.has(p)) edges.push({ from: p, to: n.id, kind: 'spine' });
    if (n.kind === 'chapter') for (const t of n.topics ?? []) if (byId.has(t)) edges.push({ from: n.id, to: t, kind: 'topic' });
  }

  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  return { nodes, edges, bounds };
}

// A chapter may only be marked complete once all its topics are complete.
export function topicsComplete(chapter: RawNode, completed: Set<string>): boolean {
  return (chapter.topics ?? []).every((t) => completed.has(t));
}

// Status: a node is completed if ticked; available if every prereq is completed
// (topics follow their chapter's availability); else locked.
export function statusOf(id: string, byId: Map<string, RawNode>, completed: Set<string>): Status {
  if (completed.has(id)) return 'completed';
  const n = byId.get(id);
  if (!n) return 'locked';
  if (n.kind === 'topic' && n.group) {
    const chapStatus = statusOf(n.group, byId, completed);
    return chapStatus === 'locked' ? 'locked' : 'available';
  }
  const prereqs = n.prereqs ?? [];
  if (prereqs.length === 0) return 'available';
  // Crossroads are navigational pass-throughs: a prereq crossroad counts as
  // satisfied once it is itself reachable (available), not only when ticked.
  const satisfied = (p: string): boolean => {
    if (completed.has(p)) return true;
    const pn = byId.get(p);
    return pn?.kind === 'crossroad' && statusOf(p, byId, completed) !== 'locked';
  };
  return prereqs.every(satisfied) ? 'available' : 'locked';
}

// ── Guiding Arrow: recommend the next best action ────────────────────────
// `roads` maps a crossroad id → the child node id the user committed to, so the
// recommendation follows the chosen branch and doesn't flip-flop between paths.

export interface RoadOption { id: string; label: string; color: string; }
export type Recommendation =
  | { type: 'node'; id: string }                                           // point the arrow here
  | { type: 'fork'; crossroadId: string; label: string; roads: RoadOption[] } // ask the user to choose
  | { type: 'done' }                                                       // everything actionable is complete
  | { type: 'none' };                                                      // nothing to point at yet

// successors: prereq edges + chapter→topic membership (so a chapter's topics count
// as its descendants for "has this branch been started?" checks).
function buildSucc(nodes: RawNode[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const push = (k: string, v: string) => { (m.get(k) ?? m.set(k, []).get(k)!).push(v); };
  for (const n of nodes) {
    for (const p of n.prereqs ?? []) push(p, n.id);
    if (n.kind === 'topic' && n.group) push(n.group, n.id);
  }
  return m;
}

// Effective tier for ordering: topics/checkpoints/projects inherit their anchor
// chapter's tier (via group / first prereq).
function effTierOf(id: string, byId: Map<string, RawNode>, seen = new Set<string>()): number {
  const n = byId.get(id);
  if (!n || seen.has(id)) return 0;
  if (typeof n.tier === 'number') return n.tier;
  seen.add(id);
  const anchor = n.group ?? n.prereqs?.[0];
  return anchor ? effTierOf(anchor, byId, seen) : 0;
}

function descendantsOf(id: string, succ: Map<string, string[]>): Set<string> {
  const out = new Set<string>();
  const stack = [...(succ.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.has(cur)) continue;
    out.add(cur);
    for (const s of succ.get(cur) ?? []) stack.push(s);
  }
  return out;
}

function roadOption(cur: Curriculum, byId: Map<string, RawNode>, crossroad: RawNode, kidId: string): RoadOption {
  const kn = byId.get(kidId)!;
  // If the road crosses into a different branch (SPECIALIZE), name it by branch;
  // if it stays in the same branch (PICK ENGINE → Unity/Godot), use the node label.
  const label = kn.branch && kn.branch !== crossroad.branch ? cur.branches[kn.branch]?.label ?? kn.label : kn.label;
  const color = cur.branches[kn.branch ?? crossroad.branch ?? 'core']?.color ?? '#ff3d81';
  return { id: kidId, label, color };
}

// The road options for a crossroad (its reachable children), for the picker UI.
export function roadsForCrossroad(cur: Curriculum, completed: Set<string>, crossroadId: string): RoadOption[] {
  const byId = new Map(cur.nodes.map((n) => [n.id, n]));
  const c = byId.get(crossroadId);
  if (!c || c.kind !== 'crossroad') return [];
  const succ = buildSucc(cur.nodes);
  return (succ.get(crossroadId) ?? [])
    .filter((k) => byId.has(k) && statusOf(k, byId, completed) !== 'locked')
    .map((k) => roadOption(cur, byId, c, k));
}

export function recommendNext(cur: Curriculum, completed: Set<string>, roads: Record<string, string>): Recommendation {
  const nodes = cur.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const succ = buildSucc(nodes);
  const status = (id: string) => statusOf(id, byId, completed);
  const tier = (id: string) => effTierOf(id, byId);

  // A crossroad's committed child = an explicit pick, or one whose subtree already
  // has completed work (the branch the user is clearly on).
  const committedChild = (crossroadId: string, availKids: string[]): string | undefined => {
    if (roads[crossroadId] && availKids.includes(roads[crossroadId])) return roads[crossroadId];
    return availKids.find((k) => completed.has(k) || [...descendantsOf(k, succ)].some((d) => completed.has(d)));
  };

  // Exclude the not-chosen roads of every decided crossroad so the arrow stays on path.
  const excluded = new Set<string>();
  const crossroads = nodes.filter((n) => n.kind === 'crossroad');
  for (const c of crossroads) {
    if (status(c.id) === 'locked') continue;
    const availKids = (succ.get(c.id) ?? []).filter((k) => byId.has(k) && status(k) !== 'locked');
    if (availKids.length < 2) continue;
    const chosen = committedChild(c.id, availKids);
    if (!chosen) continue;
    for (const k of availKids) if (k !== chosen) { excluded.add(k); for (const d of descendantsOf(k, succ)) excluded.add(d); }
  }

  const actionable = nodes.filter((n) =>
    n.kind !== 'crossroad' && status(n.id) === 'available' && !completed.has(n.id) && !excluded.has(n.id));
  if (actionable.length === 0) return { type: 'done' };

  // Surface the earliest undecided fork — but only once the work before it is done.
  for (const c of [...crossroads].sort((a, b) => tier(a.id) - tier(b.id))) {
    if (status(c.id) === 'locked') continue;
    const availKids = (succ.get(c.id) ?? []).filter((k) => byId.has(k) && status(k) !== 'locked');
    if (availKids.length < 2) continue;
    if (committedChild(c.id, availKids)) continue;                 // already decided
    if (actionable.some((a) => tier(a.id) < tier(c.id))) continue; // earlier work remains → do it first
    return { type: 'fork', crossroadId: c.id, label: c.label, roads: availKids.map((k) => roadOption(cur, byId, c, k)) };
  }

  // Otherwise point at the earliest anchor (chapter / checkpoint / project).
  const kindRank: Record<string, number> = { chapter: 0, checkpoint: 1, project: 2, topic: 3 };
  const anchors = actionable
    .filter((n) => n.kind !== 'topic')
    .sort((a, b) => tier(a.id) - tier(b.id) || (kindRank[a.kind] - kindRank[b.kind]) || (a.order ?? 0) - (b.order ?? 0));
  const target = anchors[0] ?? actionable[0];

  // A chapter can only be marked complete once ALL its topics are done — so while any
  // topic remains, point at the next incomplete topic (never the un-completable chapter).
  // Only when every topic is done does the arrow move to the chapter itself.
  if (target.kind === 'chapter' && (target.topics?.length ?? 0) > 0) {
    const nextTopic = (target.topics ?? [])
      .map((t) => byId.get(t)).filter((t): t is RawNode => !!t && !completed.has(t.id))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
    if (nextTopic) return { type: 'node', id: nextTopic.id };
  }
  return { type: 'node', id: target.id };
}
