import { useState, useEffect, useMemo } from 'react';
import { loadBook, type Book } from '../../utils/book';
import Markdown from '../Markdown';

// A jump request (e.g. the map's Syntax Companion): open a specific page.
export interface BookTarget { pageId: string; nonce: number; }

export interface BookPageContext { bookTitle: string; pageTitle: string; body: string; }

// Generic reader for a "book" folder (Atlas, Map book, App Specs): a part→page
// sidebar + a markdown reading pane. `accent` tints the active page link.
// `onPage` reports the current page (so the AI drawer can ground answers in it);
// `onAskAI` shows an "Ask AI" button that opens the tutor.
export default function BookView({ dir, accent, emptyHint, target, onPage, onAskAI }: {
  dir: string; accent: string; emptyHint?: string; target?: BookTarget | null;
  onPage?: (dir: string, ctx: BookPageContext) => void; onAskAI?: () => void;
}) {
  const [book, setBook] = useState<Book | null | 'loading'>('loading');
  const [pageId, setPageId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let live = true;
    loadBook(dir).then((b) => {
      if (!live) return;
      setBook(b);
      setPageId(b?.parts[0]?.pages[0]?.id ?? null);
    });
    return () => { live = false; };
  }, [dir]);

  // React to a jump-request (companion deep-link).
  useEffect(() => { if (target?.pageId) setPageId(target.pageId); }, [target?.nonce, target?.pageId]);

  const page = useMemo(() => {
    if (!book || book === 'loading') return null;
    for (const part of book.parts) for (const pg of part.pages) if (pg.id === pageId) return pg;
    return null;
  }, [book, pageId]);

  // Report the open page so the AI drawer can ground answers in it.
  useEffect(() => {
    if (onPage && book && book !== 'loading' && page) onPage(dir, { bookTitle: book.title, pageTitle: page.title, body: page.body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dir]);

  if (book === 'loading') return <div className="view active book-empty">Loading…</div>;
  if (!book) return <div className="view active book-empty">{emptyHint ?? `No content found under curriculum/${dir}/.`}</div>;

  const f = filter.toLowerCase();

  return (
    <div className="view active book-view" style={{ ['--book-accent' as string]: accent } as React.CSSProperties}>
      <aside className="book-nav">
        <div className="book-nav-head">
          <div className="book-title">{book.title}</div>
          <input className="book-filter" placeholder="filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="book-nav-scroll">
          {book.parts.map((part) => {
            const pages = part.pages.filter((p) => f === '' || p.title.toLowerCase().includes(f) || p.id.includes(f));
            if (pages.length === 0) return null;
            return (
              <div key={part.id} className="book-part">
                <div className="book-part-title">{part.title}</div>
                {pages.map((pg) => (
                  <button key={pg.id} className={`book-page-link ${pg.id === pageId ? 'active' : ''}`} onClick={() => setPageId(pg.id)}>
                    {pg.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>
      <div className="book-reader">
        {onAskAI && page && (
          <div className="book-reader-bar">
            <span className="book-reader-page">{page.title}</span>
            <button className="book-ask-ai" onClick={onAskAI} title="Ask the AI about this page (Socratic or Tutor)">
              <i className="fa-solid fa-wand-magic-sparkles" /> Ask AI
            </button>
          </div>
        )}
        {page ? <Markdown>{page.body}</Markdown> : <div className="book-empty">Select a page.</div>}
      </div>
    </div>
  );
}
