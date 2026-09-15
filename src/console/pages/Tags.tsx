import { useState } from 'react'
import { api } from '../services/api'
import type { Tag } from '../services/types'
import { Notice, PageTitle, Table } from '../components/ui'
import { btnDanger, btnGhost, btnPrimary, input } from '../components/styles'
import { describeError, useLoad } from '../hooks'

export function Tags() {
  const list = useLoad(() => api<Tag[]>('/admin/tags').then((r) => r.data))
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      list.reload()
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <>
      <PageTitle title="Tags" />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => api('/admin/tags', { method: 'POST', body: { name } })).then(() => setName(''))
        }}
        className="mb-4 flex gap-2"
      >
        <input aria-label="New tag" value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-56`} placeholder="New tag" maxLength={32} required />
        <button type="submit" className={btnPrimary}>
          Add
        </button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      <Table head={['Tag', 'Slug', 'Websites', '']}>
        {(list.data ?? []).map((t) => (
          <tr key={t.id}>
            <td className="px-3 py-2 font-medium">{t.name}</td>
            <td className="px-3 py-2 text-gray-600">{t.slug}</td>
            <td className="px-3 py-2">{t.websiteCount}</td>
            <td className="flex gap-2 px-3 py-2">
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  const next = window.prompt('Rename tag', t.name)
                  if (next && next !== t.name) void run(() => api(`/admin/tags/${t.id}`, { method: 'PATCH', body: { name: next } }))
                }}
              >
                Rename
              </button>
              {(
                <button type="button" className={btnDanger} onClick={() => window.confirm(`Delete tag "${t.name}" from every website?`) && run(() => api(`/admin/tags/${t.id}`, { method: 'DELETE' }))}>
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  )
}
