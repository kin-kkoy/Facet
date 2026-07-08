interface Props {
  heap?: Record<string, any>;
  prevHeap?: Record<string, any>;
  stack?: Record<string, any>;
  accessed?: number[];
}

// Pick the most interesting numeric array in the heap to animate: the longest
// _elements list whose members are all plain numbers (int[]/List<int>/...).
function findNumericArray(heap?: Record<string, any>): { refId: string; type: string; values: number[] } | null {
  if (!heap) return null;
  let best: { refId: string; type: string; values: number[] } | null = null;
  for (const [refId, obj] of Object.entries(heap)) {
    const els = (obj as any)?._elements;
    if (!Array.isArray(els) || els.length === 0) continue;
    if (!els.every((e) => typeof e === 'number')) continue;
    if (!best || els.length > best.values.length) {
      best = { refId, type: (obj as any)._type ?? 'Array', values: els as number[] };
    }
  }
  return best;
}

export default function AnimationVisualizer({ heap, prevHeap, stack, accessed }: Props) {
  const current = findNumericArray(heap);

  if (!current) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}><i className="fa-solid fa-chart-simple"></i></div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px' }}>Algorithm Animation</div>
        <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.8, maxWidth: '320px', lineHeight: 1.6 }}>
          Run code that builds a numeric array (e.g. <code>int[]</code> or <code>List&lt;int&gt;</code>),
          then press <i className="fa-solid fa-play" style={{ margin: '0 3px' }}></i> and scrub — each bar is an
          element, and cells that change between steps flash to show swaps.
        </div>
      </div>
    );
  }

  const prevValues: number[] | undefined = prevHeap?.[current.refId]?._elements;
  const { values, type } = current;
  const base = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const span = max - base || 1;

  // Integer stack variables whose value is a valid index act as cursors (i, j, ...).
  const pointers = new Map<number, string[]>();
  if (stack) {
    for (const [name, val] of Object.entries(stack)) {
      if (typeof val === 'number' && Number.isInteger(val) && val >= 0 && val < values.length) {
        const arr = pointers.get(val) ?? [];
        arr.push(name);
        pointers.set(val, arr);
      }
    }
  }
  const hasPointers = pointers.size > 0;
  const reading = new Set((accessed ?? []).filter(i => i >= 0 && i < values.length));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 20px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', flexShrink: 0 }}>
        <i className="fa-solid fa-chart-simple" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
        {type} · {values.length} elements
        <span style={{ float: 'right', color: 'var(--text3)', textTransform: 'none' }}>
          <span style={{ color: 'var(--yellow)' }}>◻</span> comparing&nbsp;&nbsp;
          <span style={{ color: 'var(--pink)' }}>■</span> swapped
          {hasPointers && <>&nbsp;&nbsp;<span style={{ color: 'var(--blue)' }}>i</span> index var</>}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: values.length > 30 ? '2px' : '6px', minHeight: 0, paddingTop: '20px' }}>
        {values.map((v, idx) => {
          const changed = prevValues !== undefined && prevValues[idx] !== undefined && prevValues[idx] !== v;
          const heightPct = ((v - base) / span) * 100;
          const ptrs = pointers.get(idx);
          const isReading = reading.has(idx);
          return (
            <div
              key={idx}
              style={{ flex: 1, maxWidth: '64px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}
            >
              <span style={{ fontSize: values.length > 24 ? '0px' : '10px', fontFamily: 'var(--mono)', color: changed ? 'var(--pink)' : 'var(--text2)', fontWeight: changed ? 700 : 400, transition: 'color 0.15s' }}>
                {v}
              </span>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(heightPct, 2)}%`,
                  background: changed ? 'var(--pink)' : 'var(--accent)',
                  borderRadius: '3px 3px 0 0',
                  boxShadow: changed ? '0 0 12px var(--pink)' : isReading ? '0 0 12px var(--yellow)' : 'none',
                  outline: isReading ? '2px solid var(--yellow)' : undefined,
                  outlineOffset: '1px',
                  opacity: changed ? 1 : 0.72,
                  transition: 'height 0.18s var(--ease), background 0.18s, box-shadow 0.18s, opacity 0.18s',
                }}
                title={`[${idx}] = ${v}`}
              />
              <span style={{ fontSize: values.length > 24 ? '0px' : '9px', fontFamily: 'var(--mono)', color: 'var(--text3)', flexShrink: 0 }}>
                {idx}
              </span>
              <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--blue)', fontWeight: 700, minHeight: '12px', flexShrink: 0 }}>
                {ptrs ? ptrs.join(',') : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
