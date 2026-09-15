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

const PAGES = ['overview', 'submissions', 'websites', 'universes', 'relationships', 'tags'] as const
type Page = (typeof PAGES)[number]

const pageFromHash = (): Page => {
  const h = window.location.hash.replace('#', '') as Page
  return PAGES.includes(h) ? h : 'overview'
}

/**
 * The admin is a small hash-routed app: sign in, then manage content. It
 * does not replace the galaxy and does not share its aesthetic — it is a
 * plain, fast tool for staff.
 */
export default function App() {
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

  if (user === undefined) return <p className="p-6 text-sm text-gray-500">Loading…</p>
  if (!user) return <Login onLogin={setUser} />

  const go = (p: string) => {
    window.location.hash = p
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-sm font-semibold tracking-wide">WebGalaxy Admin</span>
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
              {user.email} · {user.role}
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
        {page === 'websites' && <Websites user={user} />}
        {page === 'universes' && <Universes user={user} />}
        {page === 'relationships' && <Relationships />}
        {page === 'tags' && <Tags user={user} />}
      </main>
    </div>
  )
}
