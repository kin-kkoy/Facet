// In-app node scaffolding: build a node's markdown frontmatter and write it into the
// editable curriculum folder via the Rust `write_curriculum_file` command. For a topic,
// also splice its id into the parent chapter's `topics: [...]` so it wires up correctly.

export interface NewNodeFields {
  kind: 'chapter' | 'topic' | 'checkpoint' | 'project' | 'crossroad';
  branch: string;
  id: string;
  label: string;
  summary?: string;
  icon?: string;
  prereqs?: string[];
  group?: string;   // topic → parent chapter id
  order?: number;   // topic order
  tier?: number;    // chapter row
}

const q = (s: string) => JSON.stringify(s);
const flow = (a: string[]) => '[' + a.map(q).join(', ') + ']';
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildNodeMarkdown(f: NewNodeFields): string {
  const L: string[] = ['---', `id: ${q(f.id)}`, `kind: ${q(f.kind)}`];
  if (f.branch) L.push(`branch: ${q(f.branch)}`);
  if (f.kind === 'chapter' && f.tier != null) L.push(`tier: ${f.tier}`);
  if (f.kind === 'topic') {
    if (f.group) L.push(`group: ${q(f.group)}`);
    if (f.order != null) L.push(`order: ${f.order}`);
  }
  L.push(`label: ${q(f.label)}`);
  if (f.icon) L.push(`icon: ${q(f.icon)}`);
  if (f.summary) L.push(`summary: ${q(f.summary)}`);
  if (f.prereqs && f.prereqs.length) L.push(`prereqs: ${flow(f.prereqs)}`);
  L.push('---', '');
  return L.join('\n');
}

async function inv<T = any>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function createNode(f: NewNodeFields): Promise<void> {
  if (!(window as any).__TAURI_INTERNALS__) throw new Error('Node creation is only available in the desktop app.');

  await inv('write_curriculum_file', { relPath: `nodes/${f.branch}/${f.id}.md`, content: buildNodeMarkdown(f) });

  // A topic must be listed in its chapter's `topics: [...]` to wire up edges + completion.
  if (f.kind === 'topic' && f.group) {
    const files = await inv<{ path: string; content: string }[]>('load_curriculum', {});
    const chap = files.find((x) => {
      const p = x.path.replace(/\\/g, '/');
      return p.startsWith('nodes/') && p.endsWith('.md') && new RegExp(`^id:\\s*"?${esc(f.group!)}"?\\s*$`, 'm').test(x.content);
    });
    if (chap) {
      let c = chap.content;
      if (!new RegExp(`"${esc(f.id)}"`).test(c)) {
        if (/^topics:\s*\[\s*\]\s*$/m.test(c)) c = c.replace(/^topics:\s*\[\s*\]\s*$/m, `topics: [${q(f.id)}]`);
        else if (/^topics:\s*\[.*\]\s*$/m.test(c)) c = c.replace(/^(topics:\s*\[.*?)\]\s*$/m, `$1, ${q(f.id)}]`);
        else c = c.replace(/^(kind:.*)$/m, `$1\ntopics: [${q(f.id)}]`);
        await inv('write_curriculum_file', { relPath: chap.path.replace(/\\/g, '/'), content: c });
      }
    }
  }
}
