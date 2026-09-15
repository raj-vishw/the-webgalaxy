import { useGalaxyStore } from '../../store/galaxyStore'

const LINKS = ['Explore', 'Discover', 'About'] as const

/** Minimal floating chrome. The links remain placeholders until later phases. */
export function GalaxyNavigation() {
  const visible = useGalaxyStore((s) => s.intro.chromeVisible)

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
        className="min-w-0 truncate font-sans text-[10px] font-medium tracking-[0.2em] whitespace-nowrap text-white/85 transition-colors hover:text-white sm:text-[12px] sm:tracking-[0.3em]"
        style={{ textShadow: '0 0 16px rgba(190,205,255,0.35)' }}
      >
        THE WEBGALAXY
      </a>
      <nav className="flex shrink-0 items-center gap-3 sm:gap-9">
        {LINKS.map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-sm font-sans text-[10px] tracking-[0.1em] text-space-300 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 sm:text-[12px] sm:tracking-[0.18em]"
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
