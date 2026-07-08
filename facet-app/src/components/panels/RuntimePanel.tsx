import { useState } from 'react';

interface Props {
  activeStep: number;
  stack: Record<string, any>;
  output?: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
}

export default function RuntimePanel({ stack, output, isMinimized, onMinimize, onClose }: Props) {
  const [prediction, setPrediction] = useState('');
  const [showPredictionResult, setShowPredictionResult] = useState(false);

  return (
    <div className="panel">
      <div className="phd">
        <span className="phd-title">Runtime <small>STATE & PREDICT</small></span>
        <div className="phd-acts">
          <button className="pa" title={isMinimized ? "Expand" : "Minimize"} onClick={onMinimize}>
            {isMinimized ? <i className="fa-solid fa-plus"></i> : <i className="fa-solid fa-minus"></i>}
          </button>
          <button className="pa pa-x" title="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      {!isMinimized && (
        <div className="pbody" style={{ overflowY: 'auto' }}>
        {/* RUNTIME VARIABLES */}
        <div style={{ marginBottom: '20px' }}>
          {Object.entries(stack).length === 0 && (
            <div className="rhint" style={{ marginTop: '10px' }}>No variables declared yet.</div>
          )}
          {Object.entries(stack).map(([key, value], idx) => {
            const colors = ['var(--red)', 'var(--blue)', 'var(--green)', 'var(--yellow)', 'var(--pink)'];
            const color = colors[idx % colors.length];
            
            let displayValue = 'null';
            if (value && typeof value === 'object' && value.ref) {
              displayValue = `[Reference ${value.ref}]`;
            } else if (value !== null && value !== undefined) {
              displayValue = value.toString();
            }

            return (
              <div className="rrow" key={key}>
                <div className="rdot" style={{ background: color }}></div>
                <span className="rn">{key}</span>
                <input type="text" value={displayValue} readOnly />
              </div>
            );
          })}
        </div>

        {/* STANDARD OUTPUT */}
        {output && (
          <div style={{ marginBottom: '20px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
            <div className="rhint" style={{ marginBottom: '10px' }}>STDOUT</div>
            <div className="rrow" style={{ alignItems: 'flex-start' }}>
              <span className="rn">Output</span>
              <textarea 
                readOnly 
                value={output} 
                style={{ flex: 1, minHeight: '60px', background: 'transparent', color: 'var(--text)', border: 'none', resize: 'none', fontFamily: 'var(--mono)', fontSize: '11px' }} 
              />
            </div>
          </div>
        )}

        {/* PREDICTION SECTION */}
        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
          <div className="rhint" style={{ marginBottom: '10px' }}>PREDICT NEXT STEP</div>
          <div className="pq">
            Before stepping, what will <code>curr.next</code> point to?
          </div>
          <div className="prow">
            <input 
              type="text" 
              placeholder="Your answer..." 
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              disabled={showPredictionResult}
            />
            <button 
              className="pbtn" 
              onClick={() => setShowPredictionResult(true)}
              disabled={showPredictionResult}
            >
              Check
            </button>
          </div>

          {showPredictionResult && (
            <div className="presult match show">
              <b>MATCH:</b> Your prediction <code>{prediction}</code> matches the actual runtime state.
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  );
}
