import { useGalaxyStore } from '../../store/galaxyStore'
import { eyebrow, focusRing, glassPanel } from '../ui/panel'

/**
 * The "discover" menu: lets the galaxy choose a website or a universe for
 * the user. Opens from the navigation bar or the D key.
 */
export function DiscoveryButton() {
  const open = useGalaxyStore((s) => s.overlay === 'discover')
  const startDiscovery = useGalaxyStore((s) => s.startDiscovery)

  const item = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] ${focusRing}`

  return (
    <section
      role="dialog"
      aria-label="Discover"
      aria-hidden={!open}
      className={[
        glassPanel,
        'absolute top-16 right-9 z-30 w-[260px] px-3 pt-3 pb-2',
        'max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-3 max-sm:w-auto',
        'transition-[opacity,transform] duration-300 ease-out',
        open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
      ].join(' ')}
    >
      <p className={`${eyebrow} px-3 pb-2`}>Let the galaxy choose</p>
      <button type="button" onClick={() => startDiscovery('website')} className={item}>
        <span aria-hidden className="text-[14px]">✨</span>
        <span>
          <span className="block font-sans text-[13px] text-white">Discover Something</span>
          <span className="block font-sans text-[11px] text-space-300/70">A random website, anywhere</span>
        </span>
      </button>
      <button type="button" onClick={() => startDiscovery('universe')} className={item}>
        <span aria-hidden className="text-[14px]">✦</span>
        <span>
          <span className="block font-sans text-[13px] text-white">Discover Universe</span>
          <span className="block font-sans text-[11px] text-space-300/70">Travel to a random region</span>
        </span>
      </button>
    </section>
  )
}
