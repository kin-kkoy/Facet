// Generic "book" loader — a folder of markdown pages + an index.json manifest,
// read from the editable curriculum folder via the same Rust command that serves
// the curriculum. Powers the Syntax Atlas, the Map (book) and the App Specs tabs.
//
// A book lives at curriculum/<dir>/ with:
//   <dir>/index.json   → { title, parts: [{ id, title, pages: [{ id, title, file }] }] }
//   <dir>/<file>.md    → each page's markdown body
// (The Atlas historically used atlas/atlas.json; both names are accepted.)

export interface BookPage { id: string; title: string; file: string; body: string; }
export interface BookPart { id: string; title: string; pages: BookPage[]; }
export interface Book { title: string; parts: BookPart[]; }

// Titles come from H1s the generator HTML-escaped (e.g. "List&lt;T&gt;"); decode them.
const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function finalize(book: Book): Book {
  for (const part of book.parts) for (const pg of part.pages) pg.title = decodeEntities(pg.title);
  return book;
}

export async function loadBook(dir: string): Promise<Book | null> {
  // Desktop: read the editable folder via Rust (one call returns every file).
  if ((window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const files = await invoke<{ path: string; content: string }[]>('load_curriculum');
      const byPath = new Map(files.map((f) => [f.path.replace(/\\/g, '/'), f.content]));
      const raw = byPath.get(`${dir}/index.json`) ?? byPath.get(`${dir}/${dir}.json`);
      if (!raw) return null;
      const book = JSON.parse(raw) as Book;
      for (const part of book.parts) for (const pg of part.pages) pg.body = byPath.get(`${dir}/${pg.file}`) ?? '';
      return finalize(book);
    } catch (e) {
      console.error(`book "${dir}" load failed`, e);
      return null;
    }
  }
  // Browser/dev fallback: bundled files under public/, if present.
  try {
    const idx = await fetch(`/curriculum/${dir}/index.json`).then((r) => (r.ok ? r : fetch(`/curriculum/${dir}/${dir}.json`)));
    if (!idx.ok) return null;
    const book = (await idx.json()) as Book;
    for (const part of book.parts) for (const pg of part.pages) {
      const r = await fetch(`/curriculum/${dir}/${pg.file}`);
      pg.body = r.ok ? await r.text() : '';
    }
    return finalize(book);
  } catch {
    return null;
  }
}

// Flat lookup id → page (used by the map's per-node Syntax Companion).
export function bookPageIndex(book: Book): Map<string, BookPage> {
  const m = new Map<string, BookPage>();
  for (const part of book.parts) for (const pg of part.pages) m.set(pg.id, pg);
  return m;
}
