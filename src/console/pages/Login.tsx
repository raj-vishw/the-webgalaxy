import { useState } from 'react'
import { api, token } from '../services/api'
import type { User } from '../services/types'
import { Field, Notice } from '../components/ui'
import { btnPrimary, input } from '../components/styles'
import { describeError } from '../hooks'

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data } = await api<{ token: string; user: User }>('/admin/auth/login', { method: 'POST', body: { email, password } })
      token.set(data.token)
      onLogin(data.user)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">WebGalaxy Console</h1>
        <p className="mt-1 mb-5 text-sm text-gray-500">Content management for the galaxy.</p>
        <div className="grid gap-4">
          <Field id="email" text="Email">
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </Field>
          <Field id="password" text="Password">
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          </Field>
          {error && <Notice kind="error">{error}</Notice>}
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </main>
  )
}
