// Loads curriculum.json and computes a skill-tree layout (positions + edges)
// plus derives per-node status from the user's completed set.

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
}

export interface Branch { label: string; color: string; icon: string; }

export interface Curriculum {
  meta: any;
  branches: Record<string, Branch>;
  nodes: RawNode[];
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

const BRANCH_LANE: Record<string, number> = { core: 0, backend: -600, cloud: 0, game: 620 };
const UNITY = new Set(['u01', 'u02', 'cpg1', 'pg-unity']);
const GODOT = new Set(['gd01', 'gd02', 'cpg2', 'pg-godot']);

function laneOf(n: RawNode): number {
  if (UNITY.has(n.id)) return BRANCH_LANE.game - 280;
  if (GODOT.has(n.id)) return BRANCH_LANE.game + 280;
  return BRANCH_LANE[n.branch ?? 'core'] ?? 0;
}
// Which side the topic column / gates hang off (keeps them out of neighbor lanes).
function sideOf(n: RawNode): number {
  if (UNITY.has(n.id)) return -1;
  if (GODOT.has(n.id)) return 1;
  if (n.branch === 'backend' || n.branch === 'cloud') return -1;
  return 1; // core, game core
}

export async function loadCurriculum(): Promise<Curriculum> {
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
      pos.set(n.id, { x: laneOf(n), y: (n.tier ?? 0) * ROW_H });
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
      const side = sideOf(chap);
      topics.forEach((t, k) => pos.set(t.id, { x: cp.x + side * TOPIC_DX, y: cp.y + (k - (n - 1) / 2) * TOPIC_V }));
    }
  }

  // 3) Checkpoints sit ON the spine between chapters; projects hang to the side.
  for (const n of cur.nodes) {
    if (n.kind !== 'checkpoint' && n.kind !== 'project') continue;
    const anchorId = n.prereqs?.[0];
    const ap = anchorId ? pos.get(anchorId) : null;
    const anchor = anchorId ? byId.get(anchorId) : null;
    if (!ap || !anchor) { pos.set(n.id, { x: 0, y: 0 }); continue; }
    if (n.kind === 'checkpoint') {
      // midway down the spine between this chapter and the next.
      pos.set(n.id, { x: ap.x, y: ap.y + ROW_H * 0.5 });
    } else {
      // project defense — off to the side of its gate/chapter.
      pos.set(n.id, { x: ap.x + sideOf(anchor) * (GATE_DX + 120), y: ap.y + ROW_H * 0.25 });
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
