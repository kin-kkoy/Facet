import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import {
  loadCurriculum, layout, statusOf, topicsComplete,
  type Curriculum, type LaidOutNode, type RawNode, type Status,
} from '../../utils/curriculum';
import { loadCompleted, saveCompleted } from '../../utils/progress';
import { handoffPrompt } from '../../utils/handoff';

interface Props { onLoadExample?: (code: string, label: string) => void; }

const diamond = (x: number, y: number, s: number) => `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
const hexagon = (x: number, y: number, s: number) => {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; p.push(`${(x + s * Math.cos(a)).toFixed(1)},${(y + s * Math.sin(a)).toFixed(1)}`); }
  return p.join(' ');
};

const radiusOf = (n: LaidOutNode) => n.kind === 'chapter' ? 30 : n.kind === 'crossroad' ? 26 : n.kind === 'topic' ? 12 : 22;

const INIT = { x: 520, y: 360, z: 0.72 };

export default function MapView({ onLoadExample }: Props) {
  const [cur, setCur] = useState<Curriculum | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(INIT.z);

  // The camera (pan x/y + zoom z) is the SINGLE source of truth in a ref, applied by
  // driving the SVG's `viewBox` — NOT a <g> transform. WebKitGTK deferred paints when
  // we mutated the <g> `transform` attribute (the pan looked frozen until an unrelated
  // hover forced a repaint); changing `viewBox` re-maps the whole coordinate system, a
  // real re-render that can't be deferred. `zoom` state exists only to re-render the
  // topic-label threshold; it never touches the view.
  const view = useRef({ x: INIT.x, y: INIT.y, z: INIT.z });
  const svgElRef = useRef<SVGSVGElement | null>(null);
  const bgRef = useRef<SVGRectElement | null>(null);
  const drag = useRef({ on: false, sx: 0, sy: 0 });
  const raf = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const applyTransform = useCallback(() => {
    const svg = svgElRef.current; if (!svg) return;
    const w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) return;
    const v = view.current;
    // viewBox reproduces translate(v.x,v.y) scale(v.z): a world point X maps to screen
    // (X - minX)*z, and we want screen = v.x + X*v.z ⟹ minX = -v.x/v.z. The visible span
    // is w/z × h/z, whose aspect equals the viewport's, so there's no letterboxing.
    svg.setAttribute('viewBox', `${-v.x / v.z} ${-v.y / v.z} ${w / v.z} ${h / v.z}`);
  }, []);

  useEffect(() => { loadCurriculum().then(setCur).catch(e => console.error('curriculum load failed', e)); }, []);
  useEffect(() => { loadCompleted().then(setCompleted); }, []);

  const built = useMemo(() => (cur ? layout(cur) : null), [cur]);
  const byId = useMemo(() => new Map((cur?.nodes ?? []).map(n => [n.id, n] as [string, RawNode])), [cur]);
  const statusMap = useMemo(() => {
    const m = new Map<string, Status>();
    if (cur) for (const n of cur.nodes) m.set(n.id, statusOf(n.id, byId, completed));
    return m;
  }, [cur, byId, completed]);

  const toggleComplete = useCallback((id: string) => {
    setCompleted(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); saveCompleted(next); return next; });
  }, []);
  const selectNode = useCallback((id: string) => setSelected(id), []);
  const doubleNode = useCallback((id: string) => { const n = byId.get(id); if (n?.example && onLoadExample) onLoadExample(n.example, n.label); }, [byId, onLoadExample]);

  // Wire pan + zoom through a CALLBACK REF on the <svg>: it runs exactly when the
  // svg mounts (after the curriculum "Loading…" gate) and again with null on
  // unmount — no effect-timing guesswork, listeners always attach once. Native
  // Pointer Events (not React synthetic) because in the WebKitGTK webview mousedown
  // never fired over the empty CSS-background SVG area and onWheel is passive.
  const svgRef = useCallback((svg: SVGSVGElement | null) => {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    svgElRef.current = svg;
    if (!svg) return;
    // ResizeObserver fires once on observe (sets the initial viewBox when the svg has
    // a real size) and on every resize (re-fit so the viewBox aspect keeps matching the
    // viewport — otherwise a window resize would letterbox/stretch the map).
    const ro = new ResizeObserver(() => applyTransform());
    ro.observe(svg);
    applyTransform(); // paint the initial camera as soon as the svg is live

    const schedule = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; applyTransform(); }); };
    let idle = 0;

    // While dragging, move/up listeners live on WINDOW (not the svg, no pointer
    // capture): in WebKitGTK pointerup wasn't reliably delivered to the captured
    // svg, so the drag never ended and the map followed the cursor off-screen.
    // window always gets the events; `e.buttons === 0` is a fail-safe end.
    function onMove(e: PointerEvent) {
      if (!drag.current.on) return;
      if (e.buttons === 0) { onUp(); return; } // released but we missed pointerup
      view.current.x = e.clientX - drag.current.sx;
      view.current.y = e.clientY - drag.current.sy;
      schedule();
    }
    function onUp() {
      if (!drag.current.on) return;
      drag.current.on = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      applyTransform(); // refresh debug/state once settled
    }
    function onDown(e: PointerEvent) {
      if (e.target !== bgRef.current && e.target !== svg) return; // pan from empty bg only
      drag.current = { on: true, sx: e.clientX - view.current.x, sy: e.clientY - view.current.y };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top; // cursor in svg-local px
      const old = view.current.z;
      const next = Math.min(2, Math.max(0.3, old - Math.sign(e.deltaY) * 0.12));
      if (next !== old) {
        // Keep the world point under the cursor fixed while scaling.
        const k = next / old;
        view.current.x = cx - (cx - view.current.x) * k;
        view.current.y = cy - (cy - view.current.y) * k;
        view.current.z = next;
        schedule();
      }
      // After the wheel settles, sync zoom state so the topic-label threshold re-renders.
      if (idle) clearTimeout(idle);
      idle = window.setTimeout(() => setZoom(view.current.z), 140);
    };

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('wheel', onWheel, { passive: false });
    cleanupRef.current = () => {
      ro.disconnect();
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (idle) clearTimeout(idle);
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
    };
  }, [applyTransform]);

  const resetView = () => { view.current = { x: INIT.x, y: INIT.y, z: INIT.z }; applyTransform(); setZoom(INIT.z); };

  if (!cur || !built) return <div className="view active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Loading curriculum…</div>;

  const posOf = new Map(built.nodes.map(n => [n.id, n]));
  const sel = selected ? byId.get(selected) : null;
  const chapters = cur.nodes.filter(n => n.kind === 'chapter');
  const doneChapters = chapters.filter(c => completed.has(c.id)).length;
  const showTopicLabels = zoom >= 0.55;

  return (
    <div className="view active" style={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden', background: '#09090b' }}>
      <svg ref={svgRef} className="map-svg" style={{ flex: 1, background: '#09090b', cursor: 'grab', display: 'block', touchAction: 'none' }}>
        {/* Drag surface: a real, huge hit target so WebKitGTK delivers pointer events
            over empty canvas (a CSS-only background isn't hittable there). It lives in
            world space under the viewBox, so it's sized to cover any pan/zoom extent. */}
        <rect ref={bgRef} x={-100000} y={-100000} width={200000} height={200000} fill="#09090b" />
        {/* The camera is the SVG viewBox (set imperatively in applyTransform), so nodes
            are drawn directly in world coordinates — no group transform to overwrite. */}
        <g>
          {built.edges.map((e, i) => {
            const a = posOf.get(e.from), b = posOf.get(e.to);
            if (!a || !b) return null;
            const st = statusMap.get(e.to);
            // border-to-border: shorten the line by each node's radius so it starts
            // and ends at the circle/hex edge, not the centre.
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
            const ux = dx / len, uy = dy / len;
            const x1 = a.x + ux * (radiusOf(a) + 2), y1 = a.y + uy * (radiusOf(a) + 2);
            const x2 = b.x - ux * (radiusOf(b) + 3), y2 = b.y - uy * (radiusOf(b) + 3);
            const stroke = st === 'completed' ? a.color : st === 'available' ? '#8b93a3' : '#2a2d38';
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={e.kind === 'topic' ? 1.2 : 2.2} strokeDasharray={st === 'locked' ? '5 6' : undefined} />;
          })}
          {built.nodes.map(n => (
            <NodeShape key={n.id} node={n} status={statusMap.get(n.id)!} selected={n.id === selected}
              showLabel={n.kind !== 'topic' || showTopicLabels || n.id === selected}
              onClick={selectNode} onDouble={doubleNode} />
          ))}
        </g>
      </svg>

      {/* header chip */}
      <div style={{ position: 'absolute', top: 14, left: 16, fontFamily: 'var(--mono)', pointerEvents: 'none' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#e2e8f0', textTransform: 'uppercase' }}>{cur.meta.title}</div>
        <div style={{ fontSize: 10, color: '#5c637a', marginTop: 3 }}>.NET {cur.meta.dotnet} · C# {cur.meta.csharp} · {doneChapters}/{chapters.length} chapters · drag to pan, scroll to zoom</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {Object.entries(cur.branches).map(([k, b]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: '#94a3b8' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: b.color }} /> {b.label}
            </span>
          ))}
        </div>
      </div>

      <button onClick={resetView} style={{ position: 'absolute', top: 14, right: 16, ...btn }}>⟲ Reset view</button>

      {/* floating detail popover */}
      {sel && (
        <div style={{ position: 'absolute', top: 70, right: 16, width: 320, maxHeight: 'calc(100% - 90px)', overflowY: 'auto', zIndex: 10, fontFamily: 'var(--mono)' }}>
          <NodeDetail node={sel} status={statusMap.get(sel.id)!} byId={byId} statusMap={statusMap} completed={completed}
            branchColor={cur.branches[sel.branch ?? 'core']?.color ?? '#61afef'}
            onToggle={() => toggleComplete(sel.id)} onLoadExample={onLoadExample} onSelectPrereq={setSelected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

/* ── a single node (memoized so pan/selection don't re-render all) ── */
const NodeShape = memo(function NodeShape({ node, status, selected, showLabel, onClick, onDouble }: {
  node: LaidOutNode; status: Status; selected: boolean; showLabel: boolean; onClick: (id: string) => void; onDouble: (id: string) => void;
}) {
  const locked = status === 'locked';
  const done = status === 'completed';
  const avail = status === 'available';
  // locked = dark gray, available (reached) = light gray, completed = branch color.
  const stroke = done ? node.color : avail ? '#8b93a3' : '#33333d';
  const iconColor = done ? node.color : avail ? '#c2c8d4' : '#4a4a55';
  const groupOpacity = locked ? 0.5 : 1;
  const fill = done ? node.color + '22' : avail ? '#12141a' : '#09090b';

  const big = node.kind === 'chapter';
  const r = big ? 30 : node.kind === 'crossroad' ? 26 : node.kind === 'topic' ? 12 : 22;
  const labelY = node.y + (big ? 46 : node.kind === 'topic' ? 24 : 38);

  let shape;
  if (node.kind === 'crossroad') shape = <polygon points={diamond(node.x, node.y, r)} fill={fill} stroke={stroke} strokeWidth={2.5} />;
  else if (node.kind === 'checkpoint' || node.kind === 'project') shape = <polygon points={hexagon(node.x, node.y, r)} fill={fill} stroke={stroke} strokeWidth={2.5} />;
  else shape = <circle cx={node.x} cy={node.y} r={r} fill={fill} stroke={stroke} strokeWidth={big ? 3 : 2} />;

  const labelW = Math.max(node.label.length * (big ? 6.6 : 5.2) + 10, 20);

  return (
    <g style={{ cursor: 'pointer', opacity: selected ? 1 : groupOpacity }} onClick={(e) => { e.stopPropagation(); onClick(node.id); }} onDoubleClick={(e) => { e.stopPropagation(); onDouble(node.id); }}>
      {selected && <circle cx={node.x} cy={node.y} r={r + 8} fill="none" stroke={node.color} strokeWidth={1.5} strokeDasharray="3 3" />}
      {shape}
      {node.icon && (
        <foreignObject x={node.x - r} y={node.y - (big ? 13 : 9)} width={r * 2} height={r} style={{ pointerEvents: 'none' }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, fontSize: big ? 16 : node.kind === 'topic' ? 9 : 13 }}><i className={node.icon} /></div>
        </foreignObject>
      )}
      {showLabel && <>
        <rect x={node.x - labelW / 2} y={labelY - 2} width={labelW} height={big ? 15 : 12} rx={3} fill="#0b0b0eDD" />
        <text x={node.x} y={labelY} textAnchor="middle" dominantBaseline="hanging"
          fill={done ? node.color : avail ? '#cbd5e1' : '#5c637a'} fontWeight={big ? 700 : 400}
          fontSize={big ? 11 : node.kind === 'topic' ? 8.5 : 10} fontFamily="var(--mono)" letterSpacing={0.5}
          style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
      </>}
    </g>
  );
});

/* ── detail popover body ─────────────────────────────────────────── */
function NodeDetail({ node, status, byId, statusMap, completed, branchColor, onToggle, onLoadExample, onSelectPrereq, onClose }: {
  node: RawNode; status: Status; byId: Map<string, RawNode>; statusMap: Map<string, Status>; completed: Set<string>;
  branchColor: string; onToggle: () => void; onLoadExample?: (c: string, l: string) => void; onSelectPrereq: (id: string) => void; onClose: () => void;
}) {
  const kindLabel: Record<string, string> = { chapter: 'CHAPTER', topic: 'TOPIC', crossroad: 'CROSSROAD', checkpoint: 'CHECKPOINT', project: 'PROJECT DEFENSE' };
  const statusColor = status === 'completed' ? '#22c55e' : status === 'available' ? branchColor : '#5c637a';
  const [copied, setCopied] = useState(false);
  const copyHandoff = (n: RawNode) => { navigator.clipboard?.writeText(handoffPrompt(n)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => setCopied(false)); };

  // Chapters gate on their topics.
  const isChapter = node.kind === 'chapter';
  const topicsDone = isChapter ? topicsCompleteLocal(node, completed) : true;
  const canComplete = status !== 'locked' && (!isChapter || status === 'completed' || topicsDone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, border: `1px solid ${branchColor}55`, borderTop: `3px solid ${branchColor}`, borderRadius: 6, padding: '14px 16px', background: 'rgba(12,12,15,0.97)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: 2, color: branchColor }}>{kindLabel[node.kind] ?? node.kind.toUpperCase()}{node.est ? ` · ${node.est}` : ''}</span>
        <i className="fa-solid fa-xmark" style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text3)' }} onClick={onClose} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{node.icon && <i className={node.icon} style={{ marginRight: 8, color: branchColor }} />}{node.label}</div>
      <div style={{ fontSize: 10, color: statusColor, textTransform: 'uppercase', letterSpacing: 1 }}>● {status}</div>

      {node.summary && <p style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{node.summary}</p>}
      {node.cert && <div style={{ fontSize: 10, color: '#e5c07b', border: '1px solid #e5c07b33', padding: '6px 8px' }}><i className="fa-solid fa-certificate" style={{ marginRight: 6 }} />{node.cert}</div>}
      {node.doc && <div style={{ fontSize: 10, color: '#5c637a' }}><i className="fa-solid fa-book" style={{ marginRight: 6 }} />curriculum/{node.doc}</div>}

      {node.prereqs && node.prereqs.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 1, color: '#5c637a', marginBottom: 4 }}>REQUIRES</div>
          {node.prereqs.map(p => { const pn = byId.get(p); if (!pn) return null; const ps = statusMap.get(p);
            return <div key={p} onClick={() => onSelectPrereq(p)} style={{ fontSize: 11, color: ps === 'completed' ? '#22c55e' : '#94a3b8', cursor: 'pointer', padding: '1px 0' }}>{ps === 'completed' ? '✓' : '○'} {pn.label}</div>; })}
        </div>
      )}

      {isChapter && !topicsDone && status !== 'completed' && (
        <div style={{ fontSize: 10, color: '#e5c07b' }}><i className="fa-solid fa-list-check" style={{ marginRight: 6 }} />Complete all topics to finish this chapter.</div>
      )}

      {status !== 'locked' && (node.kind === 'checkpoint' || node.kind === 'project') && (
        <div style={{ fontSize: 10, color: '#94a3b8', border: '1px solid #1e1e26', padding: '8px 10px', lineHeight: 1.5 }}>
          <i className="fa-solid fa-robot" style={{ marginRight: 6, color: '#c678dd' }} />
          {node.kind === 'checkpoint' ? 'Closed-book gate — run it in Claude Code (it examines, never helps), then tick it.' : 'Defense: hand your repo to Claude Code and explain every choice like I\'m 5. Tick when passed.'}
          <button onClick={() => copyHandoff(node)} style={{ ...btn, marginTop: 8, width: '100%', borderColor: copied ? '#22c55e' : '#c678dd', color: copied ? '#22c55e' : '#c678dd', fontSize: 10 }}>
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: 6 }} />{copied ? 'Copied — paste into Claude Code' : `Copy Claude Code ${node.kind === 'checkpoint' ? 'exam' : 'defense'} prompt`}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {status !== 'locked' && (
          <button onClick={canComplete ? onToggle : undefined} disabled={!canComplete} title={canComplete ? '' : 'Complete all topics first'}
            style={{ ...btn, opacity: canComplete ? 1 : 0.45, cursor: canComplete ? 'pointer' : 'not-allowed', borderColor: status === 'completed' ? '#22c55e' : branchColor, color: status === 'completed' ? '#22c55e' : '#e2e8f0' }}>
            {status === 'completed' ? '✓ Completed — undo' : '○ Mark complete'}
          </button>
        )}
        {node.example && onLoadExample && (
          <button onClick={() => onLoadExample(node.example!, node.label)} style={{ ...btn, borderColor: '#00e5ff', color: '#00e5ff' }}><i className="fa-solid fa-flask" style={{ marginRight: 6 }} />Try in lab</button>
        )}
      </div>
    </div>
  );
}

function topicsCompleteLocal(chapter: RawNode, completed: Set<string>): boolean { return topicsComplete(chapter, completed); }

const btn: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#e2e8f0', background: '#15151d', border: '1px solid #33333d', borderRadius: 3, padding: '8px 12px', cursor: 'pointer' };
