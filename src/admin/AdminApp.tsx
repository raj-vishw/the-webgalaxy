import { useEffect, useState } from 'react'
import { btnGhost } from './components/styles'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { Relationships } from './pages/Relationships'
import { Submissions } from './pages/Submissions'
import { Tags } from './pages/Tags'
import { Universes } from './pages/Universes'
import { Websites } from './pages/Websites'
import { api, onUnauthorized, token } from './services/api'
import type { User } from './services/types'

/** Light, plain surface — the admin is a tool, not the galaxy. */
const shell = 'min-h-screen bg-[#f5f6f8] font-sans text-[#16181d] [color-scheme:light] antialiased'

const PAGES = ['overview', 'submissions', 'websites', 'universes', 'relationships', 'tags'] as const
type Page = (typeof PAGES)[number]

const pageFromHash = (): Page => {
  const h = window.location.hash.replace('#', '') as Page
  return PAGES.includes(h) ? h : 'overview'
}

/**
 * The administration area, served at `/admin` inside the same build as the
 * galaxy but visually its own thing: a plain, fast content tool behind the
 * single administrator's sign-in. Sections are hash-routed (`/admin#websites`).
 */
export default function AdminApp() {
  // Without a stored token there is nothing to verify: straight to login.
  const [user, setUser] = useState<User | null | undefined>(() => (token.get() ? undefined : null))
  const [page, setPage] = useState<Page>(pageFromHash)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!token.get()) return
    api<User>('/admin/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    const off = onUnauthorized(() => setUser(null))
    return () => {
      off()
    }
  }, [])

  if (user === undefined) return <div className={shell}><p className="p-6 text-sm text-gray-500">Loading…</p></div>
  if (!user) return <div className={shell}><Login onLogin={setUser} /></div>

  const go = (p: string) => {
    window.location.hash = p
  }

  return (
    <div className={shell}>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <a href="/" className="text-sm font-semibold tracking-wide" title="Back to the galaxy">WebGalaxy Admin</a>
          <nav aria-label="Sections" className="flex flex-wrap gap-1">
            {PAGES.map((p) => (
              <a
                key={p}
                href={`#${p}`}
                aria-current={page === p ? 'page' : undefined}
                className={`rounded-md px-2.5 py-1 text-sm capitalize ${page === p ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {p}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
            <span>
              {user.email}
            </span>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                token.clear()
                setUser(null)
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {page === 'overview' && <Overview go={go} />}
        {page === 'submissions' && <Submissions />}
        {page === 'websites' && <Websites />}
        {page === 'universes' && <Universes />}
        {page === 'relationships' && <Relationships />}
        {page === 'tags' && <Tags />}
      </main>
    </div>
  )
}
