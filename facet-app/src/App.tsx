import { useState, useRef } from 'react';
import './index.css';
import LabView from './components/layout/LabView';
import MapView from './components/layout/MapView';
import SettingsModal from './components/modals/SettingsModal';
import SocraticDrawer from './components/modals/SocraticDrawer';
import { useStudies } from './hooks/useStudies';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'study'>('study');
  const [isLight, setIsLight] = useState(false);
  const [isSoft, setIsSoft] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [accent] = useState('default');

  const st = useStudies();
  const active = st.activeStudy;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Channel for the skill tree to push an example into the active study's lab.
  const [inject, setInject] = useState<{ code: string; nonce: number } | null>(null);
  const nonceRef = useRef(0);
  const loadExample = (code: string, _label: string) => {
    setInject({ code, nonce: ++nonceRef.current });
    setActiveTab('study');
  };

  const commitRename = (id: string) => { const n = renameDraft.trim(); if (n) st.renameStudy(id, n); setRenamingId(null); };

  return (
    <div id="app" data-mode={isLight ? 'light' : 'dark'} data-bg={isSoft ? 'soft' : 'oled'} data-theme={accent}>
      {/* SIDEBAR */}
      <aside id="sidebar" className={sidebarOpen ? 'open' : ''}>
        <div className="sl-head" style={{ display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
          <button className="menu-btn" title="Toggle Sidebar" onClick={() => setSidebarOpen(false)} style={{ marginRight: '12px' }}>☰</button>
          <span>YOUR STUDIES</span>
          <button className="sl-add" title="New study" onClick={st.addStudy}><i className="fa-solid fa-plus" /></button>
        </div>
        <div className="slist">
          {st.studies.map(s => {
            const isActive = s.id === st.activeStudyId;
            return (
              <div key={s.id} className={`sitem ${isActive ? 'active' : ''}`}
                onClick={() => { if (renamingId !== s.id) st.setActiveStudyId(s.id); }}
                onDoubleClick={() => { setRenamingId(s.id); setRenameDraft(s.name); }}>
                <div className="sitem-main">
                  {renamingId === s.id ? (
                    <input autoFocus className="sitem-rename" value={renameDraft}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setRenameDraft(e.target.value)}
                      onBlur={() => commitRename(s.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(s.id); else if (e.key === 'Escape') setRenamingId(null); }} />
                  ) : (
                    <>
                      <div className="sitem-title">{s.name}</div>
                      <div className="sitem-meta">
                        <span><i className="fa-solid fa-file-code" />{s.files.length}</span>
                        <span><i className="fa-solid fa-comment-dots" />{s.chats.length}</span>
                      </div>
                    </>
                  )}
                </div>
                {st.studies.length > 1 && renamingId !== s.id && (
                  <button className="sitem-del" title="Delete study"
                    onClick={e => { e.stopPropagation(); if (window.confirm(`Delete study "${s.name}"? This removes its files, chats and notes.`)) st.deleteStudy(s.id); }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div id="mainWrap">
        <header id="topbar">
          {!sidebarOpen && (
            <button className="menu-btn" title="Toggle Sidebar" onClick={() => setSidebarOpen(true)}>☰</button>
          )}
          <span className="brand">FACET</span>
          <div className="tabs">
            <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <span className="tdot" style={{ background: 'var(--pink)' }}></span> Map
            </button>
            <button className={`tab ${activeTab === 'study' ? 'active' : ''}`} onClick={() => setActiveTab('study')}>
              <span className="tdot" style={{ background: 'var(--accent)' }}></span> Study
            </button>
          </div>
          <span className="topfill"></span>

          <div className="theme-picker">
            <button onClick={() => setIsTutorOpen(true)} className="t-btn" title="Open AI Tutor" style={{ fontSize: '12px', width: 'auto', padding: '0 12px', fontFamily: 'var(--mono)', fontWeight: 'bold', color: 'var(--pink)' }}>AI TUTOR</button>
            <button onClick={() => setIsSettingsOpen(true)} className="t-btn" title="Open Settings" style={{ fontSize: '14px', width: '32px', height: '32px', marginLeft: '8px' }}><i className="fa-solid fa-gear"></i></button>
          </div>

          <span className="clock" id="clock"></span>
        </header>

        {/* VIEWS — both stay mounted (display toggle) so state + injected
            examples persist across tab switches instead of re-running. */}
        <div style={{ display: activeTab === 'map' ? 'contents' : 'none' }}>
          <MapView onLoadExample={loadExample} />
        </div>
        <div style={{ display: activeTab === 'study' ? 'contents' : 'none' }}>
          {/* keyed by study so switching studies gives a fresh lab (files reload, trace resets) */}
          <LabView key={active.id} inject={inject} active={activeTab === 'study'}
            files={active.files} activeFileId={active.activeFileId}
            setFiles={st.setFiles} setActiveFileId={st.setActiveFileId}
            note={active.note} setNote={st.setNote} />
        </div>

        {/* SETTINGS MODAL */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isLight={isLight}
          setIsLight={setIsLight}
          isSoft={isSoft}
          setIsSoft={setIsSoft}
        />

        {/* SOCRATIC TUTOR — bound to the active study's chats */}
        <SocraticDrawer
          isOpen={isTutorOpen}
          onClose={() => setIsTutorOpen(false)}
          studyName={active.name}
          chats={active.chats}
          activeChatId={active.activeChatId}
          setActiveChatId={st.setActiveChatId}
          setChatMessages={st.setChatMessages}
          addChat={st.addChat}
          renameChat={st.renameChat}
          deleteChat={st.deleteChat}
        />
      </div>
    </div>
  );
}

export default App;
