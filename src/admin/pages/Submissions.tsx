import { useState } from 'react'
import { api } from '../services/api'
import type { Submission, Universe } from '../services/types'
import { OBJECT_TYPES } from '../services/types'
import { Badge, Field, Notice, Pager, PageTitle, Table } from '../components/ui'
import { btnDanger, btnGhost, btnPrimary, input, selectInline } from '../components/styles'
import { describeError, useLoad } from '../hooks'

const TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const

function Review({ submission, universes, onDone }: { submission: Submission; universes: Universe[]; onDone: () => void }) {
  const [universeId, setUniverseId] = useState(submission.requestedUniverseSlug ?? '')
  const [objectType, setObjectType] = useState<string>('planet')
  const [importance, setImportance] = useState(40)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const review = async (body: unknown) => {
    setBusy(true)
    setError(null)
    try {
      await api(`/admin/submissions/${submission.id}/review`, { method: 'POST', body })
      onDone()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`u-${submission.id}`} text="Universe">
          <select id={`u-${submission.id}`} value={universeId} onChange={(e) => setUniverseId(e.target.value)} className={input}>
            <option value="">— choose —</option>
            {universes.map((u) => (
              <option key={u.id} value={u.slug}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`t-${submission.id}`} text="Object type">
          <select id={`t-${submission.id}`} value={objectType} onChange={(e) => setObjectType(e.target.value)} className={input}>
            {OBJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field id={`i-${submission.id}`} text="Importance (0–100)">
          <input id={`i-${submission.id}`} type="number" min={0} max={100} value={importance} onChange={(e) => setImportance(Number(e.target.value))} className={input} />
        </Field>
      </div>
      <Field id={`r-${submission.id}`} text="Rejection reason (only for reject)">
        <input id={`r-${submission.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className={input} placeholder="Why this doesn't fit" />
      </Field>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || !universeId} className={btnPrimary} onClick={() => review({ action: 'approve', overrides: { universeId, objectType, importance } })}>
          Approve & publish
        </button>
        <button type="button" disabled={busy || reason.trim().length < 3} className={btnDanger} onClick={() => review({ action: 'reject', rejectionReason: reason.trim() })}>
          Reject
        </button>
      </div>
    </div>
  )
}

export function Submissions() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const list = useLoad(() => api<Submission[]>('/admin/submissions', { query: { status, page, limit: 25 } }), [status, page])
  const universes = useLoad(() => api<Universe[]>('/admin/universes').then((r) => r.data))

  return (
    <>
      <PageTitle title="Submissions">
        <select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1) }} className={selectInline} aria-label="Status filter">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </PageTitle>
      {list.error && <Notice kind="error">{list.error}</Notice>}
      <Table head={['Website', 'URL', 'Requested universe', 'Tags', 'Submitted', 'Status', '']}>
        {(list.data?.data ?? []).map((s) => (
          <tr key={s.id} className="align-top">
            <td className="px-3 py-2">
              <div className="font-medium">{s.websiteName}</div>
              <div className="max-w-md text-gray-600">{s.description}</div>
              {open === s.id && s.status === 'pending' && universes.data && (
                <div className="mt-3">
                  <Review submission={s} universes={universes.data} onDone={() => { setOpen(null); list.reload() }} />
                </div>
              )}
              {s.status === 'rejected' && s.rejectionReason && <div className="mt-1 text-xs text-red-700">Reason: {s.rejectionReason}</div>}
            </td>
            <td className="px-3 py-2">
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700 underline">
                {s.url.replace(/^https?:\/\//, '')}
              </a>
            </td>
            <td className="px-3 py-2">{s.requestedUniverseName ?? '—'}</td>
            <td className="px-3 py-2 text-gray-600">{s.tags.join(', ') || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap text-gray-600">{new Date(s.submittedAt).toLocaleString()}</td>
            <td className="px-3 py-2">
              <Badge tone={TONE[s.status]}>{s.status}</Badge>
            </td>
            <td className="px-3 py-2">
              {s.status === 'pending' && (
                <button type="button" className={btnGhost} onClick={() => setOpen(open === s.id ? null : s.id)}>
                  {open === s.id ? 'Close' : 'Review'}
                </button>
              )}
            </td>
          </tr>
        ))}
        {list.data?.data.length === 0 && (
          <tr>
            <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
              Nothing here.
            </td>
          </tr>
        )}
      </Table>
      {list.data?.pagination && <Pager page={page} totalPages={list.data.pagination.totalPages} onPage={setPage} />}
    </>
  )
}
