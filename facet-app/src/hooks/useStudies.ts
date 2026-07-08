import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadStudies, saveStudies, defaultStudiesState, newStudy, newChat, MAX_CHATS,
  type StudiesState, type Study, type LabFile, type ChatMessage,
} from '../utils/studies';

// Owns the whole studies workspace (files + chats + notes per study) and its
// persistence. Lives once in App and is fed down to LabView / SocraticDrawer / Notes.
export function useStudies() {
  const [state, setState] = useState<StudiesState>(() => defaultStudiesState());
  const loaded = useRef(false);

  useEffect(() => { loadStudies().then(s => { setState(s); loaded.current = true; }); }, []);
  useEffect(() => { if (loaded.current) saveStudies(state); }, [state]);

  const activeStudy = state.studies.find(s => s.id === state.activeStudyId) ?? state.studies[0];

  const patchStudy = useCallback((id: string, patch: Partial<Study> | ((s: Study) => Partial<Study>)) => {
    setState(st => ({ ...st, studies: st.studies.map(s => (s.id === id ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s)) }));
  }, []);

  // study CRUD
  const setActiveStudyId = useCallback((id: string) => setState(st => ({ ...st, activeStudyId: id })), []);
  const addStudy = useCallback(() => setState(st => { const s = newStudy(`Study ${st.studies.length + 1}`); return { studies: [...st.studies, s], activeStudyId: s.id }; }), []);
  const renameStudy = useCallback((id: string, name: string) => patchStudy(id, { name }), [patchStudy]);
  const deleteStudy = useCallback((id: string) => setState(st => {
    if (st.studies.length <= 1) return st;
    const studies = st.studies.filter(s => s.id !== id);
    return { studies, activeStudyId: st.activeStudyId === id ? studies[0].id : st.activeStudyId };
  }), []);

  // active-study mutators — bound to the active study id so callers don't pass it.
  const patchActive = useCallback((patch: Partial<Study> | ((s: Study) => Partial<Study>)) => {
    setState(st => ({ ...st, studies: st.studies.map(s => (s.id === st.activeStudyId ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s)) }));
  }, []);

  // files — accepts an array or an updater; auto-reassigns activeFileId if the
  // current active file was removed (so LabView's closeFile stays simple).
  const setFiles = useCallback((files: LabFile[] | ((prev: LabFile[]) => LabFile[])) => patchActive(s => {
    const next = typeof files === 'function' ? files(s.files) : files;
    return { files: next, activeFileId: next.some(f => f.id === s.activeFileId) ? s.activeFileId : (next[0]?.id ?? s.activeFileId) };
  }), [patchActive]);
  const setActiveFileId = useCallback((fid: string) => patchActive({ activeFileId: fid }), [patchActive]);
  // note
  const setNote = useCallback((note: string) => patchActive({ note }), [patchActive]);
  // chats
  const setChatMessages = useCallback((chatId: string, messages: ChatMessage[]) => patchActive(s => ({ chats: s.chats.map(c => (c.id === chatId ? { ...c, messages } : c)) })), [patchActive]);
  const setActiveChatId = useCallback((chatId: string) => patchActive({ activeChatId: chatId }), [patchActive]);
  const addChat = useCallback(() => patchActive(s => {
    if (s.chats.length >= MAX_CHATS) return {};
    const c = newChat(`Chat ${s.chats.length + 1}`);
    return { chats: [...s.chats, c], activeChatId: c.id };
  }), [patchActive]);
  const renameChat = useCallback((chatId: string, name: string) => patchActive(s => ({ chats: s.chats.map(c => (c.id === chatId ? { ...c, name } : c)) })), [patchActive]);
  const deleteChat = useCallback((chatId: string) => patchActive(s => {
    if (s.chats.length <= 1) return {};
    const chats = s.chats.filter(c => c.id !== chatId);
    return { chats, activeChatId: s.activeChatId === chatId ? chats[0].id : s.activeChatId };
  }), [patchActive]);

  return {
    studies: state.studies, activeStudy, activeStudyId: state.activeStudyId,
    setActiveStudyId, addStudy, renameStudy, deleteStudy,
    setFiles, setActiveFileId, setNote,
    setChatMessages, setActiveChatId, addChat, renameChat, deleteChat,
  };
}
export type StudiesApi = ReturnType<typeof useStudies>;
