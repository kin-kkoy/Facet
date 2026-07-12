import { useState, useMemo } from 'react';
import type { Curriculum } from '../../utils/curriculum';
import { createNode, type NewNodeFields } from '../../utils/nodeEditor';

interface Props { isOpen: boolean; onClose: () => void; curriculum: Curriculum | null; onCreated: () => void; }

const KINDS: NewNodeFields['kind'][] = ['topic', 'chapter', 'checkpoint', 'project', 'crossroad'];

export default function NewNodeModal({ isOpen, onClose, curriculum, onCreated }: Props) {
  const [kind, setKind] = useState<NewNodeFields['kind']>('topic');
  const [branch, setBranch] = useState('');
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [summary, setSummary] = useState('');
  const [icon, setIcon] = useState('');
  const [prereqs, setPrereqs] = useState('');
  const [group, setGroup] = useState('');
  const [order, setOrder] = useState('');
  const [tier, setTier] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const branches = curriculum ? Object.keys(curriculum.branches) : [];
  const chapters = useMemo(() => (curriculum?.nodes ?? []).filter((n) => n.kind === 'chapter'), [curriculum]);
  const existingIds = useMemo(() => new Set((curriculum?.nodes ?? []).map((n) => n.id)), [curriculum]);

  if (!isOpen) return null;

  const idTaken = id.trim() !== '' && existingIds.has(id.trim());
  const canSave = branch && id.trim() && !idTaken && label.trim() && (kind !== 'topic' || group);

  const submit = async () => {
    if (!canSave || busy) return;
    setBusy(true); setErr(null);
    try {
      const f: NewNodeFields = {
        kind, branch, id: id.trim(), label: label.trim(),
        summary: summary.trim() || undefined,
        icon: icon.trim() || undefined,
        prereqs: prereqs.split(',').map((s) => s.trim()).filter(Boolean),
        group: kind === 'topic' ? group : undefined,
        order: kind === 'topic' && order ? Number(order) : undefined,
        tier: kind === 'chapter' && tier ? Number(tier) : undefined,
      };
      await createNode(f);
      onCreated();
    } catch (e: any) {
      setErr(e?.message || 'Failed to create node.');
    } finally {
      setBusy(false);
    }
  };

  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '9px 11px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13 };
  // WebKitGTK renders native <select> with the OS theme and ignores `background` unless
  // we disable the native appearance — then the black background actually applies.
  const sel: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', color: 'var(--text)', border: '1px solid var(--border2)',
    padding: '9px 30px 9px 11px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundColor: '#000',
    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%23888'/></svg>\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
  };
  const opt: React.CSSProperties = { background: '#000', color: 'var(--text)' };
  const row: React.CSSProperties = { display: 'flex', gap: 12 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 6, width: 560, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text)' }}><i className="fa-solid fa-plus" /> New node</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>Scaffolds a node file in your editable curriculum folder. Fill the essentials here; add body/example by editing the file later (see App Specs → Editable Content).</div>

        <div style={row}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as NewNodeFields['kind'])} style={sel}>
              {KINDS.map((k) => <option key={k} value={k} style={opt}>{k}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={sel}>
              <option value="" style={opt}>— pick —</option>
              {branches.map((b) => <option key={b} value={b} style={opt}>{curriculum?.branches[b]?.label ?? b}</option>)}
            </select>
          </div>
        </div>

        <div style={row}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Id {idTaken && <span style={{ color: '#ff6b6b' }}>(taken)</span>}</label>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. m01-t6" style={{ ...inp, borderColor: idTaken ? '#ff6b6b' : 'var(--border2)' }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={lbl}>Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shown on the node" style={inp} />
          </div>
        </div>

        {kind === 'topic' && (
          <div style={row}>
            <div style={{ flex: 2 }}>
              <label style={lbl}>Parent chapter (group)</label>
              <select value={group} onChange={(e) => setGroup(e.target.value)} style={sel}>
                <option value="" style={opt}>— pick —</option>
                {chapters.map((c) => <option key={c.id} value={c.id} style={opt}>{c.label} ({c.id})</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Order</label>
              <input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="e.g. 6" style={inp} />
            </div>
          </div>
        )}

        {kind === 'chapter' && (
          <div>
            <label style={lbl}>Tier (row)</label>
            <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="e.g. 11" style={inp} />
          </div>
        )}

        {kind !== 'topic' && (
          <div>
            <label style={lbl}>Prerequisites (comma-separated ids)</label>
            <input value={prereqs} onChange={(e) => setPrereqs(e.target.value)} placeholder="e.g. cross, cp5" style={inp} />
          </div>
        )}

        <div>
          <label style={lbl}>Summary (optional)</label>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line description in the detail popover" style={inp} />
        </div>
        <div>
          <label style={lbl}>Icon (optional, Font Awesome class)</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. fa-solid fa-bolt" style={inp} />
        </div>

        {err && <div style={{ fontSize: 12, color: '#ff6b6b' }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...inp, width: 'auto', cursor: 'pointer', background: 'var(--bg2)' }}>Cancel</button>
          <button onClick={submit} disabled={!canSave || busy}
            style={{ width: 'auto', padding: '9px 20px', borderRadius: 3, border: 'none', cursor: canSave && !busy ? 'pointer' : 'not-allowed', fontFamily: 'var(--mono)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, background: 'var(--accent)', color: 'var(--bg0)', opacity: canSave && !busy ? 1 : 0.5 }}>
            {busy ? 'Creating…' : 'Create node'}
          </button>
        </div>
      </div>
    </div>
  );
}
