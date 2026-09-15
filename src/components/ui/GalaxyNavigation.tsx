import { useGalaxyStore } from '../../store/galaxyStore'
import { hasActiveFilters } from '../../utils/filtering'
import { focusRing } from './panel'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Minimal floating chrome: wordmark plus the discovery entry points. */
export function GalaxyNavigation() {
  const visible = useGalaxyStore((s) => s.intro.chromeVisible)
  const overlay = useGalaxyStore((s) => s.overlay)
  const filtersActive = useGalaxyStore((s) => hasActiveFilters(s.filters))
  const toggleOverlay = useGalaxyStore((s) => s.toggleOverlay)

  const link = (label: string, kind: 'navigator' | 'discover' | 'search' | 'filters' | 'submit', hint?: string) => (
    <button
      key={kind}
      type="button"
      onClick={() => toggleOverlay(kind)}
      aria-pressed={overlay === kind}
      className={[
        'relative rounded-sm font-sans text-[10px] tracking-[0.1em] transition-colors duration-300 sm:text-[12px] sm:tracking-[0.18em]',
        overlay === kind ? 'text-white' : 'text-space-300 hover:text-white',
        focusRing,
      ].join(' ')}
    >
      {label}
      {hint && <kbd aria-hidden className="ml-1.5 hidden rounded border border-white/15 px-1 font-sans text-[9px] text-space-300/60 sm:inline">{hint}</kbd>}
      {kind === 'filters' && filtersActive && (
        <span aria-label="filters active" className="absolute -top-1 -right-2 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}
    </button>
  )

  return (
    <header
      className={[
        'absolute inset-x-0 top-0 z-20 flex items-center justify-between',
        'gap-3 px-5 py-5 sm:px-9 sm:py-7',
        'transition-opacity duration-[1600ms] ease-out',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <a
        href="/"
        className={`min-w-0 truncate font-sans text-[10px] max-sm:sr-only font-medium tracking-[0.2em] whitespace-nowrap text-white/85 transition-colors hover:text-white sm:text-[12px] sm:tracking-[0.3em] ${focusRing}`}
        style={{ textShadow: '0 0 16px rgba(190,205,255,0.35)' }}
      >
        THE WEBGALAXY
      </a>
      <nav aria-label="Discovery" className="flex shrink-0 items-center gap-3 sm:gap-7">
        {link('Explore', 'navigator')}
        {link('Discover', 'discover')}
        {link('Search', 'search', isMac ? '⌘K' : '/')}
        {link('Filter', 'filters')}
        {link('+ Add', 'submit')}
      </nav>
    </header>
  )
}
