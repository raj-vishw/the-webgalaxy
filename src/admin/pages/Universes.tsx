import { useState } from 'react'
import { api } from '../services/api'
import type { Universe } from '../services/types'
import { VISUAL_TYPES } from '../services/types'
import { Badge, Field, Notice, PageTitle, Table } from '../components/ui'
import { btnGhost, btnPrimary, input } from '../components/styles'
import { describeError, useLoad } from '../hooks'

const DEFAULT_CONFIG = {
  position: [0, 0, 0],
  scale: 10,
  palette: { core: '#ffffff', primary: '#8fb0ff', secondary: '#c9d7ff' },
  seed: 1,
  layout: { spread: [0.9, 0.45, 0.8], coreBias: 0.4, energy: 1, dust: 1 },
}

function Editor({ universe, onSaved, onClose }: { universe: Universe | null; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState(universe?.name ?? '')
  const [description, setDescription] = useState(universe?.description ?? '')
  const [visualType, setVisualType] = useState(universe?.visualType ?? 'spiral')
  const [config, setConfig] = useState(JSON.stringify(universe?.visualConfig ?? DEFAULT_CONFIG, null, 2))
  const [isActive, setIsActive] = useState(universe?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const visualConfig = JSON.parse(config)
      const body = { name: name.trim(), description: description.trim(), visualType, visualConfig, isActive }
      if (universe) await api(`/admin/universes/${universe.id}`, { method: 'PATCH', body })
      else await api('/admin/universes', { method: 'POST', body })
      onSaved()
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Visual configuration must be valid JSON.' : describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{universe ? `Edit ${universe.name}` : 'New universe'}</h2>
        <button type="button" onClick={onClose} className={btnGhost}>
          Close
        </button>
      </div>
      <p className="text-xs text-gray-500">Universes are independent peers. There is no parent universe and no nesting — every universe sits directly inside The WebGalaxy.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="u-name" text="Name">
          <input id="u-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </Field>
        <Field id="u-type" text="Visual type">
          <select id="u-type" value={visualType} onChange={(e) => setVisualType(e.target.value)} className={input}>
            {VISUAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field id="u-desc" text="Description">
          <input id="u-desc" maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
        </Field>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active (shown in the galaxy)
        </label>
        <div className="md:col-span-2">
          <Field id="u-config" text="Visual configuration (JSON: position, scale, palette, seed, layout)" hint="Positions are world units; check the galaxy overview after moving a universe so labels don't overlap.">
            <textarea id="u-config" rows={10} value={config} onChange={(e) => setConfig(e.target.value)} className={`${input} font-mono text-xs`} spellCheck={false} />
          </Field>
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving…' : universe ? 'Save changes' : 'Create universe'}
        </button>
      </div>
    </form>
  )
}

export function Universes() {
  const [editing, setEditing] = useState<Universe | null | 'new'>(null)
  const list = useLoad(() => api<Universe[]>('/admin/universes').then((r) => r.data))
  const onSaved = () => {
    setEditing(null)
    list.reload()
  }
  return (
    <>
      <PageTitle title="Universes">
        <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
          New universe
        </button>
      </PageTitle>
      {editing !== null && (
        <div className="mb-5">
          <Editor universe={editing === 'new' ? null : editing} onSaved={onSaved} onClose={() => setEditing(null)} />
        </div>
      )}
      {list.error && <Notice kind="error">{list.error}</Notice>}
      <Table head={['Name', 'Slug', 'Visual type', 'Websites', 'Status', '']}>
        {(list.data ?? []).map((u) => (
          <tr key={u.id} className={u.isActive ? '' : 'opacity-60'}>
            <td className="px-3 py-2 font-medium">{u.name}</td>
            <td className="px-3 py-2 text-gray-600">{u.slug}</td>
            <td className="px-3 py-2">{u.visualType}</td>
            <td className="px-3 py-2">{u.websiteCount ?? '—'}</td>
            <td className="px-3 py-2">{u.isActive ? <Badge tone="green">active</Badge> : <Badge tone="red">inactive</Badge>}</td>
            <td className="px-3 py-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(u)}>
                Edit
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  )
}
