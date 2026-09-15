import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../../services/api'
import { submissionApi } from '../../services/submissionApi'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { interactionEvents } from '../../utils/interaction'
import { galaxyNavigation } from '../../utils/navigation'
import { eyebrow, focusRing, ghostButton, glassPanel } from '../ui/panel'

const MAX_TAGS = 6
const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 400

interface Fields {
  websiteName: string
  url: string
  description: string
  requestedUniverseId: string
  tags: string
}

const EMPTY: Fields = { websiteName: '', url: '', description: '', requestedUniverseId: '', tags: '' }

const field =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-sans text-[13px] text-white placeholder:text-space-300/40 transition-colors hover:border-white/25 focus:border-white/40 ' + focusRing
const label = 'mb-1.5 block font-sans text-[10.5px] tracking-[0.22em] uppercase text-space-300/70'

/**
 * "+ Add to the WebGalaxy": a public submission form, no account needed.
 * Validates locally first, asks the API whether the URL is already charted
 * as the user types, and never publishes anything itself — submissions wait
 * for moderation.
 */
export function SubmitWebsiteForm() {
  const open = useGalaxyStore((s) => s.overlay === 'submit')
  const closeOverlay = useGalaxyStore((s) => s.closeOverlay)
  const universes = useCatalogStore((s) => s.universes)
  const online = useCatalogStore((s) => s.source === 'api')
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const id = useId()
  const firstRef = useRef<HTMLInputElement>(null)
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  type UrlCheck = { exists: boolean; pending: boolean; website: { slug: string; name: string } | null }
  const [urlChecked, setUrlChecked] = useState<{ url: string; result: UrlCheck | null } | null>(null)
  // Only a check for the URL currently in the field counts.
  const urlCheck = urlChecked && urlChecked.url === fields.url.trim() ? urlChecked.result : null
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'submitting' } | { kind: 'done'; name: string } | { kind: 'failed'; message: string }>({ kind: 'idle' })

  // Fresh form each time it opens, defaulting the universe to where the explorer is.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setFields({ ...EMPTY, requestedUniverseId: activeUniverseId ?? '' })
      setErrors({})
      setUrlChecked(null)
      setState({ kind: 'idle' })
    }
  }
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => firstRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [open])

  // Duplicate detection as the URL is typed (debounced, cancellable).
  useEffect(() => {
    const url = fields.url.trim()
    if (!open || !online || url.length < 4) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const result = await submissionApi.checkUrl(url, controller.signal)
        setUrlChecked({ url, result: result.valid ? { exists: result.exists, pending: result.pending, website: result.website } : null })
      } catch {
        setUrlChecked({ url, result: null })
      }
    }, 350)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [fields.url, open, online])

  const tags = fields.tags
    .split(/[,\n]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (fields.websiteName.trim().length < 2) next.websiteName = 'Give the website a name.'
    if (!/^(https?:\/\/)?[^\s/$.?#]+\.[^\s]+$/i.test(fields.url.trim())) next.url = 'Enter a web address like example.com.'
    const d = fields.description.trim().length
    if (d < DESCRIPTION_MIN) next.description = `Describe it in at least ${DESCRIPTION_MIN} characters.`
    else if (d > DESCRIPTION_MAX) next.description = `Keep the description under ${DESCRIPTION_MAX} characters.`
    if (fields.requestedUniverseId && !universes.some((u) => u.id === fields.requestedUniverseId)) next.requestedUniverseId = 'Choose one of the universes.'
    if (tags.length > MAX_TAGS) next.tags = `Up to ${MAX_TAGS} tags.`
    if (tags.some((t) => t.length > 32)) next.tags = 'Tags must be short.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || urlCheck?.exists) return
    setState({ kind: 'submitting' })
    try {
      const submission = await submissionApi.submit({
        websiteName: fields.websiteName.trim(),
        url: fields.url.trim(),
        description: fields.description.trim(),
        requestedUniverseId: fields.requestedUniverseId || undefined,
        tags,
      })
      interactionEvents.emit({ type: 'submission:create', websiteName: submission.websiteName })
      setState({ kind: 'done', name: submission.websiteName })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'WEBSITE_EXISTS') {
        setUrlChecked({ url: fields.url.trim(), result: { exists: true, pending: false, website: null } })
        setState({ kind: 'idle' })
        return
      }
      setState({ kind: 'failed', message: error instanceof ApiError && !error.isUnavailable ? `We couldn't add this website. ${error.message}` : "We couldn't add this website — the galaxy connection was interrupted. Review your submission and try again." })
    }
  }

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }))

  const errorId = (key: keyof Fields) => `${id}-${key}-error`

  return (
    <div
      aria-hidden={!open}
      className={['absolute inset-0 z-40 flex items-start justify-center', 'transition-opacity duration-300', open ? 'opacity-100' : 'pointer-events-none opacity-0'].join(' ')}
    >
      <button type="button" aria-label="Close form" onClick={closeOverlay} className="absolute inset-0 cursor-default bg-[#020308]/45" tabIndex={-1} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Add a website to the WebGalaxy"
        className={[glassPanel, 'relative mx-3 mt-3 max-h-[calc(100vh-1.5rem)] w-full max-w-[520px] overflow-y-auto overscroll-contain px-5 pt-5 pb-5 sm:mx-6 sm:mt-16 sm:px-7 sm:pt-6', 'transition-transform duration-300 ease-out', open ? 'translate-y-0' : '-translate-y-2'].join(' ')}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className={eyebrow}>+ Add to the WebGalaxy</p>
            <p className="mt-1 font-sans text-[12px] leading-5 text-space-300/75">
              Suggest a website. Every submission is reviewed before it appears in the galaxy — no account needed.
            </p>
          </div>
          <button type="button" onClick={closeOverlay} aria-label="Close" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-space-300/70 transition-colors hover:text-white ${focusRing}`}>
            <span aria-hidden className="text-[16px] leading-none">×</span>
          </button>
        </div>

        {state.kind === 'done' ? (
          <div className="py-6 text-center" role="status">
            <p className="font-sans text-[15px] text-white">Thank you — {state.name} is now pending review.</p>
            <p className="mt-2 font-sans text-[12px] leading-5 text-space-300/75">Once an administrator approves it, its celestial object appears in the galaxy automatically.</p>
            <button type="button" onClick={closeOverlay} className={`${ghostButton} mt-6`}>
              Back to exploring
            </button>
          </div>
        ) : !online ? (
          <div className="py-6 text-center" role="status">
            <p className="font-sans text-[14px] text-white/90">Submissions need a connection to the galaxy's API.</p>
            <p className="mt-2 font-sans text-[12px] leading-5 text-space-300/75">You can keep exploring — try again once the galaxy is back online.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-4">
            <div>
              <label htmlFor={`${id}-url`} className={label}>Website URL</label>
              <input
                ref={firstRef}
                id={`${id}-url`}
                type="url"
                inputMode="url"
                autoComplete="url"
                value={fields.url}
                onChange={set('url')}
                placeholder="example.com"
                aria-invalid={!!errors.url || !!urlCheck?.exists}
                aria-describedby={errors.url || urlCheck ? errorId('url') : undefined}
                className={field}
                disabled={state.kind === 'submitting'}
              />
              <p id={errorId('url')} className="mt-1 min-h-4 font-sans text-[11px] leading-4" aria-live="polite">
                {errors.url ? (
                  <span className="text-[#ff9a9a]">{errors.url}</span>
                ) : urlCheck?.exists ? (
                  <span className="text-white/85">
                    This website is already in the WebGalaxy.
                    {urlCheck.website && (
                      <>
                        {' '}
                        <button
                          type="button"
                          onClick={() => {
                            closeOverlay()
                            galaxyNavigation.focusWebsite(urlCheck.website!.slug)
                          }}
                          className={`underline decoration-white/40 underline-offset-2 hover:text-white ${focusRing}`}
                        >
                          Travel to {urlCheck.website.name}
                        </button>
                      </>
                    )}
                  </span>
                ) : urlCheck?.pending ? (
                  <span className="text-space-300/80">This website has already been submitted and is awaiting review.</span>
                ) : null}
              </p>
            </div>

            <div>
              <label htmlFor={`${id}-name`} className={label}>Website name</label>
              <input id={`${id}-name`} type="text" value={fields.websiteName} onChange={set('websiteName')} maxLength={80} placeholder="Name" aria-invalid={!!errors.websiteName} aria-describedby={errors.websiteName ? errorId('websiteName') : undefined} className={field} disabled={state.kind === 'submitting'} />
              {errors.websiteName && <p id={errorId('websiteName')} className="mt-1 font-sans text-[11px] text-[#ff9a9a]">{errors.websiteName}</p>}
            </div>

            <div>
              <label htmlFor={`${id}-description`} className={label}>Description</label>
              <textarea id={`${id}-description`} value={fields.description} onChange={set('description')} rows={3} maxLength={DESCRIPTION_MAX + 50} placeholder="What is it, in a sentence or two?" aria-invalid={!!errors.description} aria-describedby={errorId('description')} className={`${field} resize-y`} disabled={state.kind === 'submitting'} />
              <p id={errorId('description')} className={`mt-1 font-sans text-[11px] ${errors.description ? 'text-[#ff9a9a]' : 'text-space-300/55'}`}>
                {errors.description ?? `${fields.description.trim().length}/${DESCRIPTION_MAX}`}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-universe`} className={label}>Suggested universe</label>
                <span className="relative block">
                  <select id={`${id}-universe`} value={fields.requestedUniverseId} onChange={set('requestedUniverseId')} className={`${field} appearance-none pr-8`} disabled={state.kind === 'submitting'}>
                    <option value="" className="bg-[#0b0e1c]">Let the reviewers decide</option>
                    {universes.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#0b0e1c]">{u.name}</option>
                    ))}
                  </select>
                  <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-space-300/70">▾</span>
                </span>
                {errors.requestedUniverseId && <p className="mt-1 font-sans text-[11px] text-[#ff9a9a]">{errors.requestedUniverseId}</p>}
              </div>
              <div>
                <label htmlFor={`${id}-tags`} className={label}>Tags</label>
                <input id={`${id}-tags`} type="text" value={fields.tags} onChange={set('tags')} placeholder="design, tools" aria-invalid={!!errors.tags} aria-describedby={errorId('tags')} className={field} disabled={state.kind === 'submitting'} />
                <p id={errorId('tags')} className={`mt-1 font-sans text-[11px] ${errors.tags ? 'text-[#ff9a9a]' : 'text-space-300/55'}`}>{errors.tags ?? `Comma separated, up to ${MAX_TAGS}.`}</p>
              </div>
            </div>

            {/* Honeypot: hidden from people, tempting to bots. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" onChange={() => undefined} />

            {state.kind === 'failed' && (
              <p role="alert" className="font-sans text-[12px] text-[#ff9a9a]">{state.message}</p>
            )}

            <div className="mt-1 flex items-center justify-end gap-3">
              <button type="button" onClick={closeOverlay} className="rounded-full px-4 py-2 font-sans text-[11px] tracking-[0.18em] uppercase text-space-300/80 transition-colors hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={state.kind === 'submitting' || !!urlCheck?.exists} className={`${ghostButton} border-white/30`}>
                {state.kind === 'submitting' ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
