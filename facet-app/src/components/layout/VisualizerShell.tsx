import { useState, useRef } from 'react';
import DataStructureVisualizer from '../visualizers/DataStructureVisualizer';
import FlowVisualizer from '../visualizers/FlowVisualizer';
import AnimationVisualizer from '../visualizers/AnimationVisualizer';
import OOPVisualizer from '../visualizers/OOPVisualizer';
import RecursionVisualizer from '../visualizers/RecursionVisualizer';
import ComplexityVisualizer from '../visualizers/ComplexityVisualizer';

interface Props {
  activeStep: number;
  traceData: any[];
  astData: any | null;
  classesData?: any[] | null;
  callTreeData?: any[] | null;
  complexityData?: any[] | null;
  activeLens: string;
  setActiveLens: (id: string) => void;
  isMinimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
}

// Per-lens legend shown by the help (?) overlay.
const LEGENDS: Record<string, { c: string; t: string }[]> = {
  data: [
    { c: 'var(--accent)', t: 'Object / node card (ref id at top-right)' },
    { c: 'var(--blue)', t: 'Arrow = pointer/reference to another object' },
    { c: 'var(--pink)', t: 'Cell changed since the previous step' },
    { c: 'var(--text3)', t: 'Small number under a cell = array index' },
  ],
  flow: [
    { c: 'var(--text2)', t: 'Frames (left) = variables in scope this step' },
    { c: 'var(--text)', t: 'Objects (right) = values on the heap' },
    { c: 'var(--blue)', t: 'Arrow = a variable/field pointing at an object' },
    { c: 'var(--pink)', t: 'Cell changed since the previous step' },
  ],
  oop: [
    { c: 'var(--blue)', t: '«interface»' },
    { c: 'var(--purple)', t: '«abstract» class (name in italics)' },
    { c: 'var(--accent)', t: 'concrete class' },
    { c: 'var(--text2)', t: 'Solid ▷ arrow = inherits (extends)' },
    { c: 'var(--text2)', t: 'Dashed ▷ arrow = implements interface' },
    { c: 'var(--blue)', t: 'Thin arrow = has-a (association), 1 or * multiplicity' },
  ],
  recur: [
    { c: 'var(--accent)', t: 'Highlighted = frame on the call stack now' },
    { c: 'var(--yellow)', t: '"running" = currently executing' },
    { c: 'var(--blue)', t: '→ value = the call returned this result' },
    { c: 'var(--text3)', t: 'Dimmed = not called yet at this step' },
  ],
  anim: [
    { c: 'var(--yellow)', t: 'Comparing — cell read on this step' },
    { c: 'var(--pink)', t: 'Swapped — value changed on this step' },
    { c: 'var(--blue)', t: 'i / j label = index variable (cursor)' },
    { c: 'var(--accent)', t: 'Bar height = element value' },
  ],
  bigo: [
    { c: 'var(--accent)', t: 'Estimated Big-O badge per method' },
    { c: 'var(--red)', t: 'Steeper curve = worse growth' },
    { c: 'var(--text2)', t: 'Bold curves = complexities detected in your code' },
    { c: 'var(--text2)', t: '"overall" = worst case across all methods' },
  ],
};

const LENSES = [
  { id: 'flow', label: 'Flow', icon: 'fa-solid fa-diagram-project' },
  { id: 'data', label: 'Data Structures', icon: 'fa-solid fa-boxes-stacked' },
  { id: 'oop', label: 'OOP Concepts', icon: 'fa-solid fa-sitemap' },
  { id: 'recur', label: 'Recursion', icon: 'fa-solid fa-arrow-rotate-left' },
  { id: 'anim', label: 'Algorithm', icon: 'fa-solid fa-chart-simple' },
  { id: 'bigo', label: 'Complexity', icon: 'fa-solid fa-chart-line' },
];

export default function VisualizerShell({ activeStep, traceData, astData: _astData, classesData, callTreeData, complexityData, activeLens, setActiveLens, isMinimized, onMinimize, onClose }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reset View: scroll the active lens (and any scrolled inner container) back to origin.
  const resetView = () => {
    const root = bodyRef.current;
    if (!root) return;
    root.scrollTo?.(0, 0);
    root.querySelectorAll<HTMLElement>('*').forEach(el => {
      if (el.scrollTop || el.scrollLeft) el.scrollTo?.(0, 0);
    });
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="phd" style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Horizontal scrollable tab bar */}
        <div 
          style={{ display: 'flex', overflowX: 'auto', flex: 1, padding: '4px 8px', gap: '4px', scrollbarWidth: 'none' }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {LENSES.map(lens => {
            const isActive = lens.id === activeLens;
            return (
              <button 
                key={lens.id}
                onClick={() => setActiveLens(lens.id)}
                style={{ 
                  background: isActive ? 'var(--bg3)' : 'transparent', 
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  color: isActive ? 'var(--text)' : 'var(--text2)',
                  padding: '4px 10px', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className={lens.icon} style={{ color: isActive ? 'var(--accent)' : 'inherit' }}></i>
                {lens.label}
              </button>
            )
          })}
        </div>

        <div className="phd-acts" style={{ paddingRight: '8px', background: 'var(--bg2)', height: '100%', display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border)' }}>
          <button className="pa" title="Legend / Help" onClick={() => setShowHelp(h => !h)} style={showHelp ? { color: 'var(--accent)' } : undefined}><i className="fa-solid fa-question"></i></button>
          <button className="pa" title="Reset View" onClick={resetView}><i className="fa-solid fa-rotate-left"></i></button>
          <button className="pa" title={isMinimized ? "Expand" : "Minimize"} onClick={onMinimize}>
            {isMinimized ? <i className="fa-solid fa-plus"></i> : <i className="fa-solid fa-minus"></i>}
          </button>
          <button className="pa pa-x" title="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      {!isMinimized && (
        <div ref={bodyRef} className="pbody" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg0)', position: 'relative' }}>
          {showHelp && (
            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 20, width: '300px', background: 'rgba(20,22,28,0.96)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '14px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent)', fontWeight: 'bold' }}>
                  {LENSES.find(l => l.id === activeLens)?.label} · Legend
                </span>
                <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: 'var(--text3)', fontSize: '12px' }} onClick={() => setShowHelp(false)}></i>
              </div>
              {(LEGENDS[activeLens] ?? [{ c: 'var(--text3)', t: 'This lens has no special symbols yet.' }]).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '6px 0' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '3px', background: item.c, flexShrink: 0, marginTop: '2px' }}></span>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.4 }}>{item.t}</span>
                </div>
              ))}
            </div>
          )}
          {activeLens === 'data' ? (
            <DataStructureVisualizer heap={traceData[activeStep - 1]?.heap} prevHeap={traceData[activeStep - 2]?.heap} stack={traceData[activeStep - 1]?.stack} />
          ) : activeLens === 'flow' ? (
            <FlowVisualizer heap={traceData[activeStep - 1]?.heap} stack={traceData[activeStep - 1]?.stack} prevHeap={traceData[activeStep - 2]?.heap} />
          ) : activeLens === 'anim' ? (
            <AnimationVisualizer heap={traceData[activeStep - 1]?.heap} prevHeap={traceData[activeStep - 2]?.heap} stack={traceData[activeStep - 1]?.stack} accessed={traceData[activeStep - 1]?.accessed} />
          ) : activeLens === 'oop' ? (
            <OOPVisualizer classes={classesData ?? undefined} activeLine={traceData[activeStep - 1]?.line || -1} />
          ) : activeLens === 'recur' ? (
            <RecursionVisualizer callTree={callTreeData ?? undefined} activeStep={activeStep} />
          ) : activeLens === 'bigo' ? (
            <ComplexityVisualizer complexity={complexityData ?? undefined} activeLine={traceData[activeStep - 1]?.line || -1} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>
                <i className={LENSES.find(l => l.id === activeLens)?.icon}></i>
              </div>
              <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px' }}>
                {LENSES.find(l => l.id === activeLens)?.label} Visualizer
              </div>
              <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
                Implementation Pending... (Tracing Step {activeStep})
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
