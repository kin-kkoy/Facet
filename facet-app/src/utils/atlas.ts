// The Syntax Atlas is one instance of the generic "book" (see book.ts). This module
// keeps the Atlas-named exports the map's per-node Syntax Companion depends on.
import { loadBook, bookPageIndex, type Book, type BookPage } from './book';

export type Atlas = Book;
export type AtlasPage = BookPage;

export const loadAtlas = () => loadBook('atlas');
export const atlasPageIndex = bookPageIndex;
