// Lab source files: the paste-based "multi-file" editor state.
// Persisted via the Tauri store when available, else localStorage (browser/dev),
// mirroring utils/progress.ts so open files survive across launches.

// `path` is the file's location in the Study's on-disk tree (relative, forward-
// slashed, e.g. "Models/Node.cs"); `name` is its basename, kept in sync for display.
export interface LabFile { id: string; name: string; path: string; content: string; }
export interface LabState { files: LabFile[]; activeId: string; }

// Basename of a slash-separated path (the display name of a file/folder).
export const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);

const KEY = 'lab_files';

const STARTER = `int a = 5;\nint b = 10;\nint sum = a + b;`;

export function defaultLabState(): LabState {
  const id = 'file-1';
  return { files: [{ id, name: 'Program.cs', path: 'Program.cs', content: STARTER }], activeId: id };
}

let tauriStore: any | null = null;
async function getStore() {
  if (!(window as any).__TAURI_INTERNALS__) return null;
  if (!tauriStore) {
    const { load } = await import('@tauri-apps/plugin-store');
    tauriStore = await load('lab.json');
  }
  return tauriStore;
}

function sanitize(raw: any): LabState | null {
  if (!raw || !Array.isArray(raw.files) || raw.files.length === 0) return null;
  const files: LabFile[] = raw.files
    .filter((f: any) => f && typeof f.id === 'string' && typeof f.content === 'string')
    .map((f: any) => {
      const path = typeof f.path === 'string' && f.path ? f.path : (typeof f.name === 'string' ? f.name : 'Untitled.cs');
      return { id: f.id, name: baseName(path), path, content: f.content };
    });
  if (files.length === 0) return null;
  const activeId = files.some((f) => f.id === raw.activeId) ? raw.activeId : files[0].id;
  return { files, activeId };
}

export async function loadFiles(): Promise<LabState> {
  try {
    const store = await getStore();
    if (store) {
      const saved = await store.get(KEY);
      return sanitize(saved) ?? defaultLabState();
    }
  } catch { /* fall through to localStorage */ }
  try {
    const raw = localStorage.getItem(KEY);
    return (raw && sanitize(JSON.parse(raw))) || defaultLabState();
  } catch {
    return defaultLabState();
  }
}

export async function saveFiles(state: LabState): Promise<void> {
  try {
    const store = await getStore();
    if (store) {
      await store.set(KEY, state);
      await store.save();
      return;
    }
  } catch { /* fall through */ }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* best effort */ }
}
