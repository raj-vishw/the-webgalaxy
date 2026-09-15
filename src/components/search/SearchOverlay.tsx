import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { featuredWebsiteIds, searchSuggestions } from '../../data/featured'
import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { useGalaxyStore } from '../../store/galaxyStore'
import { accentFor } from '../../utils/celestial'
import { galaxyNavigation } from '../../utils/navigation'
import { searchGalaxy, type SearchMatch } from '../../utils/search'
import { eyebrow, focusRing, glassPanel } from '../ui/panel'
import { CelestialIcon } from './CelestialIcon'
import { SearchInput } from './SearchInput'
import { SearchResults } from './SearchResults'

/**
 * Floating search surface. Results are computed from the local dataset on
 * every keystroke (cheap), and choosing one becomes a physical journey — the
 * same store action a click on the 3D object would trigger.
 */
export function SearchOverlay() {
  const open = useGalaxyStore((s) => s.overlay === 'search')
  const query = useGalaxyStore((s) => s.searchQuery)
  const filters = useGalaxyStore((s) => s.filters)
  const setSearchQuery = useGalaxyStore((s) => s.setSearchQuery)
  const closeOverlay = useGalaxyStore((s) => s.closeOverlay)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => searchGalaxy(query, websites, universes, filters), [query, filters])
  const flat = useMemo<SearchMatch[]>(() => [...results.universes, ...results.websites], [results])
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
      return () => window.clearTimeout(timer)
    }
    // Hand focus back to the page so shortcuts and typing don't land in a hidden field.
    inputRef.current?.blur()
  }, [open])

  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setActiveIndex(0)
  }

  const choose = (match: SearchMatch) => {
    closeOverlay()
    setSearchQuery('')
    if (match.kind === 'website') galaxyNavigation.focusWebsite(match.website.id)
    else galaxyNavigation.focusUniverse(match.universe.id)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const match = flat[activeIndex]
      if (match) choose(match)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeOverlay()
    }
  }

  const optionId = (index: number) => `${listboxId}-option-${index}`
  const featured = featuredWebsiteIds.map((id) => websites.find((w) => w.id === id)).filter((w) => !!w)

  return (
    <div
      aria-hidden={!open}
      className={[
        'absolute inset-0 z-40 flex items-start justify-center',
        'transition-opacity duration-300',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <button type="button" aria-label="Close search" onClick={closeOverlay} className="absolute inset-0 cursor-default bg-[#020308]/45" tabIndex={-1} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search the WebGalaxy"
        className={[
          glassPanel,
          'relative mx-3 mt-3 w-full max-w-[560px] sm:mx-6 sm:mt-24',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : '-translate-y-2',
        ].join(' ')}
      >
        <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
          <p className={`${eyebrow} mb-3`}>◉ Search the WebGalaxy</p>
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setSearchQuery}
            onKeyDown={onKeyDown}
            onClear={() => setSearchQuery('')}
            listboxId={listboxId}
            activeOptionId={hasQuery && flat[activeIndex] ? optionId(activeIndex) : undefined}
          />
        </div>

        <div className="px-2 pb-2 sm:px-3">
          {hasQuery ? (
            <SearchResults
              results={results}
              flat={flat}
              listboxId={listboxId}
              activeIndex={activeIndex}
              optionId={optionId}
              onSelect={choose}
              onHover={setActiveIndex}
              onClear={() => setSearchQuery('')}
            />
          ) : (
            <div className="grid gap-4 px-3 pt-1 pb-4 sm:grid-cols-[1.1fr_1fr]">
              <div>
                <p className={`${eyebrow} pb-2`}>Universes</p>
                <ul className="flex flex-wrap gap-1.5">
                  {universes.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          closeOverlay()
                          galaxyNavigation.focusUniverse(u.id)
                        }}
                        className={`rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 font-sans text-[12px] text-white/85 transition-colors hover:border-white/35 hover:bg-white/[0.08] hover:text-white ${focusRing}`}
                      >
                        {u.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className={`${eyebrow} pt-4 pb-2`}>Try searching for</p>
                <ul className="flex flex-wrap gap-1.5">
                  {searchSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setSearchQuery(s)}
                        className={`rounded-full px-2.5 py-1 font-sans text-[12px] text-space-300 transition-colors hover:text-white ${focusRing}`}
                      >
                        “{s}”
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className={`${eyebrow} pb-1`}>✦ Featured in the WebGalaxy</p>
                <ul>
                  {featured.map((w) => {
                    const universe = universes.find((u) => u.id === w.universeId)
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          onClick={() => {
                            closeOverlay()
                            galaxyNavigation.focusWebsite(w.id)
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/[0.04] ${focusRing}`}
                        >
                          <CelestialIcon type={w.objectType} accent={accentFor(w)} />
                          <span className="min-w-0">
                            <span className="block truncate font-sans text-[13px] text-white">{w.name}</span>
                            <span className="block truncate font-sans text-[10.5px] tracking-[0.08em] text-space-300/70">
                              {universe?.name}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
