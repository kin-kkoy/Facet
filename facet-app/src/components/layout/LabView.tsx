import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import SourcePanel from '../panels/SourcePanel';
import NotePanel from '../panels/NotePanel';
import ConsolePanel from '../panels/ConsolePanel';
import VisualizerShell from './VisualizerShell';
import RuntimePanel from '../panels/RuntimePanel';
import { askAIWithRetry, getSelectedModel, isSelectedModelFree } from '../../utils/ai';
import { type LabFile, baseName } from '../../utils/files';

let fileSeq = 1;
const newFileId = () => `file-${++fileSeq}-${Date.now().toString(36)}`;

// Concatenate the files (in tab order) into one blob for the engine, with an
// optional stub prefix (used by Supercompile). Returns per-file global line
// offsets so a trace line in the blob can be mapped back to (file, local line).
interface BlobLayout { layout: { id: string; start: number; lines: number }[]; prefixLines: number; }
function buildBlob(files: LabFile[], prefix?: string): { blob: string; info: BlobLayout } {
  const lineCount = (s: string) => s.split('\n').length;
  const prefixLines = prefix ? lineCount(prefix) : 0;
  let start = prefixLines + 1; // body starts on the line after the prefix
  const layout = files.map(f => { const entry = { id: f.id, start, lines: lineCount(f.content) }; start += entry.lines; return entry; });
  const body = files.map(f => f.content).join('\n');
  const blob = prefix ? `${prefix}\n${body}` : body;
  return { blob, info: { layout, prefixLines } };
}
// Global blob line -> { id, local } for the owning file, or null (e.g. inside the stub prefix).
function mapGlobalLine(global: number, info: BlobLayout | null): { id: string; local: number } | null {
  if (!info) return null;
  for (const e of info.layout) if (global >= e.start && global < e.start + e.lines) return { id: e.id, local: global - e.start + 1 };
  return null;
}

// ── Supercompile helpers: shape AI stubs to Roslyn *script* rules ──────────
const stripFences = (s: string) => s.replace(/^\s*```(?:csharp|cs|c#)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
const stripUsings = (s: string) => s.replace(/^[ \t]*using\s+[^;]+;[ \t]*$/gm, '').trim();
// `sealed`/`abstract` on stub types cause "cannot derive from sealed" / "cannot
// instantiate abstract" — harmless to drop for mocks.
const stripSealedAbstract = (s: string) => s.replace(/\b(?:sealed|abstract)\b\s*/g, '');
// After unwrapping namespaces, any namespace-qualified base type (e.g.
// `: Xna.Framework.Vector2`) is dangling — strip dotted entries from base lists.
function stripQualifiedBases(s: string): string {
  return s.replace(/((?:class|struct|interface|record)\s+\w+(?:<[^>]*>)?)\s*:\s*([^\{;]+?)(\s*[\{;])/g, (_m, head, bases, tail) => {
    const kept = String(bases).split(',').map(b => b.trim()).filter(b => b && !b.includes('.'));
    return kept.length ? `${head} : ${kept.join(', ')}${tail}` : `${head}${tail}`;
  });
}
// Scripts can't declare namespaces — unwrap `namespace X { … }` and `namespace X;` to top level.
function unwrapNamespaces(code: string): string {
  let out = code.replace(/^[ \t]*namespace\s+[\w.]+[ \t]*;[ \t]*$/gm, ''); // file-scoped
  let guard = 0;
  let m: RegExpMatchArray | null;
  while (guard++ < 40 && (m = out.match(/namespace\s+[\w.]+\s*\{/)) && m.index !== undefined) {
    const open = m.index + m[0].length - 1; // position of '{'
    let depth = 0, close = -1;
    for (let i = open; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}' && --depth === 0) { close = i; break; }
    }
    if (close === -1) break;
    out = out.slice(0, m.index) + out.slice(open + 1, close) + out.slice(close + 1);
  }
  return out;
}
// Full normalization of raw AI output into script-legal, flat stub types.
const normalizeStubs = (raw: string) => stripQualifiedBases(stripSealedAbstract(stripUsings(unwrapNamespaces(stripFences(raw))))).trim();
// One regex for user `using` directives (captures the namespace path).
const USER_USING_RE = /^[ \t]*using\s+(?:static\s+)?([\w.]+)\s*;[ \t]*$/gm;
// Blank every using line IN PLACE — replace the line's text with nothing but keep the
// trailing newline, so line numbers stay 1:1 with the editor (the trace maps back).
const blankUsings = (s: string) => s.replace(USER_USING_RE, '');
// The sandbox only references the BCL, so System.* usings stay valid and move to the
// stub prefix; every other (foreign) using is what the top-level stubs replace.
function collectSystemUsings(files: LabFile[]): string[] {
  const seen = new Set<string>(), keep: string[] = [];
  for (const f of files) {
    let u: RegExpExecArray | null; USER_USING_RE.lastIndex = 0;
    while ((u = USER_USING_RE.exec(f.content)) !== null) {
      const line = u[0].trim(); // full directive, preserving `static`
      if (u[1].split('.')[0] === 'System' && !seen.has(line)) { seen.add(line); keep.push(line); }
    }
  }
  return keep;
}
// Assemble the Supercompile inputs so buildBlob owns concatenation + line mapping:
//  - `prefix`  = System usings + top-level stubs (fed to buildBlob's prefix, so its
//                lines are offset out of the per-file mapping).
//  - `blankedFiles` = the user's files with usings blanked in place (line counts intact).
// Running these via runCode({ prefix, filesOverride }) keeps blobLayout populated, so
// the source-line highlight works for Supercompiled runs (unlike the old rawBlob path).
function assembleStubbedSource(files: LabFile[], rawStubs: string): { prefix: string; blankedFiles: LabFile[]; stubs: string } {
  const stubs = normalizeStubs(rawStubs);
  const prefix = [collectSystemUsings(files).join('\n'), stubs].filter(s => s && s.trim()).join('\n\n');
  const blankedFiles = files.map(f => ({ ...f, content: blankUsings(f.content) }));
  return { prefix, blankedFiles, stubs };
}

interface LabViewProps {
  inject?: { code: string; nonce: number } | null;
  active?: boolean;
  files: LabFile[];
  activeFileId: string;
  setFiles: (files: LabFile[] | ((prev: LabFile[]) => LabFile[])) => void;
  setActiveFileId: (id: string) => void;
  note: string;
  setNote: (note: string) => void;
}

export default function LabView({ inject, active = true, files, activeFileId: activeId, setFiles, setActiveFileId: setActiveId, note, setNote }: LabViewProps) {
  const activeFile = files.find(f => f.id === activeId) ?? files[0];
  const setActiveContent = useCallback((content: string) => {
    setFiles(prev => prev.map(f => (f.id === activeId ? { ...f, content } : f)));
  }, [activeId, setFiles]);
  const [blobLayout, setBlobLayout] = useState<BlobLayout | null>(null);
  // Refs mirror the latest files/activeId so runCode + inject read fresh values
  // without re-creating on every keystroke.
  const filesRef = useRef(files); filesRef.current = files;
  const activeIdRef = useRef(activeId); activeIdRef.current = activeId;
  const [activeStep, setActiveStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);
  const [traceData, setTraceData] = useState<any[]>([]);
  const [astData, setAstData] = useState<any | null>(null);
  const [classesData, setClassesData] = useState<any[] | null>(null);
  const [callTreeData, setCallTreeData] = useState<any[] | null>(null);
  const [complexityData, setComplexityData] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(4); // playback steps per second
  const [activeLens, setActiveLens] = useState('flow');
  const [toast, setToast] = useState<string | null>(null);

  // "Run Output" — a live terminal run: the program executes as a real process,
  // its output streams in, and you can type input (Console.ReadLine) as it runs.
  // Separate from the trace lenses (which need a non-interactive recorded run).
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [termText, setTermText] = useState('');
  const [consoleErr, setConsoleErr] = useState<string | null>(null);
  const [isConsoleRunning, setIsConsoleRunning] = useState(false);
  const [inputLine, setInputLine] = useState('');
  const runIdRef = useRef<number | null>(null);

  // Supercompile (AI stubs for unresolvable libraries)
  const [unresolvedNames, setUnresolvedNames] = useState<string[] | null>(null);
  const [isSupercompiling, setIsSupercompiling] = useState(false);
  const [aiStubs, setAiStubs] = useState<string | null>(null);
  const [stubsOpen, setStubsOpen] = useState(false);


  // File-tree handlers. Files carry a relative `path` (e.g. "Models/Node.cs");
  // `name` is kept as its basename for display. Paths are unique within a study.
  const selectFile = useCallback((id: string) => setActiveId(id), [setActiveId]);
  const uniquePath = useCallback((path: string, ignoreId?: string) => {
    const taken = new Set(filesRef.current.filter(f => f.id !== ignoreId).map(f => f.path));
    if (!taken.has(path)) return path;
    const dot = path.lastIndexOf('.');
    const stem = dot > path.lastIndexOf('/') ? path.slice(0, dot) : path;
    const ext = dot > path.lastIndexOf('/') ? path.slice(dot) : '';
    let n = 2;
    while (taken.has(`${stem}${n}${ext}`)) n++;
    return `${stem}${n}${ext}`;
  }, []);
  const addFile = useCallback((rawPath?: string) => {
    const id = newFileId();
    const path = uniquePath((rawPath && rawPath.trim()) || `File${filesRef.current.length + 1}.cs`);
    setFiles(prev => [...prev, { id, name: baseName(path), path, content: '' }]);
    setActiveId(id);
  }, [setFiles, setActiveId, uniquePath]);
  const renameFile = useCallback((id: string, rawPath: string) => {
    const path = uniquePath(rawPath.trim(), id);
    if (!path) return;
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, name: baseName(path), path } : f)));
  }, [setFiles, uniquePath]);
  const closeFile = useCallback((id: string) => {
    if (filesRef.current.length <= 1) return; // keep at least one file
    // setFiles (in useStudies) auto-reassigns the active file if we removed it.
    setFiles(prev => prev.filter(f => f.id !== id));
  }, [setFiles]);
  // Move every file under `fromDir` to `toDir` (folder rename/delete support).
  const renameFolder = useCallback((fromDir: string, toDir: string) => {
    setFiles(prev => prev.map(f => {
      if (f.path !== fromDir && !f.path.startsWith(fromDir + '/')) return f;
      const rest = f.path.slice(fromDir.length);
      const path = (toDir + rest).replace(/^\/+/, '');
      return { ...f, name: baseName(path), path };
    }));
  }, [setFiles]);
  const deleteFolder = useCallback((dir: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.path !== dir && !f.path.startsWith(dir + '/'));
      return next.length ? next : prev; // never delete the last file
    });
  }, [setFiles]);

  const [panels, setPanels] = useState({
    source: { minimized: false, closed: false },
    algorithm: { minimized: false, closed: false },
    runtime: { minimized: false, closed: false },
  });

  const toggleMin = (p: keyof typeof panels) => setPanels(pnl => ({ ...pnl, [p]: { ...pnl[p], minimized: !pnl[p].minimized } }));
  const closePnl = (p: keyof typeof panels) => setPanels(pnl => ({ ...pnl, [p]: { ...pnl[p], closed: true } }));

  const containerRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);

  // Use refs for drag state to avoid re-renders during drag
  const isDragging = useRef(false);
  const dragInfo = useRef<{
    type: 'col' | 'row';
    gutterEl: HTMLElement;
    startPos: number;
    // For col: left element, right element
    // For row: top element, bottom element
    elA: HTMLElement;
    elB: HTMLElement;
    startSizeA: number;
    startSizeB: number;
  } | null>(null);

  const startColDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!leftColRef.current || !rightColRef.current) return;
    isDragging.current = true;
    dragInfo.current = {
      type: 'col',
      gutterEl: e.currentTarget as HTMLElement,
      startPos: e.clientX,
      elA: leftColRef.current,
      elB: rightColRef.current,
      startSizeA: leftColRef.current.offsetWidth,
      startSizeB: rightColRef.current.offsetWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.classList.add('resizing');
    (e.currentTarget as HTMLElement).classList.add('active');
  }, []);

  const startRowDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const gutter = e.currentTarget as HTMLElement;
    const elA = gutter.previousElementSibling as HTMLElement;
    const elB = gutter.nextElementSibling as HTMLElement;
    if (!elA || !elB) return;
    isDragging.current = true;
    dragInfo.current = {
      type: 'row',
      gutterEl: gutter,
      startPos: e.clientY,
      elA,
      elB,
      startSizeA: elA.offsetHeight,
      startSizeB: elB.offsetHeight,
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.body.classList.add('resizing');
    gutter.classList.add('active');
  }, []);

  useEffect(() => {
    let rafId = 0;
    let pending = false;
    let lastX = 0;
    let lastY = 0;

    // One layout write per animation frame, always using the freshest cursor
    // position. rAF naturally coalesces to the display refresh (~60fps); no
    // manual throttle, so the panel tracks the cursor with no perceptible lag.
    const applyDrag = () => {
      pending = false;
      const info = dragInfo.current;
      if (!info) return;
      if (info.type === 'col') {
        const dx = lastX - info.startPos;
        const newA = Math.max(150, info.startSizeA + dx);
        info.elA.style.flex = `0 0 ${newA}px`;
        info.elB.style.flex = '1';
      } else {
        const dy = lastY - info.startPos;
        const newA = Math.max(36, info.startSizeA + dy);
        const newB = Math.max(36, info.startSizeB - dy);
        info.elA.style.flex = `0 0 ${newA}px`;
        info.elB.style.flex = `0 0 ${newB}px`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !dragInfo.current) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!pending) {
        pending = true;
        rafId = requestAnimationFrame(applyDrag);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (dragInfo.current?.gutterEl) {
        dragInfo.current.gutterEl.classList.remove('active');
      }
      dragInfo.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('resizing');
      cancelAnimationFrame(rafId);
      pending = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // Empty deps — never re-registers

  // Does step N (1-based) have something to show for the CURRENT lens? Static
  // lenses (oop/complexity) always do; the step-based ones need heap/array/frame.
  const stepHasContent = (step: number): boolean => {
    const t = traceData[step - 1];
    if (!t) return false;
    switch (activeLens) {
      case 'flow':
      case 'data':
        return (t.heap && Object.keys(t.heap).length > 0) || (t.stack && Object.keys(t.stack).length > 0);
      case 'anim': {
        const arr = t.heap && Object.values(t.heap).find((o: any) => Array.isArray(o?._elements) && o._elements.every((e: any) => typeof e === 'number'));
        if (!arr) return false;
        return (Array.isArray(t.accessed) && t.accessed.length > 0) ||
          Object.keys(t.stack ?? {}).some(k => typeof t.stack[k] === 'number');
      }
      case 'recur':
        return Array.isArray(callTreeData) && callTreeData.some(function active(n: any): boolean {
          return (step >= n.enterStep && (n.exitStep === 0 || step < n.exitStep)) || (n.children ?? []).some(active);
        });
      default:
        return true; // oop, bigo — static, always content
    }
  };
  const lensHasEmptySteps = ['flow', 'data', 'anim', 'recur'].includes(activeLens);

  // Next step (after `from`) with content for the active lens, or null.
  const nextContentStep = (from: number): number | null => {
    for (let s = from + 1; s <= totalSteps; s++) if (stepHasContent(s)) return s;
    return null;
  };
  const jumpToNextContent = () => {
    const next = nextContentStep(activeStep);
    if (next != null) { setActiveStep(next); if (next > activeStep + 1) flashToast(`Skipped to line ${traceData[next - 1]?.line}`); }
  };
  const flashToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(t => (t === msg ? null : t)), 1600); };

  // Auto-advance while playing; skips steps with no content for the active lens.
  useEffect(() => {
    if (!isPlaying) return;
    if (activeStep >= totalSteps) { setIsPlaying(false); return; }
    const id = setTimeout(() => {
      let next = activeStep + 1;
      if (lensHasEmptySteps) { const nc = nextContentStep(activeStep); next = nc ?? totalSteps; if (nc != null && nc > activeStep + 1) flashToast(`Skipped to line ${traceData[nc - 1]?.line}`); }
      setActiveStep(Math.min(totalSteps, next));
    }, 1000 / speed);
    return () => clearTimeout(id);
  }, [isPlaying, activeStep, totalSteps, speed, activeLens]);

  const togglePlay = () => {
    if (!isPlaying && activeStep >= totalSteps) setActiveStep(1); // replay from start
    setIsPlaying(p => !p);
  };

  // Transport keyboard shortcuts: space = play/pause, ←/→ = step. Ignored while
  // typing in the editor or an input.
  useEffect(() => {
    if (!active) return; // don't grab keys while the Study tab is hidden
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const tag = (ae?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || ae?.isContentEditable) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIsPlaying(false); setActiveStep(s => Math.max(1, s - 1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIsPlaying(false); setActiveStep(s => Math.min(totalSteps, s + 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, totalSteps, active]);

  // Turn the engine's `truncated` reason into a human-friendly banner.
  const describeTruncation = (reason: string): string => {
    if (reason === 'timeout') return 'Execution timed out — showing the partial trace up to the cutoff.';
    if (reason === 'step-limit') return 'Step limit reached (50,000 steps) — showing the partial trace.';
    if (reason.startsWith('runtime: ')) return 'Runtime exception: ' + reason.slice('runtime: '.length) + ' — showing steps up to the error.';
    if (reason === 'external-deps') return 'External libraries could not be resolved — structure analysed, execution unavailable.';
    return reason;
  };

  const runCode = async (opts?: { filesOverride?: LabFile[]; prefix?: string; aiStub?: boolean; rawBlob?: string }) => {
    const srcFiles = opts?.filesOverride ?? filesRef.current;
    // rawBlob (Supercompile) is a custom, reordered blob — skip per-file line mapping.
    let src: string, info: BlobLayout | null;
    if (typeof opts?.rawBlob === 'string') { src = opts.rawBlob; info = null; }
    else { const b = buildBlob(srcFiles, opts?.prefix); src = b.blob; info = b.info; }
    setBlobLayout(info);
    setIsRunning(true);
    setErrorMsg(null);
    setWarnMsg(null);
    if (!opts?.aiStub) { setAiStubs(null); setStubsOpen(false); }
    setIsPlaying(false);
    try {
      if (!window.__TAURI_INTERNALS__) {
        console.warn("Tauri IPC not found. Running in browser mode. Using mock trace.");
        setTraceData([
          { step: 1, line: 2, state: { curr: "Node 1" } },
          { step: 2, line: 3, state: { curr: "Node 1", prev: "null" } },
          { step: 3, line: 4, state: { curr: "Node 1", prev: "null", next: "null" } },
          { step: 4, line: 6, state: { curr: "Node 1", prev: "null", next: "null" } }
        ]);
        setTotalSteps(4);
        setActiveStep(1);
        setIsRunning(false);
        return;
      }

      const res = await invoke<string>("execute_csharp", { code: src });
      console.log("RAW RESPONSE FROM RUST:", res);
      const data = JSON.parse(res);
      if (data.error) {
        let msg: string = data.error;
        // Multiple files each with top-level driver statements => duplicate decls.
        if (/CS0111|CS0128|CS0102|CS0263|already (defines|contains)|duplicate/i.test(msg))
          msg += '\n\nTip: only one file may hold top-level driver statements / a Main method — move duplicated declarations into separate classes or a single file.';
        if (opts?.aiStub) msg = 'AI stubs did not fully resolve — falling back to static analysis.\n\n' + msg;
        setErrorMsg(msg);
        setTraceData([]);
        setTotalSteps(1);
      } else if (data.ast) {
        // Accept the result even with zero traces: static lenses (Flowchart, OOP,
        // Complexity) work from code structure alone, without anything executing.
        setAstData(data.ast);
        setClassesData(Array.isArray(data.classes) ? data.classes : null);
        setCallTreeData(Array.isArray(data.callTree) ? data.callTree : null);
        setComplexityData(Array.isArray(data.complexity) ? data.complexity : null);
        const traces = Array.isArray(data.traces) ? data.traces : [];
        setTraceData(traces);
        setTotalSteps(Math.max(traces.length, 1));
        setActiveStep(1);
        const hasUnresolved = Array.isArray(data.unresolved) && data.unresolved.length > 0;
        setUnresolvedNames(hasUnresolved ? data.unresolved : null);
        if (opts?.aiStub && !hasUnresolved && traces.length > 0) {
          setWarnMsg('Traced with AI stubs (approximate) — the missing types were mocked, so behaviour may differ from the real libraries.');
        } else if (hasUnresolved) {
          setWarnMsg(`${opts?.aiStub ? 'AI stubs did not fully resolve. ' : ''}External dependencies not available: ${data.unresolved.join(', ')} — structure analysed (OOP / Complexity / Flowchart), but the code can't be executed here. Static lenses work; step-through lenses need runnable code.`);
        } else if (data.truncated) setWarnMsg(describeTruncation(data.truncated));
        else if (traces.length === 0)
          setWarnMsg('No executable statements ran — Flowchart / OOP / Complexity work from the code structure. Add code that runs (e.g. var c = new Circle(2);) to populate Data Structures, Recursion and Animation.');
      } else if (Array.isArray(data) && data.length > 0) {
        setAstData(null);
        setTraceData(data);
        setTotalSteps(data.length);
        setActiveStep(1);
      }
    } catch (e: any) {
      setErrorMsg(e.toString());
    } finally {
      setIsRunning(false);
    }
  };

  // Launch the program in a live terminal: start the process, then stream its
  // output via events and feed it input as the user types.
  const runConsole = async () => {
    if (isConsoleRunning) return;
    const { blob } = buildBlob(filesRef.current);
    setConsoleOpen(true); setTermText(''); setConsoleErr(null); setInputLine('');
    if (!window.__TAURI_INTERNALS__) { setConsoleErr('Live run needs the desktop app.'); return; }
    setIsConsoleRunning(true);
    try {
      runIdRef.current = await invoke<number>('start_interactive', { code: blob });
    } catch (e: any) {
      setConsoleErr(e.toString()); setIsConsoleRunning(false);
    }
  };

  // Send the current input line to the running program's stdin, echoing it into
  // the terminal (stdin isn't mirrored to stdout, so we show it ourselves).
  const sendInput = () => {
    if (!isConsoleRunning || runIdRef.current == null) return;
    const line = inputLine;
    setInputLine('');
    setTermText(t => t + line + '\n');
    invoke('send_interactive_input', { runId: runIdRef.current, text: line + '\n' }).catch(() => {});
  };

  // Close the terminal, killing the process if it's still running.
  const closeConsole = () => {
    if (runIdRef.current != null) invoke('kill_interactive', { runId: runIdRef.current }).catch(() => {});
    runIdRef.current = null;
    setConsoleOpen(false); setIsConsoleRunning(false); setInputLine('');
  };

  // Stream process output/exit from the backend into the terminal.
  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return;
    let unOut: (() => void) | undefined, unExit: (() => void) | undefined;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ runId: number; text: string }>('interactive-output', e => {
        if (e.payload.runId === runIdRef.current) setTermText(t => t + e.payload.text);
      }).then(u => { unOut = u; });
      listen<{ runId: number; code: number }>('interactive-exit', e => {
        if (e.payload.runId === runIdRef.current) {
          setIsConsoleRunning(false);
          setTermText(t => t + `\n[process exited — code ${e.payload.code}]\n`);
        }
      }).then(u => { unExit = u; });
    });
    return () => { unOut?.(); unExit?.(); };
  }, []);

  // Ask the AI for stub types for the unresolved libraries, assemble a script-legal
  // blob (usings → stubs → user code), and re-run.
  const supercompile = async () => {
    if (isSupercompiling || !unresolvedNames?.length) return;
    if (!(await isSelectedModelFree())) {
      const model = await getSelectedModel();
      const ok = window.confirm(`The selected model "${model}" is not free and may incur a charge for this call.\n\nContinue with Supercompile?`);
      if (!ok) return;
    }
    setIsSupercompiling(true);
    setErrorMsg(null);
    try {
      const { blob } = buildBlob(filesRef.current);
      const system = [
        'You generate minimal C# stub/mock type definitions so the user\'s own code can COMPILE and RUN under Roslyn scripting (a C# "script" via CSharpScript — NOT a normal project/assembly).',
        'You MUST obey these rules or compilation fails:',
        '1. NEVER emit a `namespace` declaration or a `using` directive. Every stub type is TOP-LEVEL.',
        '2. NEVER create a type named after a namespace fragment (e.g. do not make a `Framework` or `Xna` type). Only stub the actual TYPES the code uses (e.g. Vector2, GameTime, SpriteBatch).',
        '3. NEVER use `sealed`, `abstract`, or base-type inheritance (`: SomeBase`). Each stub is a plain, standalone class/struct/enum.',
        '4. Define each type exactly ONCE. No Main method, no top-level statements, no markdown, no comments, no prose.',
        'Include exactly the members the user code touches (constructors, methods, properties, fields), with trivial bodies (empty, no-op, or `return default`). Do not redefine the user\'s own types.',
        'EXAMPLE — for code using `Vector2 v = new Vector2(1,2); v.Length();` and `var b = new SpriteBatch(); b.Draw();`, output exactly:',
        'public struct Vector2 { public float X; public float Y; public Vector2(float x, float y) { X = x; Y = y; } public float Length() => 0f; }',
        'public class SpriteBatch { public void Draw() { } }',
      ].join('\n');
      const baseUser = `The user's script fails to compile because these are unavailable: ${unresolvedNames.join(', ')}.\nProduce top-level stub TYPES for every undefined type the code below references. Do NOT repeat the user's code.\n\nUser code:\n\n${blob}`;

      // Compile a candidate blob WITHOUT committing it to the UI (used to validate
      // an attempt before we trust it).
      const testCompile = async (code: string): Promise<{ ok: boolean; error: string }> => {
        try {
          const data = JSON.parse(await invoke<string>('execute_csharp', { code }));
          if (data.error) return { ok: false, error: String(data.error) };
          if (Array.isArray(data.unresolved) && data.unresolved.length) return { ok: false, error: 'Still unresolved: ' + data.unresolved.join(', ') };
          return { ok: !!data.ast, error: '' };
        } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
      };

      // Up to 3 attempts. Transient API errors (503/overload/rate-limit) are retried
      // inside askAIWithRetry; if the stubs COMPILE-fail, we feed the compiler error
      // back to the model and try again (self-repair). Works for any provider/model.
      const MAX = 3;
      let lastErr = '';
      let winner: { prefix: string; blankedFiles: LabFile[]; stubs: string } | null = null;
      for (let attempt = 1; attempt <= MAX && !winner; attempt++) {
        const user = lastErr
          ? `${baseUser}\n\nYour previous stubs did NOT compile. Fix them. The C# script compiler reported:\n${lastErr}\n\n(Reminder: no namespaces, no usings, no inheritance/sealed, define each type once, top-level only.)`
          : baseUser;
        const raw = await askAIWithRetry(system, user);
        const { prefix, blankedFiles, stubs } = assembleStubbedSource(filesRef.current, raw);
        if (!stubs) { lastErr = 'You produced no stub types.'; continue; }
        // Validate the EXACT blob runCode will re-build + trace (same buildBlob inputs).
        const res = await testCompile(buildBlob(blankedFiles, prefix).blob);
        if (res.ok) { winner = { prefix, blankedFiles, stubs }; break; }
        lastErr = res.error.split('\n').slice(0, 5).join('\n');
      }

      if (winner) {
        setAiStubs(winner.stubs);
        setStubsOpen(false);
        await runCode({ prefix: winner.prefix, filesOverride: winner.blankedFiles, aiStub: true });
      } else {
        setErrorMsg(`Supercompile couldn't produce compilable stubs after ${MAX} tries — showing static analysis only.${lastErr ? `\nLast compiler error: ${lastErr.split('\n')[0]}` : ''}`);
      }
    } catch (e: any) {
      setErrorMsg(`Supercompile failed: ${e.message || e}. Showing static analysis only.`);
    } finally {
      setIsSupercompiling(false);
    }
  };

  // When the skill tree sends an example ("Try in lab"), load it into the active
  // file and run it. The nonce guard prevents re-applying the last example when
  // LabView remounts on a study switch (it's keyed by study id).
  const injectedNonce = useRef<number | null>(inject?.nonce ?? null);
  useEffect(() => {
    if (!inject || injectedNonce.current === inject.nonce) return;
    injectedNonce.current = inject.nonce;
    const next = filesRef.current.map(f => (f.id === activeIdRef.current ? { ...f, content: inject.code } : f));
    setFiles(next);
    runCode({ filesOverride: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inject?.nonce]);

  const activeState = traceData.find(d => d.step === activeStep) || { line: 1, state: {} };
  const activeLine = activeState.line; // global blob line
  // Map the executing blob line back to the owning file; auto-switch the tab to it.
  const mappedLine = mapGlobalLine(activeLine, blobLayout);
  useEffect(() => {
    if (mappedLine && mappedLine.id !== activeId) setActiveId(mappedLine.id);
  }, [mappedLine?.id, activeId]);
  // Local line for the active file's editor (0 = no highlight — line is in another
  // file, or we're in Supercompile's reordered blob where mapping doesn't apply).
  const localActiveLine = blobLayout
    ? (mappedLine && mappedLine.id === activeId ? mappedLine.local : 0)
    : 0;

  return (
    <div className="view active" id="studyView" style={{ display: 'flex' }}>
      <div className="study-hd">
        <div className="sh-dot"></div>
        <div className="sh-info">
          <div className="sh-title">Roslyn Sandbox</div>
          <div className="sh-q">{
            errorMsg ? <span style={{color: 'var(--red)'}}>{errorMsg}</span>
            : warnMsg ? <span style={{color: 'var(--yellow, #e5c07b)'}}><i className="fa-solid fa-triangle-exclamation" style={{marginRight: '6px'}}></i>{warnMsg}</span>
            : "Write C# code below and hit Compile & Run."
          }</div>
        </div>
        <div className="sh-right">
          <button className="pbtn" onClick={() => setNoteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-note-sticky"></i> NOTES
          </button>
          {unresolvedNames && unresolvedNames.length > 0 && (
            <button className="pbtn" onClick={supercompile} disabled={isSupercompiling || isRunning} title={`Ask AI to mock: ${unresolvedNames.join(', ')}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pink)', borderColor: 'var(--pink)' }}>
              {isSupercompiling
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> SUPERCOMPILING…</>
                : <><i className="fa-solid fa-wand-magic-sparkles"></i> SUPERCOMPILE WITH AI</>}
            </button>
          )}
          <button className="pbtn" onClick={runConsole} disabled={isConsoleRunning || isRunning} title="Run the program and show only its console output"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isConsoleRunning
              ? <><i className="fa-solid fa-circle-notch fa-spin"></i> RUNNING…</>
              : <><i className="fa-solid fa-terminal"></i> RUN OUTPUT</>}
          </button>
          <button className="pbtn" onClick={() => runCode()} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', overflow: 'hidden' }}>
            {isRunning
              ? <><i className="fa-solid fa-circle-notch fa-spin"></i> COMPILING & RUNNING…</>
              : <><i className="fa-solid fa-play"></i> COMPILE & RUN</>}
          </button>
        </div>
      </div>
      {aiStubs && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'rgba(198,120,221,0.06)', fontFamily: 'var(--mono)' }}>
          <button onClick={() => setStubsOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--pink)', cursor: 'pointer', padding: '6px 16px', fontSize: '11px', fontFamily: 'var(--mono)' }}>
            <i className={`fa-solid ${stubsOpen ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '9px' }}></i>
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            AI-generated stubs (approximate) — prepended so your logic can run
          </button>
          {stubsOpen && (
            <pre style={{ margin: 0, padding: '10px 16px 14px', maxHeight: '220px', overflow: 'auto', fontSize: '11px', color: 'var(--text2)', whiteSpace: 'pre', borderTop: '1px solid var(--border)' }}>{aiStubs}</pre>
          )}
        </div>
      )}
      {isRunning && (
        <div className="run-progress" style={{ height: '2px', width: '100%', background: 'var(--bg2)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ height: '100%', width: '35%', background: 'var(--accent)', borderRadius: '2px', animation: 'facet-indeterminate 1s ease-in-out infinite' }} />
        </div>
      )}

      <div className="panel-container" ref={containerRef}>
        
        {/* COLUMN 1: Left Stack */}
        <div className="p-col" ref={leftColRef} style={{ flex: 1 }}>
          {/* Row 0: Source */}
          <div style={{ flex: 1, display: panels.source.closed ? 'none' : 'flex', minHeight: 0 }}>
            <SourcePanel
              code={activeFile?.content ?? ''} setCode={setActiveContent} activeStep={localActiveLine}
              files={files} activeId={activeId} fileId={activeId}
              onSelectFile={selectFile} onAddFile={addFile} onRenameFile={renameFile} onCloseFile={closeFile}
              onRenameFolder={renameFolder} onDeleteFolder={deleteFolder}
              isMinimized={panels.source.minimized}
              onMinimize={() => toggleMin('source')}
              onClose={() => closePnl('source')}
            />
          </div>
        </div>
        
        <div className="gutter gutter-x" onMouseDown={startColDrag}></div>
        
        {/* COLUMN 2: Right Stack */}
        <div className="p-col" ref={rightColRef} style={{ flex: 1 }}>
          
          {/* Row 0: Visualizer */}
          <div style={{ flex: panels.algorithm.minimized ? '0 0 36px' : 1.8, display: panels.algorithm.closed ? 'none' : 'flex', minHeight: 0, overflow: 'hidden', transition: 'flex 0.2s ease', position: 'relative' }}>
            <VisualizerShell
              activeStep={activeStep}
              traceData={traceData}
              astData={astData}
              classesData={classesData}
              callTreeData={callTreeData}
              complexityData={complexityData}
              activeLens={activeLens}
              setActiveLens={setActiveLens}
              isMinimized={panels.algorithm.minimized}
              onMinimize={() => toggleMin('algorithm')}
              onClose={() => closePnl('algorithm')}
            />
            {toast && (
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(20,22,28,0.95)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', boxShadow: '0 6px 20px rgba(0,0,0,0.4)', animation: 'fi 0.2s ease' }}>
                <i className="fa-solid fa-forward" style={{ marginRight: 6, color: 'var(--accent)' }} />{toast}
              </div>
            )}
          </div>
          {!panels.algorithm.closed && !panels.runtime.closed && (
            <div className="gutter gutter-y" onMouseDown={startRowDrag}></div>
          )}
          
          {/* Row 2: Runtime */}
          <div style={{ flex: panels.runtime.minimized ? '0 0 36px' : 1, display: panels.runtime.closed ? 'none' : 'flex', minHeight: 0, overflow: 'hidden', transition: 'flex 0.2s ease', marginTop: '16px' }}>
            <RuntimePanel 
              activeStep={activeStep} 
              stack={traceData[activeStep - 1]?.stack || traceData[activeStep - 1]?.state || {}}
              output={traceData[activeStep - 1]?.output}
              isMinimized={panels.runtime.minimized}
              onMinimize={() => toggleMin('runtime')}
              onClose={() => closePnl('runtime')}
            />
          </div>

          <div className="transport">
            <div className="tc">
              <button className="tcb" title="Previous Step" onClick={() => { setIsPlaying(false); setActiveStep(s => Math.max(1, s - 1)); }}><i className="fa-solid fa-backward-step"></i></button>
              <button className="tcb" title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} style={isPlaying ? { color: 'var(--accent)' } : undefined}><i className={isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'}></i></button>
              <button className="tcb" title="Next Step" onClick={() => { setIsPlaying(false); setActiveStep(s => Math.min(totalSteps, s + 1)); }}><i className="fa-solid fa-forward-step"></i></button>
              {lensHasEmptySteps && (
                <button className="tcb" title="Skip to next step with content for this lens" onClick={() => { setIsPlaying(false); jumpToNextContent(); }} disabled={nextContentStep(activeStep) == null}><i className="fa-solid fa-forward-fast"></i></button>
              )}
            </div>
            <input
              type="range"
              min="1"
              max={totalSteps}
              value={activeStep}
              onChange={(e) => { setIsPlaying(false); setActiveStep(Number(e.target.value)); }}
            />
            <div className="tinfo">
              <span className="tstep">STEP {activeStep} / {totalSteps}</span>
              <span className="tnarr">Tracing line {activeLine} execution.</span>
            </div>
            <div className="tspeed" title="Playback speed" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '14px', flexShrink: 0 }}>
              <i className="fa-solid fa-gauge-high" style={{ color: 'var(--text3)', fontSize: '11px' }}></i>
              <input type="range" min="1" max="20" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: '70px' }} />
              <span style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'var(--mono)', minWidth: '34px' }}>{speed}/s</span>
            </div>
          </div>
        </div>

      </div>

      <NotePanel isOpen={noteOpen} onClose={() => setNoteOpen(false)} note={note} setNote={setNote} />

      <ConsolePanel
        isOpen={consoleOpen}
        onClose={closeConsole}
        text={termText}
        running={isConsoleRunning}
        error={consoleErr}
        input={inputLine}
        setInput={setInputLine}
        onSend={sendInput}
        onRerun={runConsole}
      />
    </div>
  );
}
