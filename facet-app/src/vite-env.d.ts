/// <reference types="vite/client" />

// Injected by the Tauri runtime; absent when running in a plain browser.
interface Window {
  __TAURI_INTERNALS__?: unknown;
}
