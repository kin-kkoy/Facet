import { useState, useEffect } from 'react';
import { askAIChat, getAIMode, setAIMode, systemForMode, type AIMode } from '../../utils/ai';
import { MAX_CHATS, type Chat, type ChatMessage } from '../../utils/studies';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studyName: string;
  chats: Chat[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  setChatMessages: (chatId: string, messages: ChatMessage[]) => void;
  addChat: () => void;
  renameChat: (id: string, name: string) => void;
  deleteChat: (id: string) => void;
  // When reading a book (Map book / Atlas), the current page is injected so the AI can
  // answer "what does this mean?" / "explain differently" grounded in what's on screen.
  readingContext?: string;
  contextLabel?: string;
}

export default function SocraticDrawer({ isOpen, onClose, studyName, chats, activeChatId, setActiveChatId, setChatMessages, addChat, renameChat, deleteChat, readingContext, contextLabel }: Props) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [mode, setMode] = useState<AIMode>('socratic');

  // Load the saved teaching mode when the drawer first opens.
  useEffect(() => { if (isOpen) getAIMode().then(setMode); }, [isOpen]);

  const changeMode = (m: AIMode) => { setMode(m); setAIMode(m); };

  const chat = chats.find(c => c.id === activeChatId) ?? chats[0];

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chat) return;
    const base: ChatMessage[] = [...chat.messages, { role: 'user', text: input }];
    setChatMessages(chat.id, base);
    setInput('');
    setIsLoading(true);
    try {
      // Start the API history on the first user turn (Gemini requires that), and
      // cap length so a long chat stays affordable.
      const firstUser = base.findIndex(m => m.role === 'user');
      const convo = base.slice(firstUser < 0 ? 0 : firstUser).slice(-40);
      // Grounded in the book page when reading; otherwise scoped to the study.
      const system = readingContext ? `${systemForMode(mode)}\n\n${readingContext}` : systemForMode(mode, studyName);
      const reply = await askAIChat(system, convo);
      setChatMessages(chat.id, [...base, { role: 'assistant', text: reply }]);
    } catch (e: any) {
      setChatMessages(chat.id, [...base, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const commitRename = (id: string) => { const n = renameDraft.trim(); if (n) renameChat(id, n); setRenamingId(null); };

  return (
    <div style={{
      position: 'fixed', top: 0, right: isOpen ? 0 : '-400px', width: '400px', height: '100dvh',
      background: 'var(--bg1)', borderLeft: '1px solid var(--border)',
      transition: 'right 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)', zIndex: 500,
      display: 'flex', flexDirection: 'column', boxShadow: isOpen ? '-4px 0 24px rgba(0,0,0,0.5)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 10px', borderBottom: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ color: 'var(--pink)', fontSize: '14px' }}><i className="fa-solid fa-command"></i></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text)' }}>{mode === 'tutor' ? 'AI Tutor' : 'Socratic Tutor'}</div>
            <div style={{ fontSize: '10px', color: contextLabel ? 'var(--book-accent, #7ee787)' : 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={contextLabel ?? studyName}>{contextLabel ? `📖 ${contextLabel}` : studyName}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}><i className="fa-solid fa-xmark"></i></button>
      </div>

      {/* Teaching-mode toggle: Socratic (asks questions) vs Tutor (gives answers + reasoning) */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {([['socratic', 'Socratic', 'Guides with questions'], ['tutor', 'Tutor', 'Answers + explains why']] as const).map(([m, lbl, hint]) => (
          <button key={m} onClick={() => changeMode(m)} title={hint} style={{
            flex: 1, fontSize: 11, fontFamily: 'var(--mono)', padding: '6px 8px', borderRadius: 3, cursor: 'pointer', lineHeight: 1.25,
            background: mode === m ? 'color-mix(in srgb, var(--pink) 18%, transparent)' : 'var(--bg2)',
            color: mode === m ? 'var(--text)' : 'var(--text3)',
            border: `1px solid ${mode === m ? 'color-mix(in srgb, var(--pink) 45%, transparent)' : 'var(--border)'}`, fontWeight: mode === m ? 700 : 400,
          }}>
            {lbl}
            <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.75, marginTop: 1 }}>{hint}</div>
          </button>
        ))}
      </div>

      {/* Chat tabs (max 3 per study) */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
        {chats.map(c => {
          const isActive = c.id === activeChatId;
          return (
            <div key={c.id}
              onClick={() => { if (renamingId !== c.id) setActiveChatId(c.id); }}
              onDoubleClick={() => { setRenamingId(c.id); setRenameDraft(c.name); }}
              title={renamingId === c.id ? '' : 'Double-click to rename'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap',
                background: isActive ? 'color-mix(in srgb, var(--pink) 18%, transparent)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text3)', border: `1px solid ${isActive ? 'color-mix(in srgb, var(--pink) 40%, transparent)' : 'transparent'}` }}>
              {renamingId === c.id ? (
                <input autoFocus value={renameDraft} onClick={e => e.stopPropagation()} onChange={e => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(c.id)} onKeyDown={e => { if (e.key === 'Enter') commitRename(c.id); else if (e.key === 'Escape') setRenamingId(null); }}
                  style={{ width: Math.max(50, renameDraft.length * 7), background: '#111', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 2, fontFamily: 'var(--mono)', fontSize: 11, padding: '1px 4px' }} />
              ) : (
                <>
                  <span>{c.name}</span>
                  {chats.length > 1 && (
                    <span onClick={e => { e.stopPropagation(); deleteChat(c.id); }} title="Delete chat" style={{ opacity: 0.5, fontSize: 10 }}><i className="fa-solid fa-xmark" /></span>
                  )}
                </>
              )}
            </div>
          );
        })}
        {chats.length < MAX_CHATS && (
          <button onClick={addChat} title="New chat" style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0 8px', fontSize: 12 }}><i className="fa-solid fa-plus" /></button>
        )}
      </div>

      {/* Chat History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(chat?.messages ?? []).map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%',
            background: m.role === 'user' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg2)',
            border: `1px solid ${m.role === 'user' ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border)'}`,
            padding: '12px 16px', borderRadius: '4px', color: m.role === 'user' ? 'var(--accent)' : 'var(--text)',
            fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {m.text}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text3)', fontSize: '11px', fontStyle: 'italic' }}>Thinking...</div>
        )}
      </div>

      {/* Input Box */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={isLoading}
            placeholder={isLoading ? 'Thinking...' : 'Ask a question...'}
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '2px', fontFamily: 'var(--mono)', fontSize: '12px', opacity: isLoading ? 0.5 : 1 }} />
          <button onClick={handleSend} disabled={isLoading} style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '0 16px', borderRadius: '2px', cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--mono)', fontWeight: 'bold', opacity: isLoading ? 0.5 : 1 }}>SEND</button>
        </div>
      </div>
    </div>
  );
}
