import { useRef, useLayoutEffect } from 'react';

interface CallNode {
  id: number; name: string; args: string; return: string | null;
  depth: number; enterStep: number; exitStep: number; children: CallNode[];
}
interface Props { callTree?: CallNode[]; activeStep?: number; }

// The chain of frames currently on the call stack at `activeStep` (root → deepest running).
function activePath(nodes: CallNode[], activeStep: number): CallNode[] {
  for (const n of nodes) {
    const onStack = activeStep >= n.enterStep && (n.exitStep === 0 || activeStep < n.exitStep);
    if (onStack) return [n, ...activePath(n.children, activeStep)];
  }
  return [];
}

function Frame({ node, activeStep }: { node: CallNode; activeStep: number }) {
  // Temporal state relative to the current step:
  //  future  — not called yet (dim)
  //  onStack — entered but not yet returned (highlight, "running")
  //  done    — returned by now (show return value, or ✓ for void)
  const future = activeStep > 0 && activeStep < node.enterStep;
  const done = activeStep <= 0 || (node.exitStep > 0 && activeStep >= node.exitStep);
  const onStack = !future && !done;
  return (
    <div style={{ marginLeft: node.depth === 0 ? 0 : '18px', borderLeft: node.depth === 0 ? 'none' : '1px solid var(--border)', paddingLeft: node.depth === 0 ? 0 : '12px' }}>
      <div data-onstack={onStack ? '1' : undefined} style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '3px 0', padding: '3px 10px',
        borderRadius: '5px', fontFamily: 'var(--mono)', fontSize: '12px',
        background: onStack ? 'var(--bg3)' : 'var(--bg1)',
        border: '1px solid ' + (onStack ? 'var(--accent)' : 'var(--border)'),
        boxShadow: onStack ? '0 0 10px rgba(0,255,102,0.25)' : 'none',
        opacity: future ? 0.4 : 1,
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
      }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{node.name}</span>
        <span style={{ color: 'var(--text2)' }}>({node.args})</span>
        {onStack
          ? <span style={{ color: 'var(--yellow)', fontSize: '10px' }}><i className="fa-solid fa-spinner" style={{ marginRight: '4px' }}></i>running</span>
          : done
            ? (node.return !== null
                ? <span style={{ color: 'var(--text3)' }}>→ <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{node.return}</span></span>
                : <span style={{ color: 'var(--text3)' }}><i className="fa-solid fa-check" style={{ fontSize: '9px' }}></i></span>)
            : null}
      </div>
      {node.children.map(c => <Frame key={c.id} node={c} activeStep={activeStep} />)}
    </div>
  );
}

export default function RecursionVisualizer({ callTree, activeStep = 0 }: Props) {
  const roots = callTree ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the deepest running frame in view as the timeline advances.
  useLayoutEffect(() => {
    const els = scrollRef.current?.querySelectorAll('[data-onstack]');
    if (els && els.length) (els[els.length - 1] as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [activeStep]);

  if (roots.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}><i className="fa-solid fa-arrow-rotate-left"></i></div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px' }}>Recursion</div>
        <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.8, maxWidth: '320px', lineHeight: 1.6 }}>
          Call a method (e.g. a recursive <code>Fib(n)</code> or <code>Factorial(n)</code>) to see the call
          tree — each node shows its arguments and return value, and frames on the stack at the current
          step are highlighted as you scrub.
        </div>
      </div>
    );
  }

  // Max call depth reached, for a small stat.
  let maxDepth = 0, total = 0;
  const walk = (n: CallNode) => { maxDepth = Math.max(maxDepth, n.depth); total++; n.children.forEach(walk); };
  roots.forEach(walk);

  const path = activeStep > 0 ? activePath(roots, activeStep) : [];

  return (
    <div ref={scrollRef} style={{ width: '100%', height: '100%', overflow: 'auto', padding: '16px 20px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        <i className="fa-solid fa-arrow-rotate-left" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
        Call Tree · {total} calls · max depth {maxDepth + 1}
      </div>

      {path.length > 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', padding: '6px 10px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '5px' }}>
          <span style={{ color: 'var(--text3)', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '1px', marginRight: '4px' }}>stack</span>
          {path.map((n, i) => (
            <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {i > 0 && <i className="fa-solid fa-chevron-right" style={{ fontSize: '7px', color: 'var(--text3)' }}></i>}
              <span style={{ color: i === path.length - 1 ? 'var(--accent)' : 'var(--text2)', fontWeight: i === path.length - 1 ? 700 : 400 }}>
                {n.name}({n.args})
              </span>
            </span>
          ))}
        </div>
      )}

      {roots.map(r => <Frame key={r.id} node={r} activeStep={activeStep} />)}
    </div>
  );
}
