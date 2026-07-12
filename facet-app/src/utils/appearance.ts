// Persist the appearance toggles (light/dark, soft-dark vs OLED black) so they
// survive relaunch. Stored in settings.json (Tauri store) with a localStorage
// fallback for the browser — mirroring how the AI settings are stored.

const KEY_LIGHT = 'ui_light';
const KEY_SOFT = 'ui_soft';

let store: any | null = null;
async function getStore() {
  if (!(window as any).__TAURI_INTERNALS__) return null;
  if (!store) { const { load } = await import('@tauri-apps/plugin-store'); store = await load('settings.json'); }
  return store;
}

async function getBool(key: string, fallback: boolean): Promise<boolean> {
  try {
    const s = await getStore();
    if (s) { const v = (await s.get(key)) as { value?: boolean } | undefined; if (v && typeof v.value === 'boolean') return v.value; }
  } catch { /* fall through */ }
  try { const raw = localStorage.getItem(key); if (raw != null) return raw === 'true'; } catch { /* ignore */ }
  return fallback;
}

async function setBool(key: string, value: boolean): Promise<void> {
  try {
    const s = await getStore();
    if (s) { await s.set(key, { value }); await s.save(); return; }
  } catch { /* fall through */ }
  try { localStorage.setItem(key, String(value)); } catch { /* best effort */ }
}

export async function loadAppearance(): Promise<{ isLight: boolean; isSoft: boolean }> {
  return { isLight: await getBool(KEY_LIGHT, false), isSoft: await getBool(KEY_SOFT, false) };
}
export const saveIsLight = (v: boolean) => setBool(KEY_LIGHT, v);
export const saveIsSoft = (v: boolean) => setBool(KEY_SOFT, v);
