import { useWebsite } from '../../store/catalogStore'
import { DISCOVERY_MODES } from '../../services/discoveryService'
import { useGalaxyStore } from '../../store/galaxyStore'
import { eyebrow, focusRing, glassPanel } from '../ui/panel'

/**
 * The discovery console: seven ways to let the galaxy choose the next
 * destination. Laid out as a bank of instrument keys rather than a
 * dropdown; modes that need a focused website wait until there is one.
 * Opens from the navigation bar or the D key.
 */
export function DiscoveryMenu() {
  const open = useGalaxyStore((s) => s.overlay === 'discover')
  const startDiscovery = useGalaxyStore((s) => s.startDiscovery)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const lastMode = useGalaxyStore((s) => s.activeDiscoveryMode)
  const current = useWebsite(selectedWebsiteId)

  return (
    <section
      role="dialog"
      aria-label="Discover"
      aria-hidden={!open}
      className={[
        glassPanel,
        'absolute top-16 right-9 z-30 w-[340px] px-3 pt-3 pb-3',
        'max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-20 max-sm:w-auto',
        'transition-[opacity,transform] duration-300 ease-out',
        open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between px-2 pb-2.5">
        <p className={eyebrow}>✨ Discover</p>
        <p className="truncate pl-3 font-sans text-[10.5px] tracking-[0.08em] text-space-300/60">
          {current ? `from ${current.name}` : 'Let the galaxy choose'}
        </p>
      </div>
      <div role="group" aria-label="Discovery modes" className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
        {DISCOVERY_MODES.map((m) => {
          const disabled = m.needsWebsite && !current
          const last = lastMode === m.mode
          return (
            <button
              key={m.mode}
              type="button"
              disabled={disabled || !open}
              onClick={() => startDiscovery(m.mode)}
              title={disabled ? 'Focus a website first' : undefined}
              className={[
                'group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color] duration-300',
                disabled
                  ? 'cursor-not-allowed border-white/[0.04] opacity-45'
                  : 'border-white/[0.08] bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.06]',
                last && !disabled ? 'border-white/25' : '',
                focusRing,
                m.mode === 'universe' ? 'col-span-2' : '',
              ].join(' ')}
            >
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0b0f22]/80 text-[13px] text-white/85 transition-colors group-hover:border-white/30"
              >
                {m.glyph}
              </span>
              <span className="min-w-0">
                <span className="block font-sans text-[12.5px] tracking-[0.04em] text-white">{m.label}</span>
                <span className="block truncate font-sans text-[10.5px] text-space-300/65">
                  {disabled ? 'Focus a website' : m.hint}
                </span>
              </span>
              {last && !disabled && (
                <span aria-label="last used" className="absolute top-2 right-2 h-1 w-1 rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
