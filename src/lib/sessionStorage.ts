/**
 * Tiny guarded wrapper around `sessionStorage` for in-session exploration
 * state (history, signals). Nothing here leaves the browser tab; the storage
 * may be unavailable (private mode, quota) and everything degrades to memory.
 */
const KEY = 'webgalaxy.session.v1'

export function loadSession<T>(): T | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveSession(value: unknown) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Storage unavailable: the session simply isn't remembered across reloads.
  }
}

