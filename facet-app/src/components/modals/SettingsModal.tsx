import { useState, useEffect } from 'react';
import { load } from '@tauri-apps/plugin-store';
import { fetchModels, fetchGeminiModels, modelRank, GEMINI_FALLBACK_MODELS, GEMINI_RECOMMENDED, type OrModel, type GemModel, type AIProvider } from '../../utils/ai';

// price → badge color/label ($ per 1M input tokens)
function priceTier(m: OrModel): { label: string; color: string } {
  if (m.isFree) return { label: 'FREE', color: '#22c55e' };
  const perM = m.promptPrice * 1e6;
  const color = perM < 1 ? '#00e5ff' : perM < 5 ? '#ffea00' : perM < 15 ? '#ff8c00' : '#ff2a2a';
  return { label: `$${perM.toFixed(perM < 1 ? 2 : perM < 100 ? 1 : 0)}/M`, color };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  setIsLight: (val: boolean) => void;
  isSoft: boolean;
  setIsSoft: (val: boolean) => void;
}

export default function SettingsModal({ isOpen, onClose, isLight, setIsLight, isSoft, setIsSoft }: Props) {
  const [provider, setProvider] = useState<AIProvider>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('meta-llama/llama-3.3-8b-instruct:free');
  const [models, setModels] = useState<OrModel[]>([]);
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [geminiModels, setGeminiModels] = useState<GemModel[]>(GEMINI_FALLBACK_MODELS);
  const [geminiErr, setGeminiErr] = useState<string | null>(null);
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [filter, setFilter] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [sort, setSort] = useState<'best' | 'free' | 'cheap'>('free');

  useEffect(() => {
    if (isOpen) {
      load('settings.json').then(store => {
        store.get<{value: string}>('ai_provider').then(val => { if (val?.value === 'gemini' || val?.value === 'openrouter') setProvider(val.value); });
        store.get<{value: string}>('openrouter_key').then(val => { if (val?.value) setApiKey(val.value); });
        store.get<{value: string}>('openrouter_model').then(val => { if (val?.value) setModel(val.value); });
        store.get<{value: string}>('gemini_key').then(val => { if (val?.value) setGeminiKey(val.value); });
        store.get<{value: string}>('gemini_model').then(val => { if (val?.value) setGeminiModel(val.value); });
      });
      setLoadingModels(true);
      fetchModels().then(m => setModels(m)).catch(() => setModels([])).finally(() => setLoadingModels(false));
    }
  }, [isOpen]);

  // Fetch the live Gemini model list once a key is present (the list endpoint needs it).
  const loadGeminiModels = async (key: string) => {
    if (!key.trim()) { setGeminiModels(GEMINI_FALLBACK_MODELS); setGeminiErr(null); return; }
    setLoadingGemini(true); setGeminiErr(null);
    try {
      const list = await fetchGeminiModels(key.trim());
      setGeminiModels(list.length ? list : GEMINI_FALLBACK_MODELS);
    } catch (e: any) {
      setGeminiModels(GEMINI_FALLBACK_MODELS);
      setGeminiErr(e.message || 'Could not list models — check the key.');
    } finally {
      setLoadingGemini(false);
    }
  };

  const saveSettings = async () => {
    const store = await load('settings.json');
    await store.set('ai_provider', { value: provider });
    await store.set('openrouter_key', { value: apiKey });
    await store.set('openrouter_model', { value: model });
    await store.set('gemini_key', { value: geminiKey });
    await store.set('gemini_model', { value: geminiModel });
    await store.save();
    onClose();
  };

  const freeCount = models.filter(m => m.isFree).length;
  const f = filter.toLowerCase();
  const visible = models
    .filter(m => (showPaid || m.isFree) && (f === '' || m.name.toLowerCase().includes(f) || m.id.toLowerCase().includes(f)))
    .sort((a, b) => {
      if (sort === 'best') return modelRank(b.id) - modelRank(a.id) || a.promptPrice - b.promptPrice;
      if (sort === 'cheap') return a.promptPrice - b.promptPrice || modelRank(b.id) - modelRank(a.id);
      // free-first
      if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
      return modelRank(b.id) - modelRank(a.id);
    });
  // The highest-quality model currently shown (★). With paid models hidden this is
  // the "best free" pick; the free list is already sorted so it's the top row.
  const bestId = visible.reduce<string | null>((best, m) => (best === null || modelRank(m.id) > modelRank(best) ? m.id : best), null);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '6px',
        width: '620px', maxWidth: '92vw', padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text)' }}>
            <i className="fa-solid fa-gear"></i> Settings
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}><i className="fa-solid fa-xmark"></i></button>
        </div>

        {/* AI provider toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>AI Provider</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([['openrouter', 'OpenRouter'], ['gemini', 'Google Gemini']] as const).map(([p, lbl]) => (
              <button key={p} onClick={() => setProvider(p)} style={{
                flex: 1, fontSize: '12px', fontFamily: 'var(--mono)', padding: '9px', borderRadius: '3px', cursor: 'pointer',
                background: provider === p ? 'var(--accent)' : 'var(--bg2)', color: provider === p ? 'var(--bg0)' : 'var(--text2)',
                border: '1px solid var(--border2)', fontWeight: provider === p ? 700 : 400,
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>Powers the Socratic Tutor, AI Refine, Note clean-up and Supercompile. Keys are stored locally on your device.</div>
        </div>

        {provider === 'openrouter' ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>OpenRouter API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-v1-..."
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '11px', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '13px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>Get one at openrouter.ai/keys.</div>
            </div>

            {/* OpenRouter model picker */}
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Model</label>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} /> show paid models
                </label>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text3)' }}>Selected:</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>{model}</span>
              </div>

              {/* sort + filter — the sort buttons only differ once paid models are shown
                  (every free model costs $0, so Best/Free/Cheapest collapse to one order). */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                {showPaid ? (['best', 'free', 'cheap'] as const).map(s => (
                  <button key={s} onClick={() => setSort(s)} style={{
                    fontSize: '12px', fontFamily: 'var(--mono)', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer', textTransform: 'capitalize',
                    background: sort === s ? 'var(--accent)' : 'var(--bg2)', color: sort === s ? 'var(--bg0)' : 'var(--text2)', border: '1px solid var(--border2)', fontWeight: sort === s ? 700 : 400,
                  }}>{s === 'free' ? 'Free first' : s === 'cheap' ? 'Cheapest' : 'Best'}</button>
                )) : (
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>Sorted best-first · enable “show paid” to compare sorts</span>
                )}
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={loadingModels ? 'loading…' : `filter ${models.length}…`}
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ height: '240px', overflowY: 'auto', border: '1px solid var(--border2)', borderRadius: '4px', background: 'var(--bg0)' }}>
                {loadingModels && <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Fetching models from OpenRouter…</div>}
                {!loadingModels && visible.length === 0 && <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text3)' }}>No models match.</div>}
                {visible.map(m => {
                  const tier = priceTier(m);
                  const isSel = m.id === model;
                  return (
                    <div key={m.id} onClick={() => setModel(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer',
                      background: isSel ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'transparent',
                      borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}`, borderBottom: '1px solid var(--border)',
                    }}>
                      <i className={`fa-solid ${isSel ? 'fa-circle-dot' : 'fa-circle'}`} style={{ fontSize: '11px', color: isSel ? 'var(--accent)' : 'var(--text3)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: isSel ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.id === bestId && <i className="fa-solid fa-star" style={{ color: '#ffd23f', fontSize: '10px', marginRight: '6px' }} title="Highest-quality pick" />}
                          {m.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.id}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', fontWeight: 700, color: tier.color, border: `1px solid ${tier.color}`, borderRadius: '10px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{tier.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}><i className="fa-solid fa-star" style={{ color: '#ffd23f' }} /> = highest quality (best free while paid models are hidden) · {freeCount} free · showing {visible.length}.</div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Google Gemini API Key</label>
              <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} onBlur={() => loadGeminiModels(geminiKey)} placeholder="AIza..."
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '11px', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '13px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>Free key at aistudio.google.com/apikey. Heads-up: on the free tier Google may use your inputs to improve their models — don’t paste anything confidential.</div>
            </div>

            {/* Gemini model picker */}
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Model</label>
                <button onClick={() => loadGeminiModels(geminiKey)} disabled={loadingGemini} style={{ fontSize: '11px', fontFamily: 'var(--mono)', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: '3px', padding: '4px 10px', cursor: 'pointer' }}>
                  <i className={`fa-solid ${loadingGemini ? 'fa-circle-notch fa-spin' : 'fa-rotate'}`} style={{ marginRight: '6px' }} />reload
                </button>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text3)' }}>Selected:</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>{geminiModel}</span>
              </div>

              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter…"
                style={{ width: '100%', marginBottom: '10px', background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '12px', boxSizing: 'border-box' }} />

              <div style={{ height: '240px', overflowY: 'auto', border: '1px solid var(--border2)', borderRadius: '4px', background: 'var(--bg0)' }}>
                {geminiModels.filter(m => { const q = filter.toLowerCase(); return q === '' || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q); }).map(m => {
                  const isSel = m.id === geminiModel;
                  const paid = /pro/i.test(m.id);
                  return (
                    <div key={m.id} onClick={() => setGeminiModel(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer',
                      background: isSel ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'transparent',
                      borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}`, borderBottom: '1px solid var(--border)',
                    }}>
                      <i className={`fa-solid ${isSel ? 'fa-circle-dot' : 'fa-circle'}`} style={{ fontSize: '11px', color: isSel ? 'var(--accent)' : 'var(--text3)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: isSel ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.id === GEMINI_RECOMMENDED && <i className="fa-solid fa-star" style={{ color: '#ffd23f', fontSize: '10px', marginRight: '6px' }} title="Recommended free model" />}
                          {m.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.id}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', fontWeight: 700, color: paid ? '#ff8c00' : '#22c55e', border: `1px solid ${paid ? '#ff8c00' : '#22c55e'}`, borderRadius: '10px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{paid ? 'PRO' : 'FREE'}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: geminiErr ? 'var(--red, #ff6b6b)' : 'var(--text3)', marginTop: '8px' }}>
                {geminiErr ? geminiErr : `${geminiModels.length} models${geminiKey ? '' : ' (defaults — add a key + reload for your live list)'}. Flash tiers are free; Pro tiers may cost.`}
              </div>
            </div>
          </>
        )}

        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Appearance</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setIsLight(!isLight)} style={{
              flex: 1, padding: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', 
              color: 'var(--text)', cursor: 'pointer', borderRadius: '2px'
            }}>
              {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </button>
            {!isLight && (
              <button onClick={() => setIsSoft(!isSoft)} style={{
                flex: 1, padding: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', 
                color: 'var(--text)', cursor: 'pointer', borderRadius: '2px'
              }}>
                {isSoft ? 'Use OLED Black' : 'Use Soft Dark'}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button onClick={saveSettings} style={{
            background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 24px', 
            borderRadius: '2px', cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px'
          }}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}
