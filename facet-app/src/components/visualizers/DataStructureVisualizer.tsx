import { useState, useMemo, useRef } from 'react';
import {
  isRef, classify, varsForRef, buildConnections, toObjectView, toCodeView, type StructKind,
} from '../../utils/heapGraph';

interface Props {
  heap?: Record<string, any>;
  prevHeap?: Record<string, any>;
  stack?: Record<string, any>;
}

const KIND_BADGE: Record<StructKind, { label: string; color: string }> = {
  array: { label: 'array', color: 'var(--blue)' },
  dict: { label: 'map', color: 'var(--orange)' },
  object: { label: 'object', color: 'var(--accent)' },
  value: { label: 'value', color: 'var(--purple)' },
};

// A gallery of the data structures themselves — each object is a self-contained card
// showing its own shape (array cells, map key→value entries, object fields). References
// are inline chips you click to inspect the target; there are no arrows between cards
// (that pointer-graph view is the Flow lens's job).
export default function DataStructureVisualizer({ heap, prevHeap, stack }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<'object' | 'code'>('object');
  // Draggable inspect popover, clamped inside this panel so it can't cover other panels.
  const containerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{ left: number; top: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ol: number; ot: number } | null>(null);

  if (!heap || Object.keys(heap).length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}><i className="fa-solid fa-boxes-stacked" /></div>
        <div style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 }}>Data Structures</div>
        <div style={{ fontSize: 11, marginTop: 10, opacity: 0.8, maxWidth: 320, lineHeight: 1.6 }}>
          A clean view of the shapes your data takes — arrays, maps and objects, labelled by variable name. Run code
          that builds a structure, then click a card (or a → reference) to inspect it.
        </div>
      </div>
    );
  }

  const selObj = sel && heap[sel] !== undefined ? heap[sel] : null;
  const inspect = (ref: string) => setSel(ref);

  // Drag the popover by its header. Position/clamp are relative to the panel; window
  // listeners (no setPointerCapture) keep the drag alive in the WebKit webview.
  const startPopDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // let header buttons still click
    const cont = containerRef.current, pop = popRef.current;
    if (!cont || !pop) return;
    const cr = cont.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ol: pr.left - cr.left, ot: pr.top - cr.top };
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      if (ev.buttons === 0) { onUp(); return; }
      const maxL = Math.max(0, cont.clientWidth - pop.offsetWidth);
      const maxT = Math.max(0, cont.clientHeight - pop.offsetHeight);
      setPopPos({
        left: Math.max(0, Math.min(d.ol + ev.clientX - d.sx, maxL)),
        top: Math.max(0, Math.min(d.ot + ev.clientY - d.sy, maxT)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    e.preventDefault();
  };

  // Cards the selected card references (its outgoing refs) — softly emphasized so you
  // can see what a structure holds without any arrows drawn between cards.
  const related = useMemo(() => {
    const s = new Set<string>();
    if (sel && heap) buildConnections(heap).forEach((c) => { if (c.source === sel) s.add(c.target); });
    return s;
  }, [sel, heap]);

  return (
    <div ref={containerRef} onClick={() => setSel(null)}
      style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative', padding: '28px 24px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px 32px', alignItems: 'flex-start', alignContent: 'flex-start', justifyContent: 'center' }}>
        {Object.entries(heap).map(([refId, obj]) => {
          const kind = classify(obj);
          const badge = KIND_BADGE[kind];
          const names = varsForRef(stack, refId);
          const title = names.length ? names.join(', ') : (obj._type ?? refId);
          const prevObj = prevHeap?.[refId];
          const isSel = sel === refId;
          const isRelated = related.has(refId);
          const isOther = sel !== null && !isSel && !isRelated;
          return (
            <div key={refId}
              onClick={(e) => { e.stopPropagation(); setSel((p) => (p === refId ? null : refId)); }}
              style={{
                minWidth: 170, background: 'var(--bg1)', borderRadius: 6, cursor: 'pointer',
                borderStyle: 'solid', borderWidth: 1,
                borderColor: isSel ? badge.color : isRelated ? 'color-mix(in srgb, var(--accent) 60%, var(--border2))' : 'var(--border2)',
                borderTopWidth: 3, borderTopColor: badge.color,
                boxShadow: isSel ? `0 0 0 1px ${badge.color}`
                  : isRelated ? '0 0 12px color-mix(in srgb, var(--accent) 28%, transparent), 0 4px 14px rgba(0,0,0,0.25)'
                  : '0 4px 14px rgba(0,0,0,0.25)',
                opacity: isOther ? 0.5 : 1,
                transition: 'border-color .15s, box-shadow .15s, opacity .15s',
              }}>
              {/* header: variable name + type badge + ref id */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
                <span style={{ fontSize: 8.5, color: badge.color, border: `1px solid ${badge.color}`, borderRadius: 10, padding: '0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{badge.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{refId}</span>
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text3)', fontFamily: 'var(--mono)', padding: '3px 12px 0' }}>{obj._type}</div>
              <CardBody obj={obj} prevObj={prevObj} kind={kind} onInspect={inspect} />
            </div>
          );
        })}
      </div>

      {/* inspect popover — draggable by its header, clamped to this panel */}
      {sel && selObj && (
        <div ref={popRef} onClick={(e) => e.stopPropagation()} style={{ position: 'absolute',
          ...(popPos ? { left: popPos.left, top: popPos.top } : { top: 12, right: 12 }),
          width: 300, maxHeight: '85%', overflow: 'auto', background: 'var(--bg0)', border: '1px solid var(--border2)', borderRadius: 6, zIndex: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div onPointerDown={startPopDrag} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)', cursor: 'move', touchAction: 'none', userSelect: 'none' }}>
            <i className="fa-solid fa-grip-vertical" style={{ fontSize: 9, color: 'var(--text3)' }} title="Drag to move" />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{varsForRef(stack, sel).join(', ') || sel}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {(['object', 'code'] as const).map((m) => (
                <button key={m} onClick={() => setView(m)} style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 3, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
                  background: view === m ? 'var(--accent)' : 'var(--bg2)', color: view === m ? 'var(--bg0)' : 'var(--text2)', border: '1px solid var(--border2)' }}>{m}</button>
              ))}
              <button onClick={() => setSel(null)} style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
          </div>
          <pre style={{ margin: 0, padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
            {view === 'object' ? toObjectView(selObj) : toCodeView(selObj)}
          </pre>
        </div>
      )}
    </div>
  );
}

// A clickable reference chip — follow it to inspect the target object.
function RefChip({ refId, onInspect }: { refId: string; onInspect: (ref: string) => void }) {
  return (
    <span onClick={(e) => { e.stopPropagation(); onInspect(refId); }}
      style={{ color: 'var(--blue)', fontSize: 9, border: '1px solid var(--blue)', borderRadius: 10, padding: '1px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span style={{ opacity: 0.7 }}>→</span>{refId}
    </span>
  );
}

function CardBody({ obj, prevObj, kind, onInspect }: { obj: any; prevObj: any; kind: StructKind; onInspect: (ref: string) => void }) {
  if (kind === 'value') return <div style={{ padding: '6px 12px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>{String(obj._value)}</div>;

  if (kind === 'array' || kind === 'dict') {
    const els: any[] = obj._elements ?? [];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px 10px' }}>
        {els.map((el, i) => {
          const isEntry = el && typeof el === 'object' && 'key' in el && 'value' in el;
          if (isEntry) {
            const vRef = isRef(el.value);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 4, padding: '3px 7px', fontFamily: 'var(--mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--text2)' }}>{String(el.key)}</span><span style={{ color: 'var(--text3)' }}>→</span>
                {vRef
                  ? <RefChip refId={el.value.ref} onInspect={onInspect} />
                  : <span style={{ color: 'var(--text)', fontWeight: 700 }}>{String(el.value)}</span>}
              </div>
            );
          }
          const elRef = isRef(el);
          const prevEl = prevObj?._elements?.[i];
          const changed = !elRef && prevEl !== undefined && String(prevEl) !== String(el);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {elRef
                ? <RefChip refId={el.ref} onInspect={onInspect} />
                : <div style={{ minWidth: 20, textAlign: 'center', padding: '3px 7px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11,
                    background: changed ? 'var(--pink)' : 'var(--bg3)', color: changed ? '#000' : 'var(--text)',
                    border: `1px solid ${changed ? 'var(--pink)' : 'var(--border2)'}`, fontWeight: changed ? 700 : 400 }}>{String(el)}</div>}
              <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{i}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // object: field rows
  return (
    <div style={{ padding: '4px 12px 10px' }}>
      {Object.entries(obj).filter(([k]) => k !== '_type').map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--mono)', fontSize: 11.5, padding: '3px 0', alignItems: 'center' }}>
          <span style={{ color: 'var(--text2)' }}>{k}</span>
          {isRef(v)
            ? <RefChip refId={(v as any).ref} onInspect={onInspect} />
            : <span style={{ color: 'var(--text)' }}>{v === null ? <span style={{ color: 'var(--text3)' }}>null</span> : String(v)}</span>}
        </div>
      ))}
    </div>
  );
}
