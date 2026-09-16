import { useState } from 'react'
import { api } from '../services/api'
import type { Universe, Website } from '../services/types'
import { OBJECT_TYPES } from '../services/types'
import { Badge, Field, Notice, Pager, PageTitle, Table } from '../components/ui'
import { btnDanger, btnGhost, btnPrimary, input, selectInline } from '../components/styles'
import { describeError, useLoad } from '../hooks'

interface Draft {
  name: string
  slug: string
  url: string
  description: string
  logoUrl: string
  universeId: string
  objectType: string
  importance: number
  popularityScore: number
  trendingScore: number
  trendDirection: string
  isTrending: boolean
  isEmerging: boolean
  isActive: boolean
  accent: string
  glyph: string
  topic: string
  orbitAnchorId: string
  tags: string
}

const draftOf = (w: Website | null, universeSlug = ''): Draft => ({
  name: w?.name ?? '',
  slug: w?.slug ?? '',
  url: w?.url ?? '',
  description: w?.description ?? '',
  logoUrl: w?.logoUrl ?? '',
  universeId: w?.universeSlug ?? universeSlug,
  objectType: w?.objectType ?? 'planet',
  importance: w?.importance ?? 50,
  popularityScore: w?.popularityScore ?? 50,
  trendingScore: w?.trendingScore ?? 0,
  trendDirection: w?.trendDirection ?? 'steady',
  isTrending: w?.isTrending ?? false,
  isEmerging: w?.isEmerging ?? false,
  isActive: w?.isActive ?? true,
  accent: w?.accent ?? '',
  glyph: w?.glyph ?? '',
  topic: w?.topic ?? '',
  orbitAnchorId: w?.orbitAnchorId ?? '',
  tags: w?.tags.join(', ') ?? '',
})

const toBody = (d: Draft) => ({
  name: d.name.trim(),
  ...(d.slug.trim() ? { slug: d.slug.trim() } : {}),
  url: d.url.trim() || null,
  description: d.description.trim(),
  logoUrl: d.logoUrl.trim() || null,
  universeId: d.universeId,
  objectType: d.objectType,
  importance: Number(d.importance),
  popularityScore: Number(d.popularityScore),
  trendingScore: Number(d.trendingScore),
  trendDirection: d.trendDirection,
  isTrending: d.isTrending,
  isEmerging: d.isEmerging,
  isActive: d.isActive,
  accent: d.accent.trim() || null,
  glyph: d.glyph.trim() || null,
  topic: d.topic.trim() || null,
  orbitAnchorId: d.orbitAnchorId.trim() || null,
  tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean),
})

/** Create / edit form. Trending and emerging are plain switches — admin-controlled, not measured. */
function Editor({ website, universes, onSaved, onClose }: { website: Website | null; universes: Universe[]; onSaved: () => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(draftOf(website, universes[0]?.slug))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const id = website?.id ?? 'new'

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (website) await api(`/admin/websites/${website.id}`, { method: 'PATCH', body: toBody(d) })
      else await api('/admin/websites', { method: 'POST', body: toBody(d) })
      onSaved()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!website || !window.confirm(`Delete ${website.name} permanently? Its relationships go with it.`)) return
    setBusy(true)
    try {
      await api(`/admin/websites/${website.id}`, { method: 'DELETE' })
      onSaved()
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }

  const text = (k: keyof Draft, label: string, extra: Record<string, unknown> = {}) => (
    <Field id={`${id}-${k}`} text={label}>
      <input id={`${id}-${k}`} value={String(d[k])} onChange={(e) => set(k, e.target.value as never)} className={input} {...extra} />
    </Field>
  )

  return (
    <form onSubmit={save} className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{website ? `Edit ${website.name}` : 'New website'}</h2>
        <button type="button" onClick={onClose} className={btnGhost}>
          Close
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {text('name', 'Name', { required: true, maxLength: 80 })}
        {text('slug', 'Slug', { placeholder: 'auto from name', pattern: '[a-z0-9]+(-[a-z0-9]+)*' })}
        {text('url', 'URL', { placeholder: 'https://', maxLength: 2048 })}
        {text('logoUrl', 'Logo URL (trusted source only)', { placeholder: 'https://' })}
        <Field id={`${id}-universe`} text="Universe">
          <select id={`${id}-universe`} value={d.universeId} onChange={(e) => set('universeId', e.target.value)} className={input} required>
            {universes.map((u) => (
              <option key={u.id} value={u.slug}>
                {u.name}
                {u.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-type`} text="Object type">
          <select id={`${id}-type`} value={d.objectType} onChange={(e) => set('objectType', e.target.value)} className={input}>
            {OBJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-description`} text="Description">
          <textarea id={`${id}-description`} rows={3} maxLength={600} value={d.description} onChange={(e) => set('description', e.target.value)} className={input} />
        </Field>
        {text('tags', 'Tags (comma separated)')}
        {text('importance', 'Importance 0–100', { type: 'number', min: 0, max: 100 })}
        {text('popularityScore', 'Popularity 0–100 (manual for now)', { type: 'number', min: 0, max: 100 })}
        {text('accent', 'Accent colour', { placeholder: '#7fd1b9' })}
        {text('glyph', 'Glyph (1–4 chars)', { maxLength: 4 })}
        {text('topic', 'Topic (neighbourhood inside the universe)', { placeholder: 'e.g. Jazz', maxLength: 60 })}
        {text('orbitAnchorId', 'Orbit anchor slug (moons only)', { placeholder: 'e.g. github' })}
        <div className="grid gap-2 rounded-md border border-gray-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trend snapshot (admin-controlled)</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.isTrending} onChange={(e) => set('isTrending', e.target.checked)} /> Trending
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.isEmerging} onChange={(e) => set('isEmerging', e.target.checked)} /> Emerging
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Trending score" type="number" min={0} max={1} step={0.05} value={d.trendingScore} onChange={(e) => set('trendingScore', Number(e.target.value))} className={input} />
            <select aria-label="Trend direction" value={d.trendDirection} onChange={(e) => set('trendDirection', e.target.value)} className={input}>
              <option value="up">up</option>
              <option value="steady">steady</option>
              <option value="down">down</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Visible in the galaxy (active)
          </label>
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving…' : website ? 'Save changes' : 'Create website'}
        </button>
        {website && (
          <button type="button" disabled={busy} onClick={remove} className={btnDanger}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

export function Websites() {
  const [q, setQ] = useState('')
  const [universe, setUniverse] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Website | null | 'new'>(null)
  const list = useLoad(() => api<Website[]>('/admin/websites', { query: { q, universe, page, limit: 25, fields: 'full', includeInactive: true } }), [q, universe, page])
  const universes = useLoad(() => api<Universe[]>('/admin/universes').then((r) => r.data))

  const onSaved = () => {
    setEditing(null)
    list.reload()
  }

  return (
    <>
      <PageTitle title="Websites">
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Search websites" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className={`${input} w-48`} />
          <select aria-label="Universe filter" value={universe} onChange={(e) => { setUniverse(e.target.value); setPage(1) }} className={selectInline}>
            <option value="">All universes</option>
            {(universes.data ?? []).map((u) => (
              <option key={u.id} value={u.slug}>
                {u.name}
              </option>
            ))}
          </select>
          <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
            New website
          </button>
        </div>
      </PageTitle>
      {editing !== null && universes.data && (
        <div className="mb-5">
          <Editor website={editing === 'new' ? null : editing} universes={universes.data} onSaved={onSaved} onClose={() => setEditing(null)} />
        </div>
      )}
      {list.error && <Notice kind="error">{list.error}</Notice>}
      <Table head={['Name', 'Universe', 'Type', 'Importance', 'Flags', 'Tags', '']}>
        {(list.data?.data ?? []).map((w) => (
          <tr key={w.id} className={w.isActive ? '' : 'opacity-60'}>
            <td className="px-3 py-2">
              <div className="font-medium">{w.name}</div>
              <div className="text-xs text-gray-500">{w.slug}</div>
            </td>
            <td className="px-3 py-2">{w.universeSlug}</td>
            <td className="px-3 py-2">{w.objectType}</td>
            <td className="px-3 py-2">{w.importance}</td>
            <td className="space-x-1 px-3 py-2">
              {!w.isActive && <Badge tone="red">inactive</Badge>}
              {w.isTrending && <Badge tone="amber">trending</Badge>}
              {w.isEmerging && <Badge tone="blue">emerging</Badge>}
            </td>
            <td className="px-3 py-2 text-gray-600">{w.tags.join(', ')}</td>
            <td className="px-3 py-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(w)}>
                Edit
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {list.data?.pagination && <Pager page={page} totalPages={list.data.pagination.totalPages} onPage={setPage} />}
    </>
  )
}
