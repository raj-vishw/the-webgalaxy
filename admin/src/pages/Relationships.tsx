import { useState } from 'react'
import { api } from '../services/api'
import type { Relationship } from '../services/types'
import { RELATIONSHIP_TYPES } from '../services/types'
import { Field, Notice, Pager, PageTitle, Table } from '../components/ui'
import { btnDanger, btnPrimary, input, selectInline } from '../components/styles'
import { describeError, useLoad } from '../hooks'

export function Relationships() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const list = useLoad(() => api<Relationship[]>('/admin/relationships', { query: { page, limit: 50, type } }), [page, type])
  const [form, setForm] = useState({ sourceId: '', targetId: '', type: 'related', directed: false, note: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/admin/relationships', { method: 'POST', body: { ...form, note: form.note.trim() || null } })
      setForm({ sourceId: '', targetId: '', type: 'related', directed: false, note: '' })
      list.reload()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (r: Relationship) => {
    if (!window.confirm(`Remove ${r.source.name} — ${r.target.name} (${r.type})?`)) return
    try {
      await api(`/admin/relationships/${r.id}`, { method: 'DELETE' })
      list.reload()
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <>
      <PageTitle title="Relationships">
        <select aria-label="Type filter" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className={selectInline}>
          <option value="">All types</option>
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </PageTitle>
      <form onSubmit={create} className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-5">
        <Field id="r-source" text="Website A (slug)">
          <input id="r-source" required value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} className={input} placeholder="github" />
        </Field>
        <Field id="r-target" text="Website B (slug)">
          <input id="r-target" required value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} className={input} placeholder="vercel" />
        </Field>
        <Field id="r-type" text="Type">
          <select id="r-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field id="r-note" text="Note (optional)">
          <input id="r-note" maxLength={160} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={input} />
        </Field>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.directed} onChange={(e) => setForm({ ...form, directed: e.target.checked })} /> A → B only
          </label>
          <button type="submit" disabled={busy} className={btnPrimary}>
            Connect
          </button>
        </div>
        <p className="text-xs text-gray-500 md:col-span-5">A relationship links two websites as equals — it never means one owns or contains the other. Self links and duplicates are refused.</p>
        {error && (
          <div className="md:col-span-5">
            <Notice kind="error">{error}</Notice>
          </div>
        )}
      </form>
      {list.error && <Notice kind="error">{list.error}</Notice>}
      <Table head={['Website A', 'Website B', 'Type', 'Direction', 'Note', '']}>
        {(list.data?.data ?? []).map((r) => (
          <tr key={r.id}>
            <td className="px-3 py-2 font-medium">{r.source.name}</td>
            <td className="px-3 py-2 font-medium">{r.target.name}</td>
            <td className="px-3 py-2">{r.type}</td>
            <td className="px-3 py-2 text-gray-600">{r.directed ? 'A → B' : 'A ↔ B'}</td>
            <td className="px-3 py-2 text-gray-600">{r.note ?? '—'}</td>
            <td className="px-3 py-2">
              <button type="button" className={btnDanger} onClick={() => remove(r)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {list.data?.pagination && <Pager page={page} totalPages={list.data.pagination.totalPages} onPage={setPage} />}
    </>
  )
}
