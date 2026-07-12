import { useRef, useEffect } from 'react';

// A floating, draggable, resizable terminal window (modeled on NotePanel). It's
// the running C# program's console — output streams in, and typing sends input to
// the program's stdin (Console.ReadLine). It is NOT a system shell.

interface Props {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  running: boolean;
  error: string | null;
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  onRerun: () => void;
}

export default function ConsolePanel({ isOpen, onClose, text, running, error, input, setInput, onSend, onRerun }: Props) {
  // Position is held in a ref and applied to the DOM directly during a drag, so we
  // don't re-render the (potentially large) terminal on every pointer move.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: 160, y: 120 });
  const dragStart = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep scrolled to newest output; focus the input while the program runs.
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [text]);
  useEffect(() => { if (isOpen && running) inputRef.current?.focus(); }, [isOpen, running]);

  if (!isOpen) return null;

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // let header buttons work
    dragging.current = true;
    dragStart.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none'; // don't select page text while dragging
    e.preventDefault();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const x = e.clientX - dragStart.current.x;
    const y = e.clientY - dragStart.current.y;
    posRef.current = { x, y };
    if (panelRef.current) { panelRef.current.style.left = `${x}px`; panelRef.current.style.top = `${y}px`; }
  };
  const onUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    document.body.style.userSelect = '';
  };

  return (
    <div ref={panelRef} className="panel"
      style={{ position: 'fixed', left: posRef.current.x, top: posRef.current.y, width: 560, height: 380, minWidth: 320, minHeight: 200, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid var(--border)', resize: 'both', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0c' }}>
      <div className="phd" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ cursor: 'move', userSelect: 'none' }}>
        <span className="phd-bar" style={{ background: 'var(--accent)' }}></span>
        <span className="phd-icon" style={{ color: 'var(--accent)' }}><i className="fa-solid fa-terminal"></i></span>
        <span className="phd-title">Console <small style={{ color: running ? 'var(--accent)' : 'var(--text3)' }}>{running ? '● running' : '○ idle'}</small></span>
        <div className="phd-acts">
          {!running && (
            <button onClick={onRerun} title="Run again"
              style={{ fontSize: 9, background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 2, cursor: 'pointer' }}>
              <i className="fa-solid fa-rotate-right"></i> Re-run
            </button>
          )}
          <button className="pa pa-x" title="Close (stops the program)" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div ref={bodyRef} onClick={() => inputRef.current?.focus()}
        style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)', cursor: 'text', minHeight: 0 }}>
        {error
          ? <span style={{ color: 'var(--red)' }}>{error}</span>
          : <>{text}{running && text === '' && <span style={{ color: 'var(--text3)' }}>Starting…</span>}</>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)', padding: '7px 12px', flexShrink: 0 }}>
        <i className="fa-solid fa-angle-right" style={{ color: running ? 'var(--accent)' : 'var(--text3)', fontSize: 12 }}></i>
        <input ref={inputRef} value={input} disabled={!running}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSend(); } }}
          placeholder={running ? 'type input for your program, press Enter…' : 'program not running — Re-run to start again'}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }} />
      </div>
    </div>
  );
}
