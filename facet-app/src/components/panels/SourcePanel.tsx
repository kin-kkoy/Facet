import { useRef, useEffect, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, Decoration, type DecorationSet } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { StreamLanguage } from '@codemirror/language';
import { csharp } from '@codemirror/legacy-modes/mode/clike';
import { oneDark } from '@codemirror/theme-one-dark';
import { askOpenRouter } from '../../utils/ai';

/* ── executing-line highlight (driven by the trace step) ───────── */
const setExecLine = StateEffect.define<number>();          // 1-based line, 0 = none
const execLineDeco = Decoration.line({ class: 'cm-exec-line' });
const execLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setExecLine)) {
        const line = e.value;
        if (line >= 1 && line <= tr.state.doc.lines) {
          deco = Decoration.set([execLineDeco.range(tr.state.doc.line(line).from)]);
        } else {
          deco = Decoration.none;
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/* ── Facet OLED theme (overrides oneDark backgrounds) ─────────── */
const facetTheme = EditorView.theme({
  '&': {
    backgroundColor: '#000000',
    color: '#eeeeee',
    fontSize: '13px',
    fontFamily: "'SF Mono', ui-monospace, 'Cascadia Code', 'Fira Code', Menlo, Consolas, monospace",
    height: '100%',
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: 'var(--accent, #00ff66)',
  },
  '.cm-gutters': {
    backgroundColor: '#000000',
    color: '#555555',
    border: 'none',
    minWidth: '40px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#111111',
  },
  '.cm-activeLine': {
    backgroundColor: '#111111',
  },
  '.cm-exec-line': {
    backgroundColor: 'rgba(0, 255, 102, 0.13)',
    boxShadow: 'inset 3px 0 0 var(--accent, #00ff66)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--accent, #00ff66)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#264f78 !important',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
}, { dark: true });

interface FileTab { id: string; name: string; }

interface Props {
  code: string;
  setCode: (code: string) => void;
  activeStep: number;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  // Multi-file tabs
  files?: FileTab[];
  activeId?: string;
  fileId?: string;                 // drives editor recreation on tab switch
  onSelectFile?: (id: string) => void;
  onAddFile?: () => void;
  onRenameFile?: (id: string, name: string) => void;
  onCloseFile?: (id: string) => void;
  onReorderFile?: (fromId: string, toId: string) => void;
}

export default function SourcePanel({ code, setCode, activeStep, isMinimized, onMinimize, onClose, files, activeId, fileId, onSelectFile, onAddFile, onRenameFile, onCloseFile, onReorderFile }: Props) {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const activeName = files?.find(f => f.id === activeId)?.name ?? 'Program.cs';
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const codeRef = useRef(code);

  // Keep codeRef in sync so the update listener doesn't stale-close over `code`
  codeRef.current = code;

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const state = EditorState.create({
      doc: codeRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        keymap.of([...defaultKeymap, indentWithTab]),
        StreamLanguage.define(csharp),
        execLineField,
        oneDark,
        facetTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            setCode(newCode);
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // Recreate the editor when the active file changes so each file gets its own
    // undo history + cursor. `codeRef.current` (synced above) seeds the new doc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // Sync external code changes (e.g. from AI refine) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (code !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code]);

  // Highlight the currently-executing line and scroll it into view as the user
  // scrubs the trace timeline. `activeStep` here carries the current line number.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const line = activeStep;
    const effects: StateEffect<unknown>[] = [setExecLine.of(line)];
    if (line >= 1 && line <= view.state.doc.lines) {
      effects.push(EditorView.scrollIntoView(view.state.doc.line(line).from, { y: 'center' }));
    }
    view.dispatch({ effects });
  }, [activeStep]);

  const handleRefine = async () => {
    if (isRefining || !code.trim()) return;
    setIsRefining(true);
    setRefinementFeedback('');
    try {
      const prompt = `Analyze this C# code. If there are any obvious structural flaws, bugs, or cleanups, briefly explain them. Then provide a slightly optimized version if applicable.\n\nCode:\n${code}`;
      const result = await askOpenRouter('You are an expert C# Code Reviewer. Be concise and helpful.', prompt);
      setRefinementFeedback(result);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="panel source">
      <div className="phd">
        <span className="phd-bar" style={{ background: 'var(--blue)' }}></span>
        <span className="phd-icon" style={{ color: 'var(--blue)' }}>◇</span>
        <span className="phd-title">Source <small>{activeName}</small></span>
        <div className="phd-acts">
          <button onClick={handleRefine} disabled={isRefining} style={{ 
            fontSize: '9px', background: 'var(--bg2)', color: 'var(--text2)', 
            border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '2px', cursor: isRefining ? 'not-allowed' : 'pointer' 
          }}>
            {isRefining ? 'Refining...' : <><i className="fa-solid fa-wand-magic-sparkles"></i> Refine w/ AI</>}
          </button>
          <button className="pa" title={isMinimized ? "Expand" : "Minimize"} onClick={onMinimize}>
            {isMinimized ? <i className="fa-solid fa-plus"></i> : <i className="fa-solid fa-minus"></i>}
          </button>
          <button className="pa pa-x" title="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {refinementFeedback && (
            <div style={{
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              padding: '12px 16px',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: 'var(--mono)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}><i className="fa-solid fa-wand-magic-sparkles"></i> AI SUGGESTIONS</span>
                <button onClick={() => setRefinementFeedback('')} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{refinementFeedback}</div>
            </div>
          )}

          <div className="pbody" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {files && files.length > 0 && onSelectFile && (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, background: '#0a0a0c', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
                {files.map(f => {
                  const active = f.id === activeId;
                  const canDrag = !!onReorderFile && renamingId !== f.id && files.length > 1;
                  return (
                    <div key={f.id}
                      draggable={canDrag}
                      onDragStart={canDrag ? (e) => { setDragId(f.id); e.dataTransfer.effectAllowed = 'move'; } : undefined}
                      onDragOver={canDrag ? (e) => { e.preventDefault(); if (dragId && dragId !== f.id) setDropId(f.id); } : undefined}
                      onDragLeave={canDrag ? () => setDropId(d => (d === f.id ? null : d)) : undefined}
                      onDrop={canDrag ? (e) => { e.preventDefault(); if (dragId && dragId !== f.id) onReorderFile!(dragId, f.id); setDragId(null); setDropId(null); } : undefined}
                      onDragEnd={() => { setDragId(null); setDropId(null); }}
                      onClick={() => { if (renamingId !== f.id) onSelectFile(f.id); }}
                      onDoubleClick={() => { setRenamingId(f.id); setRenameDraft(f.name); }}
                      title={renamingId === f.id ? '' : 'Double-click to rename · drag to reorder'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', cursor: canDrag ? 'grab' : 'pointer',
                        fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap',
                        color: active ? 'var(--text)' : 'var(--text3)',
                        background: active ? '#000' : 'transparent',
                        borderTop: active ? '2px solid var(--blue)' : '2px solid transparent',
                        borderLeft: dropId === f.id ? '2px solid var(--accent)' : '2px solid transparent',
                        opacity: dragId === f.id ? 0.4 : 1,
                      }}>
                      {renamingId === f.id ? (
                        <input autoFocus value={renameDraft}
                          onChange={e => setRenameDraft(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={() => { const n = renameDraft.trim(); if (n && onRenameFile) onRenameFile(f.id, n); setRenamingId(null); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { const n = renameDraft.trim(); if (n && onRenameFile) onRenameFile(f.id, n); setRenamingId(null); }
                            else if (e.key === 'Escape') setRenamingId(null);
                          }}
                          style={{ width: Math.max(60, renameDraft.length * 7), background: '#111', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, fontFamily: 'var(--mono)', fontSize: 11, padding: '1px 4px' }} />
                      ) : (
                        <>
                          <i className="fa-solid fa-file-code" style={{ fontSize: 9, opacity: 0.6 }} />
                          <span>{f.name}</span>
                          {files.length > 1 && onCloseFile && (
                            <span onClick={e => { e.stopPropagation(); onCloseFile(f.id); }} title="Close file"
                              style={{ marginLeft: 2, opacity: 0.5, fontSize: 10 }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                              <i className="fa-solid fa-xmark" />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                {onAddFile && (
                  <button onClick={onAddFile} title="New file"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0 10px', fontSize: 12 }}>
                    <i className="fa-solid fa-plus" />
                  </button>
                )}
              </div>
            )}
            <div ref={editorContainerRef} style={{ flex: 1, height: '100%', width: '100%', minHeight: 0 }} />
          </div>
        </>
      )}
    </div>
  );
}
