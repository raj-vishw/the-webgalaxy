/**
 * Where the content console lives. The path is set at build time through
 * `VITE_ADMIN_PATH` and is deliberately absent from the source, the docs and
 * robots.txt. Unset means the console is not served at all.
 */
const configured = (import.meta.env.VITE_ADMIN_PATH as string | undefined)?.trim()
export const CONSOLE_PATH = configured && /^\/[\w-]+(\/[\w-]+)*$/.test(configured) ? configured : null

export const isConsolePath = (): boolean => {
  if (!CONSOLE_PATH) return false
  const { pathname } = window.location
  return pathname === CONSOLE_PATH || pathname.startsWith(`${CONSOLE_PATH}/`)
}
