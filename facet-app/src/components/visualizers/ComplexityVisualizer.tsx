interface ComplexityInfo {
  name: string; loopDepth: number; selfCalls: number; recursive: boolean; logarithmic: boolean;
  bigO: string; startLine: number; endLine: number;
}
interface Props { complexity?: ComplexityInfo[]; activeLine?: number; }

// Curve families, ordered best → worst, with a math function for the growth chart.
const FAMILIES: { key: string; label: string; color: string; fn: (n: number) => number }[] = [
  { key: 'const', label: 'O(1)', color: '#00ff66', fn: () => 1 },
  { key: 'log', label: 'O(log n)', color: '#00e5ff', fn: (n) => Math.log2(n) },
  { key: 'linear', label: 'O(n)', color: '#ffea00', fn: (n) => n },
  { key: 'nlogn', label: 'O(n log n)', color: '#ff8c00', fn: (n) => n * Math.log2(n) },
  { key: 'quad', label: 'O(n²)', color: '#ff00ea', fn: (n) => n * n },
  { key: 'cubic', label: 'O(n³)', color: '#b026ff', fn: (n) => n * n * n },
  { key: 'exp', label: 'O(2ⁿ)', color: '#ff2a2a', fn: (n) => Math.pow(2, n) },
];

const FAMILY_OF: Record<string, string> = {
  'O(1)': 'const', 'O(log n)': 'log', 'O(n)': 'linear', 'O(n) · log n': 'nlogn',
  'O(n²)': 'quad', 'O(n³)': 'cubic', 'O(2ⁿ)': 'exp',
};
const colorFor = (bigO: string) => FAMILIES.find(f => f.key === FAMILY_OF[bigO])?.color ?? 'var(--text2)';

// Worst → best ranking, so we can surface the dominating term and sort the list.
const RANK: Record<string, number> = { const: 0, log: 1, linear: 2, nlogn: 3, quad: 4, cubic: 5, exp: 6 };
const rankOf = (bigO: string) => RANK[FAMILY_OF[bigO]] ?? 2;

const W = 520, H = 260, padL = 40, padR = 16, padT = 16, padB = 28;
const N = 20, CAP = N * N; // O(n²) reaches the top; steeper curves clip (visually "worse")

function curvePoints(fn: (n: number) => number): string {
  const pts: string[] = [];
  for (let n = 1; n <= N; n++) {
    const x = padL + ((n - 1) / (N - 1)) * (W - padL - padR);
    const norm = Math.min(fn(n), CAP) / CAP;
    const y = (H - padB) - norm * (H - padB - padT);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

export default function ComplexityVisualizer({ complexity, activeLine = -1 }: Props) {
  const methods = complexity ?? [];

  if (methods.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}><i className="fa-solid fa-chart-line"></i></div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px' }}>Complexity · Big-O</div>
        <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.8, maxWidth: '320px', lineHeight: 1.6 }}>
          Define methods with loops or recursion to see an <em>estimated</em> Big-O per method and where it
          sits on the growth curve. (Static heuristic — nesting depth &amp; recursion, not a proof.)
        </div>
      </div>
    );
  }

  const present = new Set(methods.map(m => FAMILY_OF[m.bigO]).filter(Boolean));
  const sorted = [...methods].sort((a, b) => rankOf(b.bigO) - rankOf(a.bigO));
  const worst = sorted[0]; // dominating term across all methods

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '16px 20px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <i className="fa-solid fa-chart-line" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
          Estimated Complexity
        </span>
        {worst && (
          <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            overall
            <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700, color: colorFor(worst.bigO) }}>{worst.bigO}</span>
            <span style={{ color: 'var(--text3)' }}>({worst.name})</span>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Per-method estimates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px', flex: '1 1 220px' }}>
          {sorted.map((m, i) => {
            const active = activeLine >= m.startLine && activeLine <= m.endLine;
            const c = colorFor(m.bigO);
            const detail = m.selfCalls >= 2 ? `${m.selfCalls} recursive calls`
              : m.selfCalls === 1 ? 'recursive'
              : m.recursive ? 'mutually recursive'
              : m.loopDepth > 0 ? `${m.loopDepth} nested loop${m.loopDepth > 1 ? 's' : ''}${m.logarithmic ? ' + halving' : ''}`
              : m.logarithmic ? 'halving loop' : 'no loops';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '8px 12px', borderRadius: '6px', background: 'var(--bg1)',
                border: '1px solid ' + (active ? c : 'var(--border)'),
                boxShadow: active ? `0 0 10px ${c}` : 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', fontWeight: 700 }}>{m.name}()</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{detail}</div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>{m.bigO}</span>
              </div>
            );
          })}
        </div>

        {/* Growth chart */}
        <div style={{ flex: '2 1 360px', minWidth: '300px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: '320px' }}>
            {/* axes */}
            <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--border2)" strokeWidth="1" />
            <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border2)" strokeWidth="1" />
            <text x={padL - 6} y={padT + 6} fontSize="9" fill="var(--text3)" textAnchor="end">ops</text>
            <text x={W - padR} y={H - padB + 18} fontSize="9" fill="var(--text3)" textAnchor="end">input size n →</text>
            {/* curves: detected families bold, others faint */}
            {FAMILIES.map(f => {
              const on = present.has(f.key);
              return (
                <polyline key={f.key} points={curvePoints(f.fn)} fill="none" stroke={f.color}
                  strokeWidth={on ? 2.5 : 1} opacity={on ? 1 : 0.18} strokeLinejoin="round" strokeLinecap="round" />
              );
            })}
          </svg>
          {/* legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
            {FAMILIES.map(f => {
              const on = present.has(f.key);
              return (
                <span key={f.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontFamily: 'var(--mono)', color: on ? f.color : 'var(--text3)', opacity: on ? 1 : 0.5, fontWeight: on ? 700 : 400 }}>
                  <span style={{ width: '12px', height: '2px', background: f.color, display: 'inline-block' }}></span>{f.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
