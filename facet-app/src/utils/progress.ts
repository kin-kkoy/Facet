// Curriculum progress: which node ids the user has completed.
// Persisted via the Tauri store when available, else localStorage (browser/dev),
// so the skill tree remembers ticked nodes across launches.

const KEY = 'curriculum_completed';

let tauriStore: any | null = null;
async function getStore() {
  if (!(window as any).__TAURI_INTERNALS__) return null;
  if (!tauriStore) {
    const { load } = await import('@tauri-apps/plugin-store');
    tauriStore = await load('progress.json');
  }
  return tauriStore;
}

export async function loadCompleted(): Promise<Set<string>> {
  try {
    const store = await getStore();
    if (store) {
      const saved = await store.get(KEY);
      return new Set(Array.isArray(saved) ? (saved as string[]) : []);
    }
  } catch { /* fall through to localStorage */ }
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export async function saveCompleted(completed: Set<string>): Promise<void> {
  const arr = [...completed];
  try {
    const store = await getStore();
    if (store) {
      await store.set(KEY, arr);
      await store.save();
      return;
    }
  } catch { /* fall through */ }
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch { /* best effort */ }
}
