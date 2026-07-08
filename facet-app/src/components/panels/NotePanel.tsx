import { useState, useRef } from 'react';
import { askOpenRouter } from '../../utils/ai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  note: string;
  setNote: (note: string) => void;
}

export default function NotePanel({ isOpen, onClose, note, setNote }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    // capture pointer so dragging works even if moving outside the header fast
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleCleanup = async () => {
    if (!note.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const prompt = `Please clean up, organize, and format the following notes. Fix any typos and structure it logically. Keep it concise.\n\nNotes:\n${note}`;
      const result = await askOpenRouter('You are an AI Note Organizer. Output ONLY the formatted notes, nothing else.', prompt);
      setNote(result);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="panel note"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: '350px',
        height: '300px',
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        border: '1px solid var(--border)',
        resize: 'both',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div 
        className="phd" 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: 'move', userSelect: 'none' }}
      >
        <span className="phd-bar" style={{ background: 'var(--yellow)' }}></span>
        <span className="phd-icon" style={{ color: 'var(--yellow)' }}><i className="fa-solid fa-pen"></i></span>
        <span className="phd-title">Notes</span>
        <div className="phd-acts">
          <button onClick={handleCleanup} disabled={isLoading} style={{ 
            fontSize: '9px', background: 'var(--bg2)', color: 'var(--text2)', 
            border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '2px', cursor: isLoading ? 'not-allowed' : 'pointer' 
          }}>
            {isLoading ? 'Cleaning...' : <><i className="fa-solid fa-wand-magic-sparkles"></i> AI Clean-up</>}
          </button>
          <button className="pa pa-x" title="Close" onClick={onClose} style={{ cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div className="pbody" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <textarea 
          className="note-edit" 
          style={{ width: '100%', resize: 'none', background: 'transparent', flex: 1 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Watch out for..."
        />
      </div>
    </div>
  );
}
