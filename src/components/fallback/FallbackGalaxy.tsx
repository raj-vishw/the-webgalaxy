import { useEffect, useMemo, useState } from 'react'
import { useUniverses } from '../../hooks/useUniverses'
import { useWebsites } from '../../hooks/useWebsites'
import { getRelatedWebsites, RELATIONSHIP_LABEL } from '../../services/relationshipService'
import { useCatalogStore } from '../../store/catalogStore'
import { accentFor, urlFor } from '../../utils/celestial'
import { searchGalaxy } from '../../utils/search'
import { EMPTY_FILTERS } from '../../utils/filtering'
import { focusRing } from '../ui/panel'
import { Attribution } from '../ui/Attribution'

interface FallbackGalaxyProps {
  /** Why the list is showing: no WebGL, or the visitor asked for it. */
  reason: 'no-webgl' | 'requested'
}

/**
 * The galaxy as a list: every universe, every website, search and links.
 * Shown when WebGL is unavailable and on request (`?view=list`) — the same
 * catalogue, fully keyboard- and screen-reader-navigable, no 3D required.
 */
export function FallbackGalaxy({ reason }: FallbackGalaxyProps) {
  const { universes } = useUniverses()
  const { websites, status } = useWebsites()
  const source = useCatalogStore((s) => s.source)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    void useCatalogStore.getState().load()
  }, [])

  const results = useMemo(() => (query.trim() ? searchGalaxy(query, websites, universes, EMPTY_FILTERS, 40) : null), [query, websites, universes])

  const list = (items: typeof websites) => (
    <ul className="divide-y divide-white/[0.06]">
      {items.map((w) => {
        const url = urlFor(w)
        const related = open === w.id ? getRelatedWebsites(w.id, 6) : []
        return (
          <li key={w.id} className="py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: accentFor(w) }} />
              <span className="font-sans text-[15px] text-white">{w.name}</span>
              <span className="font-sans text-[11px] tracking-[0.16em] uppercase text-space-300/70">
                {w.objectType}
                {w.isTrending ? ' · trending' : w.isEmerging ? ' · emerging' : ''}
              </span>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className={`font-sans text-[12px] text-space-100/80 underline decoration-white/30 underline-offset-2 hover:text-white ${focusRing}`}>
                  Visit ↗
                </a>
              )}
              <button type="button" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id} className={`font-sans text-[12px] text-space-300/80 hover:text-white ${focusRing}`}>
                {open === w.id ? 'Hide connections' : 'Connections'}
              </button>
            </div>
            {w.description && <p className="mt-1 font-sans text-[13px] leading-5 text-space-100/75">{w.description}</p>}
            {open === w.id && (
              <p className="mt-1 font-sans text-[12px] text-space-300/80">
                {related.length ? related.map((r) => `${r.website.name} (${RELATIONSHIP_LABEL[r.type].toLowerCase()})`).join(', ') : 'This object appears to be travelling alone.'}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <main className="min-h-full overflow-y-auto bg-space-950 px-5 py-10 text-space-100 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <a href="/" className={`font-sans text-[11px] tracking-[0.3em] text-white/85 ${focusRing}`}>
          THE WEBGALAXY
        </a>
        <h1 className="mt-6 font-sans text-[26px] font-light tracking-[0.08em] text-white">Explore the internet as a living universe.</h1>
        <p className="mt-3 font-sans text-[14px] leading-6 text-space-300">
          {reason === 'no-webgl'
            ? 'The WebGalaxy needs WebGL for the full 3D experience, which this browser does not provide. Here is the same galaxy as a list.'
            : 'The galaxy as a list — the same universes and websites, without the 3D scene.'}{' '}
          {reason === 'requested' && (
            <a href="/" className={`underline decoration-white/30 underline-offset-2 hover:text-white ${focusRing}`}>
              Open the 3D galaxy
            </a>
          )}
        </p>
        {status === 'error' && <p role="alert" className="mt-3 font-sans text-[12px] text-space-300/80">The galaxy connection was interrupted — showing {source === 'cache' ? 'the last loaded' : 'the built-in'} catalogue.</p>}

        <label className="mt-8 block">
          <span className="mb-1.5 block font-sans text-[10.5px] tracking-[0.22em] uppercase text-space-300/70">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Websites or universes"
            className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-sans text-[14px] text-white placeholder:text-space-300/40 ${focusRing}`}
          />
        </label>

        {results ? (
          <section aria-label="Search results" className="mt-6">
            {results.universes.length > 0 && (
              <p className="font-sans text-[12px] text-space-300/80">Universes: {results.universes.map((m) => m.universe.name).join(', ')}</p>
            )}
            {results.websites.length ? list(results.websites.map((m) => m.website)) : <p className="mt-4 font-sans text-[14px] text-white/85">Nothing found in this part of the galaxy.</p>}
          </section>
        ) : (
          universes.map((u) => (
            <section key={u.id} aria-labelledby={`u-${u.id}`} className="mt-10">
              <h2 id={`u-${u.id}`} className="font-sans text-[18px] font-light tracking-[0.18em] uppercase text-white">
                {u.name}
              </h2>
              <p className="mt-1 font-sans text-[13px] text-space-300">{u.description}</p>
              <div className="mt-2">{list(websites.filter((w) => w.universeId === u.id))}</div>
            </section>
          ))
        )}
        <Attribution className="mt-10" />
      </div>
    </main>
  )
}
