import { useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { isRef, classify, buildConnections, arrowPath, layoutColumns, incidentSet, type Conn, type Rect, type Arrow } from '../../utils/heapGraph';

interface Props {
  heap?: Record<string, any>;
  stack?: Record<string, any>;
  prevHeap?: Record<string, any>;
}

type LayoutMode = 'A' | 'B';

// pythontutor-style two-column view: Frames (variables) on the left, Objects (heap)
// laid into depth-columns on the right, with arrows from variables/fields to objects.
// Pan (drag empty space) + zoom (scroll) via a WebKit-safe imperative CSS transform on
// the "world" wrapper — mirrors MapView.tsx (window pointer listeners, non-passive
// wheel, no setPointerCapture); arrow geometry is measured in world space so it stays
// glued to boxes at any zoom without re-measuring per frame.
export default function FlowVisualizer({ heap, stack, prevHeap }: Props) {
  const worldRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('B');

  // pan/zoom camera (single source of truth in a ref; applied imperatively)
  const view = useRef({ x: 0, y: 0, z: 1 });
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ on: false, sx: 0, sy: 0, moved: false });
  const raf = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);

  const heapEntries = heap ? Object.entries(heap) : [];
  const stackEntries = stack ? Object.entries(stack) : [];

  const applyTransform = useCallback(() => {
    const w = worldRef.current; if (!w) return;
    const v = view.current;
    w.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.z})`;
  }, []);
  // Re-apply after every render (heap step, focus change) so React never drops the transform.
  useLayoutEffect(() => { applyTransform(); });

  const resetView = () => { view.current = { x: 0, y: 0, z: 1 }; applyTransform(); };

  // Object columns by pointer depth. A = shortest-path from the variable roots (objects
  // line up with the frames that point at them); B = longest-path (containers sit left).
  const columns = useMemo(() => {
    if (!heap) return [];
    const roots = stack ? Object.entries(stack).filter(([, v]) => isRef(v)).map(([, v]) => (v as any).ref) : [];
    return layoutColumns(heap, roots, { longest: layout === 'B' });
  }, [heap, stack, layout]);

  // All edges: variable→object plus object→object (used for arrows AND focus).
  const conns = useMemo(() => {
    const cs: Conn[] = [];
    if (stack) Object.entries(stack).forEach(([name, v]) => { if (isRef(v)) cs.push({ source: `var:${name}`, target: (v as any).ref, label: '' }); });
    if (heap) buildConnections(heap).forEach((c) => cs.push(c));
    return cs;
  }, [heap, stack]);
  const focus = useMemo(() => incidentSet(conns, sel), [conns, sel]);

  useLayoutEffect(() => {
    const measure = () => {
      const world = worldRef.current;
      if (!world || !heap) { setArrows([]); return; }
      const wr = world.getBoundingClientRect();
      const z = view.current.z || 1;
      // Measure in the world's UNSCALED coordinate space (divide the scaled screen
      // deltas by z) — the shared transform then scales boxes + arrows together.
      const rectOf = (id: string): Rect | null => {
        const el = elRefs.current[id];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: (r.left - wr.left) / z, y: (r.top - wr.top) / z, w: r.width / z, h: r.height / z };
      };
      const out: Arrow[] = [];
      for (const c of conns) {
        const s = rectOf(c.source), t = rectOf(c.target);
        if (s && t) out.push(arrowPath(c, s, t));
      }
      setArrows(out);
    };
    const id = setTimeout(measure, 30);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(id); window.removeEventListener('resize', measure); };
  }, [heap, stack, conns, layout]);

  // Callback ref: wire native pan/zoom listeners when the surface mounts.
  const surfaceCbRef = useCallback((node: HTMLDivElement | null) => {
    if (cleanup.current) { cleanup.current(); cleanup.current = null; }
    surfaceRef.current = node;
    if (!node) return;
    const ro = new ResizeObserver(() => applyTransform());
    ro.observe(node);
    applyTransform();
    const schedule = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; applyTransform(); }); };

    function onMove(e: PointerEvent) {
      if (!drag.current.on) return;
      if (e.buttons === 0) { onUp(); return; } // released but we missed pointerup
      view.current.x = e.clientX - drag.current.sx;
      view.current.y = e.clientY - drag.current.sy;
      drag.current.moved = true;
      schedule();
    }
    function onUp() {
      if (!drag.current.on) return;
      drag.current.on = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
    function onDown(e: PointerEvent) {
      // Pan only from empty background (surface or world), never from a box — so a
      // click on a box still fires its focus handler.
      if (e.target !== node && e.target !== worldRef.current) return;
      drag.current = { on: true, sx: e.clientX - view.current.x, sy: e.clientY - view.current.y, moved: false };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const old = view.current.z;
      const next = Math.min(2.5, Math.max(0.3, old - Math.sign(e.deltaY) * 0.12));
      if (next !== old) {
        const k = next / old; // keep the point under the cursor fixed
        view.current.x = cx - (cx - view.current.x) * k;
        view.current.y = cy - (cy - view.current.y) * k;
        view.current.z = next;
        schedule();
      }
    };
    node.addEventListener('pointerdown', onDown);
    node.addEventListener('wheel', onWheel, { passive: false });
    cleanup.current = () => {
      ro.disconnect();
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
    };
  }, [applyTransform]);

  if (stackEntries.length === 0 && heapEntries.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}><i className="fa-solid fa-diagram-project" /></div>
        <div style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 }}>Flow</div>
        <div style={{ fontSize: 11, marginTop: 10, opacity: 0.8, maxWidth: 320, lineHeight: 1.6 }}>
          Steps through your program like a debugger — variables on the left, the objects they point to on the right,
          with live arrows. Scroll to zoom, drag to pan, click a box to trace its links.
        </div>
      </div>
    );
  }

  // Clear focus on a plain background click, but not at the end of a pan-drag.
  const onSurfaceClick = () => { if (drag.current.moved) { drag.current.moved = false; return; } setSel(null); };

  return (
    <div ref={surfaceCbRef} onClick={onSurfaceClick}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', touchAction: 'none', cursor: 'grab' }}>

      {/* controls (outside the transformed world) */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 12, left: 12, zIndex: 6, display: 'flex', gap: 3, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 5, padding: 2 }}>
        {([['A', 'Compact'], ['B', 'Balanced']] as const).map(([m, lbl]) => (
          <button key={m} onClick={() => setLayout(m)} title={m === 'A' ? 'Columns by depth, packed tight' : 'Containers left, columns centered'}
            style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '3px 9px', borderRadius: 3, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
              background: layout === m ? 'var(--accent)' : 'transparent', color: layout === m ? 'var(--bg0)' : 'var(--text2)', border: 'none', fontWeight: layout === m ? 700 : 400 }}>{lbl}</button>
        ))}
      </div>
      <button onClick={(e) => { e.stopPropagation(); resetView(); }} title="Reset view"
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 6, fontSize: 10, fontFamily: 'var(--mono)', padding: '4px 9px', borderRadius: 4, cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="fa-solid fa-rotate-left" /> Reset
      </button>

      <div ref={worldRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', width: 'max-content', display: 'flex', gap: 60, padding: '20px 24px', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 1 }}>
          <defs>
            <marker id="flow-arrow" markerWidth="11" markerHeight="11" refX="7" refY="5" orient="auto">
              <path d="M1,1 L8,5 L1,9" fill="none" stroke="var(--blue)" strokeWidth="1.4" />
            </marker>
          </defs>
          {arrows.map((a) => {
            const inc = focus.edges.has(a.id);
            const op = sel ? (inc ? 0.95 : 0.05) : 0.65;
            return (
              <g key={a.id}>
                <path d={a.path} fill="none" stroke="var(--blue)" strokeWidth={inc ? 2.2 : 1.4} markerEnd="url(#flow-arrow)" opacity={op} />
                {a.label && <text x={a.lx} y={a.ly} fontSize={8.5} fill="var(--blue)" textAnchor="middle" opacity={sel ? (inc ? 0.95 : 0.05) : 0.85}>{a.label}</text>}
              </g>
            );
          })}
        </svg>

        {/* Frames */}
        <div style={{ flexShrink: 0, minWidth: 180, zIndex: 2 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Frames</div>
          <div style={{ border: '1px solid var(--border2)', borderRadius: 6, background: 'var(--bg1)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Global</div>
            {stackEntries.length === 0 && <div style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 10px' }}>no variables</div>}
            {stackEntries.map(([name, v]) => {
              const ref = isRef(v) ? (v as any).ref as string : null;
              const dim = sel !== null && !focus.nodes.has(`var:${name}`);
              return (
                <div key={name} ref={(el) => { elRefs.current[`var:${name}`] = el; }}
                  onClick={ref ? (e) => { e.stopPropagation(); setSel((p) => (p === ref ? null : ref)); } : undefined}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: 11.5, borderBottom: '1px solid var(--border)',
                    cursor: ref ? 'pointer' : 'default', opacity: dim ? 0.16 : 1, transition: 'opacity .15s' }}>
                  <span style={{ color: 'var(--text2)' }}>{name}</span>
                  {isRef(v)
                    ? <span style={{ color: 'var(--blue)', fontSize: 9, border: '1px solid var(--blue)', borderRadius: 10, padding: '1px 7px' }}>{(v as any).ref}</span>
                    : <span style={{ color: 'var(--text)' }}>{v === 'null' ? <span style={{ color: 'var(--text3)' }}>null</span> : String(v)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Objects — depth columns */}
        <div style={{ zIndex: 2 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Objects</div>
          {heapEntries.length === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>no objects on the heap</div>
          ) : (
            <div style={{ display: 'flex', gap: 48, alignItems: layout === 'B' ? 'center' : 'flex-start' }}>
              {columns.map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
                  {col.map((refId) => (
                    <ObjectBox key={refId} refId={refId} obj={heap![refId]} prevObj={prevHeap?.[refId]}
                      selected={sel === refId} dim={sel !== null && !focus.nodes.has(refId)}
                      onSelect={() => setSel((p) => (p === refId ? null : refId))}
                      elRef={(el) => { elRefs.current[refId] = el; }} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ObjectBox({ refId, obj, prevObj, elRef, selected, dim, onSelect }: {
  refId: string; obj: any; prevObj: any; elRef: (el: HTMLDivElement | null) => void;
  selected: boolean; dim: boolean; onSelect: () => void;
}) {
  if (obj === undefined) return null;
  const kind = classify(obj);
  const type = obj._type ?? 'object';
  return (
    <div ref={elRef} onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{ alignSelf: 'flex-start', minWidth: 150, maxWidth: 360, border: '1px solid', borderColor: selected ? 'var(--accent)' : 'var(--border2)', borderRadius: 6, background: 'var(--bg1)', overflow: 'hidden', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 1px var(--accent)' : undefined, opacity: dim ? 0.16 : 1, transition: 'opacity .15s, border-color .15s, box-shadow .15s' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text2)', padding: '4px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{type}</span><span style={{ color: 'var(--text3)' }}>{refId}</span>
      </div>
      {kind === 'value' && <div style={{ padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{String(obj._value)}</div>}
      {(kind === 'array' || kind === 'dict') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px' }}>
          {(obj._elements ?? []).map((el: any, i: number) => {
            const prevEl = prevObj?._elements?.[i];
            const isEntry = el && typeof el === 'object' && 'key' in el && 'value' in el;
            const changed = !isEntry && !isRef(el) && prevEl !== undefined && String(prevEl) !== String(el);
            if (isEntry) return <Cell key={i} label={String(el.key)} value={isRef(el.value) ? el.value.ref : String(el.value)} isRef={isRef(el.value)} />;
            return <Cell key={i} label={String(i)} value={isRef(el) ? el.ref : String(el)} isRef={isRef(el)} changed={changed} />;
          })}
        </div>
      )}
      {kind === 'object' && (
        <div style={{ padding: '4px 10px 8px' }}>
          {Object.entries(obj).filter(([k]) => k !== '_type').map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 0' }}>
              <span style={{ color: 'var(--text3)' }}>{k}</span>
              {isRef(v)
                ? <span style={{ color: 'var(--blue)', fontSize: 9, border: '1px solid var(--blue)', borderRadius: 10, padding: '0 6px' }}>{v.ref}</span>
                : <span style={{ color: 'var(--text)' }}>{v === null ? 'null' : String(v)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, isRef: ref, changed }: { label: string; value: string; isRef?: boolean; changed?: boolean; }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ minWidth: 22, textAlign: 'center', padding: '3px 6px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11,
        background: changed ? 'var(--pink)' : 'var(--bg3)', color: changed ? '#000' : ref ? 'var(--blue)' : 'var(--text)',
        border: `1px solid ${changed ? 'var(--pink)' : 'var(--border2)'}` }}>{value}</div>
      <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{label}</span>
    </div>
  );
}
