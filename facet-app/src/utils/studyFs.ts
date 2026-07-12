// Mirrors a Study's files onto a real on-disk directory (<app_data>/studies/<id>/)
// via the Rust fs commands, so the user has a genuine file tree they can browse.
// The studies.json store remains the source of truth; this is a best-effort mirror,
// so failures here never break the in-app workspace. No-op in browser/dev mode.

import { invoke } from '@tauri-apps/api/core';
import type { LabFile } from './files';

const hasTauri = () => !!(window as any).__TAURI_INTERNALS__;

// Write every current file, then delete any file left on disk that's no longer
// present — a full reconcile, so renames and deletions are reflected too.
export async function syncStudyFiles(studyId: string, files: LabFile[]): Promise<void> {
  if (!hasTauri()) return;
  try {
    await Promise.all(files.map(f =>
      invoke('write_study_file', { studyId, relPath: f.path, content: f.content })));
    const disk = await invoke<{ path: string; content: string }[]>('list_study_files', { studyId });
    const keep = new Set(files.map(f => f.path));
    await Promise.all(disk.filter(d => !keep.has(d.path)).map(d =>
      invoke('delete_study_path', { studyId, relPath: d.path })));
  } catch { /* best-effort mirror; studies.json stays authoritative */ }
}

export async function removeStudyDir(studyId: string): Promise<void> {
  if (!hasTauri()) return;
  try { await invoke('delete_study', { studyId }); } catch { /* ignore */ }
}
