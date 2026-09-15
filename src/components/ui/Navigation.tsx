import { useGalaxyStore } from '../../store/galaxyStore'

const LINKS = ['Explore', 'Discover', 'About'] as const

/** Minimal floating chrome. Links are placeholders in Phase 1. */
export function Navigation() {
  const visible = useGalaxyStore((s) => s.intro.chromeVisible)

  return (
    <header
      className={[
        'absolute inset-x-0 top-0 z-20 flex items-center justify-between',
        'px-5 py-5 sm:px-9 sm:py-7',
        'transition-opacity duration-[1600ms] ease-out',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <a
        href="/"
        className="font-sans text-[11px] font-medium tracking-[0.26em] whitespace-nowrap text-white/85 transition-colors hover:text-white sm:text-[12px] sm:tracking-[0.3em]"
        style={{ textShadow: '0 0 16px rgba(190,205,255,0.35)' }}
      >
        THE WEBGALAXY
      </a>
      <nav className="flex items-center gap-4 sm:gap-9">
        {LINKS.map((label) => (
          <button
            key={label}
            type="button"
            className="font-sans text-[11px] tracking-[0.14em] text-space-300 transition-colors duration-300 hover:text-white sm:text-[12px] sm:tracking-[0.18em]"
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
