import { useLayoutEffect, useRef, useState, useCallback } from 'react';

interface ClassMember { name: string; type: string; access: string; isStatic: boolean; params?: string | null; }
interface ClassInfo {
  name: string; kind: string; base?: string | null; interfaces: string[];
  fields: ClassMember[]; methods: ClassMember[]; startLine: number; endLine: number;
}
interface Props { classes?: ClassInfo[]; activeLine?: number; }

const ACCESS: Record<string, string> = { public: '+', private: '−', protected: '#', internal: '~' };

// UML box accent by declaration kind.
const KIND_COLOR: Record<string, string> = {
  interface: 'var(--blue)', abstract: 'var(--purple)', struct: 'var(--orange)', enum: 'var(--yellow)', class: 'var(--accent)',
};

type Edge = { d: string; kind: 'gen' | 'assoc'; dashed?: boolean; label?: string; lx?: number; ly?: number; mult?: string; mx?: number; my?: number };

// A field type that holds many of something (array or generic collection).
const isCollection = (type: string): boolean =>
  /\[\]/.test(type) ||
  /\b(List|Dictionary|IEnumerable|ICollection|IList|HashSet|Queue|Stack|SortedList|SortedDictionary|LinkedList|Collection|Array)\s*</.test(type);

// Point where the ray from a rect's center toward (tx,ty) exits the rect border.
function borderPoint(r: { x: number; y: number; w: number; h: number }, tx: number, ty: number) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? (r.w / 2) / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? (r.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

function MemberRow({ m, isMethod }: { m: ClassMember; isMethod: boolean }) {
  return (
    <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text2)', padding: '1px 0', whiteSpace: 'nowrap', textDecoration: m.isStatic ? 'underline' : 'none' }}>
      <span style={{ color: 'var(--text3)', marginRight: '4px' }}>{ACCESS[m.access] ?? '+'}</span>
      <span style={{ color: 'var(--text)' }}>{m.name}{isMethod ? (m.params ?? '()') : ''}</span>
      {m.type && m.type !== 'ctor' ? <span style={{ color: 'var(--text3)' }}> : {m.type}</span> : null}
    </div>
  );
}

export default function OOPVisualizer({ classes, activeLine = -1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [edges, setEdges] = useState<Edge[]>([]);

  const list = classes ?? [];
  const byName = new Map(list.map(c => [c.name, c]));
  const names = new Set(list.map(c => c.name));

  // Declared classes referenced by a field's type (incl. collections/generics).
  const referenced = (type: string): string[] => {
    const out = new Set<string>();
    (type.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).forEach(tok => { if (names.has(tok)) out.add(tok); });
    return [...out];
  };

  // Vertical level = length of the declared-base chain (roots at top).
  const depthCache = new Map<string, number>();
  const depthOf = (name: string, seen = new Set<string>()): number => {
    if (depthCache.has(name)) return depthCache.get(name)!;
    const c = byName.get(name);
    if (!c || !c.base || !byName.has(c.base) || seen.has(name)) { depthCache.set(name, 0); return 0; }
    seen.add(name);
    const d = depthOf(c.base, seen) + 1;
    depthCache.set(name, d);
    return d;
  };
  const rows: ClassInfo[][] = [];
  list.forEach(c => { const d = depthOf(c.name); (rows[d] ||= []).push(c); });

  const computeEdges = useCallback(() => {
    if (!containerRef.current) return;
    const crect = containerRef.current.getBoundingClientRect();
    const next: Edge[] = [];
    const rectOf = (name: string) => {
      const el = boxRefs.current[name];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - crect.left, y: r.top - crect.top, w: r.width, h: r.height };
    };

    // Generalization / realization: child-top → parent-bottom (hierarchy is vertical).
    const gen = (from: string, to: string, dashed: boolean) => {
      const a = rectOf(from), b = rectOf(to);
      if (!a || !b) return;
      const x1 = a.x + a.w / 2, y1 = a.y, x2 = b.x + b.w / 2, y2 = b.y + b.h;
      const midY = (y1 + y2) / 2;
      next.push({ kind: 'gen', dashed, d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}` });
    };

    // Association ("has-a"): border-to-border, arrow + multiplicity at the target.
    const assoc = (from: string, to: string, label: string, mult: string) => {
      const a = rectOf(from), b = rectOf(to);
      if (!a || !b) return;
      if (from === to) {
        // self-reference: small loop off the top-right corner.
        const x = a.x + a.w, y = a.y + 14;
        next.push({ kind: 'assoc', label, lx: x + 26, ly: y - 20, mult, mx: x + 30, my: y + 26,
          d: `M ${x} ${y} C ${x + 42} ${y - 26}, ${x + 42} ${y + 20}, ${x} ${y + 22}` });
        return;
      }
      const acx = a.x + a.w / 2, acy = a.y + a.h / 2, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
      const p1 = borderPoint(a, bcx, bcy), p2 = borderPoint(b, acx, acy);
      next.push({ kind: 'assoc', label, lx: (p1.x + p2.x) / 2, ly: (p1.y + p2.y) / 2 - 4,
        mult, mx: p2.x + (p2.x < bcx ? -10 : 10), my: p2.y - 6,
        d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}` });
    };

    list.forEach(c => {
      if (c.base && byName.has(c.base)) gen(c.name, c.base, false);
      c.interfaces.forEach(i => { if (byName.has(i)) gen(c.name, i, true); });
      // one association per referenced class; "*" if any referencing field is a collection.
      const assocMap = new Map<string, { label: string; multi: string }>();
      c.fields.forEach(fld => referenced(fld.type).forEach(r => {
        const multi = isCollection(fld.type) ? '*' : '1';
        const existing = assocMap.get(r);
        if (!existing) assocMap.set(r, { label: fld.name, multi });
        else if (multi === '*') existing.multi = '*';
      }));
      assocMap.forEach((v, r) => assoc(c.name, r, v.label, v.multi));
    });
    setEdges(next);
  }, [classes]);

  useLayoutEffect(() => {
    computeEdges();
    if (!containerRef.current) return;
    const ro = new ResizeObserver(computeEdges);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeEdges]);

  if (list.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}><i className="fa-solid fa-sitemap"></i></div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px' }}>OOP Concepts</div>
        <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.8, maxWidth: '320px', lineHeight: 1.6 }}>
          Define <code>class</code>, <code>interface</code>, <code>abstract class</code>, <code>struct</code> or <code>enum</code> types to
          see a UML diagram — boxes show fields &amp; methods, arrows show inheritance (solid) and interface realization (dashed).
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative', padding: '24px', boxSizing: 'border-box' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}>
        <defs>
          <marker id="uml-tri" markerWidth="16" markerHeight="16" refX="6" refY="6" orient="auto">
            <path d="M1,1 L11,6 L1,11 Z" fill="var(--bg1)" stroke="var(--text2)" strokeWidth="1" />
          </marker>
          <marker id="uml-arrow" markerWidth="12" markerHeight="12" refX="7" refY="5" orient="auto">
            <path d="M1,1 L8,5 L1,9" fill="none" stroke="var(--blue)" strokeWidth="1.4" />
          </marker>
        </defs>
        {edges.map((e, i) => e.kind === 'gen' ? (
          <path key={i} d={e.d} fill="none" stroke="var(--text2)" strokeWidth="1.5"
            strokeDasharray={e.dashed ? '5 4' : undefined} markerEnd="url(#uml-tri)" opacity={0.75} />
        ) : (
          <g key={i}>
            <path d={e.d} fill="none" stroke="var(--blue)" strokeWidth="1.3" markerEnd="url(#uml-arrow)" opacity={0.7} />
            {e.label && <text x={e.lx} y={e.ly} fontSize="9" fill="var(--blue)" textAnchor="middle" opacity={0.85}>{e.label}</text>}
            {e.mult && <text x={e.mx} y={e.my} fontSize="10" fill="var(--blue)" textAnchor="middle" fontWeight="700" opacity={0.9}>{e.mult}</text>}
          </g>
        ))}
      </svg>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '56px', alignItems: 'center' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {row.map(c => {
              const color = KIND_COLOR[c.kind] ?? 'var(--accent)';
              const active = activeLine >= c.startLine && activeLine <= c.endLine;
              const stereotype = c.kind === 'interface' ? '«interface»' : c.kind === 'abstract' ? '«abstract»' : c.kind === 'enum' ? '«enum»' : c.kind === 'struct' ? '«struct»' : null;
              return (
                <div key={c.name} ref={el => { boxRefs.current[c.name] = el; }}
                  style={{
                    minWidth: '190px', background: 'var(--bg1)', borderRadius: '6px',
                    borderStyle: 'solid', borderWidth: 1, borderColor: active ? color : 'var(--border2)',
                    borderTopWidth: 3, borderTopColor: color,
                    boxShadow: active ? `0 0 0 1px ${color}` : '0 4px 14px rgba(0,0,0,0.22)',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}>
                  <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    {stereotype && <div style={{ fontSize: '9px', color, letterSpacing: '1px', marginBottom: 2 }}>{stereotype}</div>}
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)', fontStyle: c.kind === 'abstract' ? 'italic' : 'normal' }}>{c.name}</div>
                  </div>
                  {c.fields.length > 0 && (
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {c.fields.map((m, i) => <MemberRow key={i} m={m} isMethod={false} />)}
                    </div>
                  )}
                  {c.methods.length > 0 && (
                    <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {c.methods.map((m, i) => <MemberRow key={i} m={m} isMethod={true} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
