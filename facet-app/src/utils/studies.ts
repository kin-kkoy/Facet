// A "Study" is a self-contained workspace: its own code files, AI chats, and notes.
// The active study drives the Lab (files), the Socratic Tutor (chats) and the Notes
// panel. Persisted via the Tauri store when available, else localStorage — mirroring
// utils/progress.ts. On first run we migrate any existing single-buffer lab files
// (utils/files.ts) into the first study so nothing is lost.

import { loadFiles, type LabFile } from './files';
export type { LabFile };

export interface ChatMessage { role: 'user' | 'assistant'; text: string; }
export interface Chat { id: string; name: string; messages: ChatMessage[]; }
export interface Study {
  id: string;
  name: string;
  files: LabFile[];
  activeFileId: string;
  chats: Chat[];
  activeChatId: string;
  note: string;
}
export interface StudiesState { studies: Study[]; activeStudyId: string; }

export const MAX_CHATS = 3;
const KEY = 'studies';
const STARTER = `int a = 5;\nint b = 10;\nint sum = a + b;`;
const GREETING = 'Hello! I am your Socratic Tutor. I will not give you the direct answer, but rather guide you to discover it yourself. What are you working on?';

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function newChat(name = 'Chat 1'): Chat {
  return { id: uid('chat'), name, messages: [{ role: 'assistant', text: GREETING }] };
}
export function newStudy(name: string, files?: LabFile[], activeFileId?: string): Study {
  const seed = files && files.length ? files : [{ id: uid('file'), name: 'Program.cs', content: STARTER }];
  const chat = newChat();
  return {
    id: uid('study'), name,
    files: seed,
    activeFileId: activeFileId && seed.some(f => f.id === activeFileId) ? activeFileId : seed[0].id,
    chats: [chat], activeChatId: chat.id, note: '',
  };
}
export function defaultStudiesState(): StudiesState {
  const s = newStudy('My first study');
  return { studies: [s], activeStudyId: s.id };
}

// ── persistence ──────────────────────────────────────────────────────────
let tauriStore: any | null = null;
async function getStore() {
  if (!(window as any).__TAURI_INTERNALS__) return null;
  if (!tauriStore) {
    const { load } = await import('@tauri-apps/plugin-store');
    tauriStore = await load('studies.json');
  }
  return tauriStore;
}

function sanitizeChat(raw: any): Chat | null {
  if (!raw || typeof raw.id !== 'string') return null;
  const messages = Array.isArray(raw.messages)
    ? raw.messages.filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.text === 'string')
    : [];
  return { id: raw.id, name: typeof raw.name === 'string' ? raw.name : 'Chat', messages: messages.length ? messages : [{ role: 'assistant', text: GREETING }] };
}
function sanitizeStudy(raw: any): Study | null {
  if (!raw || typeof raw.id !== 'string') return null;
  const files: LabFile[] = Array.isArray(raw.files)
    ? raw.files.filter((f: any) => f && typeof f.id === 'string' && typeof f.content === 'string')
        .map((f: any) => ({ id: f.id, name: typeof f.name === 'string' ? f.name : 'Untitled.cs', content: f.content }))
    : [];
  if (!files.length) return null;
  let chats: Chat[] = Array.isArray(raw.chats) ? raw.chats.map(sanitizeChat).filter(Boolean) as Chat[] : [];
  if (!chats.length) chats = [newChat()];
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : 'Study',
    files,
    activeFileId: files.some(f => f.id === raw.activeFileId) ? raw.activeFileId : files[0].id,
    chats,
    activeChatId: chats.some(c => c.id === raw.activeChatId) ? raw.activeChatId : chats[0].id,
    note: typeof raw.note === 'string' ? raw.note : '',
  };
}
function sanitize(raw: any): StudiesState | null {
  if (!raw || !Array.isArray(raw.studies)) return null;
  const studies = raw.studies.map(sanitizeStudy).filter(Boolean) as Study[];
  if (!studies.length) return null;
  const activeStudyId = studies.some(s => s.id === raw.activeStudyId) ? raw.activeStudyId : studies[0].id;
  return { studies, activeStudyId };
}

export async function loadStudies(): Promise<StudiesState> {
  try {
    const store = await getStore();
    if (store) {
      const saved = sanitize(await store.get(KEY));
      if (saved) return saved;
    } else {
      const raw = localStorage.getItem(KEY);
      const saved = raw && sanitize(JSON.parse(raw));
      if (saved) return saved;
    }
  } catch { /* fall through to migration/default */ }
  // First run: migrate any existing single-buffer lab files into the first study.
  try {
    const lab = await loadFiles();
    const s = newStudy('My first study', lab.files, lab.activeId);
    return { studies: [s], activeStudyId: s.id };
  } catch {
    return defaultStudiesState();
  }
}

export async function saveStudies(state: StudiesState): Promise<void> {
  try {
    const store = await getStore();
    if (store) { await store.set(KEY, state); await store.save(); return; }
  } catch { /* fall through */ }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* best effort */ }
}
