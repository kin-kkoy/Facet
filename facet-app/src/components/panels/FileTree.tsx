import { useMemo, useState } from 'react';

// A real, nested file tree for the active Study. Folders are derived from each
// file's slash-separated `path`; empty folders created in-session are tracked
// locally until a file is added to them. Compilation is unaffected — LabView still
// concatenates the files in array order regardless of the tree shown here.

export interface TreeFile { id: string; path: string; }

interface Props {
  files: TreeFile[];
  activeId?: string;
  onSelect: (id: string) => void;
  onCreateFile: (path: string) => void;
  onRenameFile: (id: string, path: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFolder: (fromDir: string, toDir: string) => void;
  onDeleteFolder: (dir: string) => void;
  onCollapse?: () => void;
  canDelete: boolean;
}

interface Node { name: string; path: string; dir: boolean; id?: string; children: Node[]; }

function buildTree(files: TreeFile[], folders: string[]): Node {
  const root: Node = { name: '', path: '', dir: true, children: [] };
  const ensureDir = (parts: string[]): Node => {
    let cur = root, acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let next = cur.children.find(c => c.dir && c.name === part);
      if (!next) { next = { name: part, path: acc, dir: true, children: [] }; cur.children.push(next); }
      cur = next;
    }
    return cur;
  };
  for (const f of files) {
    const parts = f.path.split('/');
    const fname = parts.pop() || f.path;
    ensureDir(parts).children.push({ name: fname, path: f.path, dir: false, id: f.id, children: [] });
  }
  for (const folder of folders) if (folder) ensureDir(folder.split('/'));
  const sort = (n: Node) => {
    n.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

const parentDir = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, background: '#111', color: 'var(--text)', border: '1px solid var(--accent)',
  borderRadius: 2, fontFamily: 'var(--mono)', fontSize: 11, padding: '1px 4px',
};
const actBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0 3px', fontSize: 10,
};

export default function FileTree({
  files, activeId, onSelect, onCreateFile, onRenameFile, onDeleteFile, onRenameFolder, onDeleteFolder, onCollapse, canDelete,
}: Props) {
  const [sessionFolders, setSessionFolders] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<{ dir: string; kind: 'file' | 'folder' } | null>(null);
  const [renaming, setRenaming] = useState<{ kind: 'file'; id: string } | { kind: 'folder'; path: string } | null>(null);
  const [draft, setDraft] = useState('');
  // Drag-and-drop move: `drag` is what's being dragged; `dropDir` is the folder
  // (or '' for the root) currently hovered as the destination.
  const [drag, setDrag] = useState<{ kind: 'file' | 'folder'; path: string; id?: string } | null>(null);
  const [dropDir, setDropDir] = useState<string | null>(null);

  // Prune session folders that now contain real files (they exist via paths).
  const existingDirs = useMemo(() => {
    const s = new Set<string>();
    for (const f of files) { let d = parentDir(f.path); while (d) { s.add(d); d = parentDir(d); } }
    return s;
  }, [files]);
  const folders = useMemo(() => sessionFolders.filter(f => !existingDirs.has(f)), [sessionFolders, existingDirs]);
  const tree = useMemo(() => buildTree(files, folders), [files, folders]);

  const toggle = (path: string) => setCollapsed(prev => {
    const next = new Set(prev); next.has(path) ? next.delete(path) : next.add(path); return next;
  });
  const startCreate = (dir: string, kind: 'file' | 'folder') => {
    if (dir) setCollapsed(prev => { const n = new Set(prev); n.delete(dir); return n; });
    setRenaming(null); setDraft(''); setCreating({ dir, kind });
  };
  const commitCreate = () => {
    const name = draft.trim();
    if (!name || !creating) { setCreating(null); return; }
    const full = creating.dir ? `${creating.dir}/${name}` : name;
    if (creating.kind === 'file') onCreateFile(full);
    else setSessionFolders(prev => (prev.includes(full) ? prev : [...prev, full]));
    setCreating(null); setDraft('');
  };
  const commitRename = () => {
    const name = draft.trim();
    if (!name || !renaming) { setRenaming(null); return; }
    if (renaming.kind === 'file') {
      const f = files.find(x => x.id === renaming.id);
      if (f) { const d = parentDir(f.path); onRenameFile(renaming.id, d ? `${d}/${name}` : name); }
    } else {
      const d = parentDir(renaming.path), to = d ? `${d}/${name}` : name;
      onRenameFolder(renaming.path, to);
      setSessionFolders(prev => prev.map(p => (p === renaming.path || p.startsWith(renaming.path + '/') ? to + p.slice(renaming.path.length) : p)));
    }
    setRenaming(null); setDraft('');
  };
  const deleteFolder = (dir: string) => {
    onDeleteFolder(dir);
    setSessionFolders(prev => prev.filter(p => p !== dir && !p.startsWith(dir + '/')));
  };

  // Move the dragged file/folder into `destDir` ('' = root).
  const move = (destDir: string) => {
    if (!drag) return;
    const name = drag.path.includes('/') ? drag.path.slice(drag.path.lastIndexOf('/') + 1) : drag.path;
    if (parentDir(drag.path) === destDir) return; // already there
    if (drag.kind === 'file') {
      onRenameFile(drag.id!, destDir ? `${destDir}/${name}` : name);
    } else {
      // Can't drop a folder into itself or one of its own descendants.
      if (destDir === drag.path || destDir.startsWith(drag.path + '/')) return;
      const to = destDir ? `${destDir}/${name}` : name;
      onRenameFolder(drag.path, to);
      setSessionFolders(prev => prev.map(p => (p === drag.path || p.startsWith(drag.path + '/') ? to + p.slice(drag.path.length) : p)));
    }
  };
  const endDrag = () => { setDrag(null); setDropDir(null); };

  const editRow = (depth: number, onCommit: () => void, cancel: () => void, placeholder: string) => (
    <div style={{ display: 'flex', padding: '2px 6px', paddingLeft: 8 + depth * 12 }}>
      <input autoFocus value={draft} placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(); else if (e.key === 'Escape') cancel(); }}
        style={inputStyle} />
    </div>
  );

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    if (node.dir) {
      const isOpen = !collapsed.has(node.path);
      return (
        <div key={'d:' + node.path}>
          {renaming?.kind === 'folder' && renaming.path === node.path
            ? editRow(depth, commitRename, () => setRenaming(null), 'folder')
            : (
              <div className="ft-row" onClick={() => toggle(node.path)}
                draggable
                onDragStart={e => { e.stopPropagation(); setDrag({ kind: 'folder', path: node.path }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', node.path); }}
                onDragEnd={endDrag}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (drag) setDropDir(node.path); }}
                onDragLeave={e => { e.stopPropagation(); setDropDir(d => (d === node.path ? null : d)); }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); move(node.path); endDrag(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px', paddingLeft: 8 + depth * 12, cursor: 'pointer', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, outline: dropDir === node.path ? '1px solid var(--accent)' : 'none', outlineOffset: -1, background: dropDir === node.path ? 'rgba(0,255,102,0.10)' : undefined }}>
                <i className={`fa-solid fa-chevron-${isOpen ? 'down' : 'right'}`} style={{ fontSize: 8, width: 8, opacity: 0.6 }} />
                <i className="fa-solid fa-folder" style={{ fontSize: 9, color: 'var(--blue)', opacity: 0.8 }} />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
                <span className="ft-acts" style={{ display: 'flex' }}>
                  <button style={actBtn} title="New file" onClick={e => { e.stopPropagation(); startCreate(node.path, 'file'); }}><i className="fa-solid fa-file-circle-plus" /></button>
                  <button style={actBtn} title="New folder" onClick={e => { e.stopPropagation(); startCreate(node.path, 'folder'); }}><i className="fa-solid fa-folder-plus" /></button>
                  <button style={actBtn} title="Rename folder" onClick={e => { e.stopPropagation(); setCreating(null); setDraft(node.name); setRenaming({ kind: 'folder', path: node.path }); }}><i className="fa-solid fa-pen" /></button>
                  <button style={actBtn} title="Delete folder" onClick={e => { e.stopPropagation(); deleteFolder(node.path); }}><i className="fa-solid fa-trash" /></button>
                </span>
              </div>
            )}
          {isOpen && (
            <>
              {node.children.map(c => renderNode(c, depth + 1))}
              {creating && creating.dir === node.path && editRow(depth + 1, commitCreate, () => setCreating(null), creating.kind)}
            </>
          )}
        </div>
      );
    }
    if (renaming?.kind === 'file' && renaming.id === node.id)
      return <div key={'f:' + node.id}>{editRow(depth, commitRename, () => setRenaming(null), 'name.cs')}</div>;
    const active = node.id === activeId;
    return (
      <div key={'f:' + node.id} className="ft-row" onClick={() => node.id && onSelect(node.id)}
        draggable
        onDragStart={e => { e.stopPropagation(); setDrag({ kind: 'file', path: node.path, id: node.id }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', node.path); }}
        onDragEnd={endDrag}
        onDoubleClick={() => { setCreating(null); setDraft(node.name); setRenaming({ kind: 'file', id: node.id! }); }}
        title="Double-click to rename · drag to move"
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px', paddingLeft: 8 + depth * 12, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, color: active ? 'var(--text)' : 'var(--text3)', background: active ? '#000' : 'transparent', borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent', opacity: drag?.path === node.path ? 0.4 : 1 }}>
        <i className="fa-solid fa-file-code" style={{ fontSize: 9, opacity: 0.6, marginLeft: 13 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
        <span className="ft-acts" style={{ display: 'flex' }}>
          <button style={actBtn} title="Rename" onClick={e => { e.stopPropagation(); setCreating(null); setDraft(node.name); setRenaming({ kind: 'file', id: node.id! }); }}><i className="fa-solid fa-pen" /></button>
          {canDelete && <button style={actBtn} title="Delete" onClick={e => { e.stopPropagation(); onDeleteFile(node.id!); }}><i className="fa-solid fa-trash" /></button>}
        </span>
      </div>
    );
  };

  return (
    <div style={{ background: '#0a0a0c', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div title={drag ? 'Drop here to move to the top level' : undefined}
        onDragOver={e => { if (drag) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropDir(''); } }}
        onDrop={e => { e.preventDefault(); move(''); endDrag(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 0.5, borderBottom: '1px solid var(--border)', flexShrink: 0, background: dropDir === '' ? 'rgba(0,255,102,0.10)' : undefined }}>
        <span style={{ flex: 1 }}>FILES</span>
        <button style={actBtn} title="New file" onClick={() => startCreate('', 'file')}><i className="fa-solid fa-file-circle-plus" /></button>
        <button style={actBtn} title="New folder" onClick={() => startCreate('', 'folder')}><i className="fa-solid fa-folder-plus" /></button>
        {onCollapse && <button style={actBtn} title="Collapse sidebar" onClick={onCollapse}><i className="fa-solid fa-angles-left" /></button>}
      </div>
      <div
        onDragOver={e => { if (drag && e.target === e.currentTarget) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropDir(''); } }}
        onDrop={e => { if (e.target === e.currentTarget) { e.preventDefault(); move(''); endDrag(); } }}
        style={{ flex: 1, overflowY: 'auto', paddingBottom: 4, outline: dropDir === '' ? '1px dashed var(--accent)' : 'none', outlineOffset: -2 }}>
        {tree.children.map(c => renderNode(c, 0))}
        {creating && creating.dir === '' && editRow(0, commitCreate, () => setCreating(null), creating.kind)}
      </div>
      <style>{`.ft-row .ft-acts{opacity:0;transition:opacity .12s} .ft-row:hover .ft-acts{opacity:1} .ft-row:hover{background:#141418}`}</style>
    </div>
  );
}
