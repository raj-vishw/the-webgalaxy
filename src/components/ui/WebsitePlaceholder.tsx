import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { useGalaxyStore } from '../../store/galaxyStore'

/**
 * Minimal focus state for a selected website. The real information panel
 * arrives in a later phase; for now "Continue" simply releases the focus.
 */
export function WebsitePlaceholder() {
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const clearWebsite = useGalaxyStore((s) => s.clearWebsite)
  const website = websites.find((w) => w.id === selectedWebsiteId)
  const universe = website && universes.find((u) => u.id === website.universeId)
  const visible = !!website

  return (
    <div
      className={[
        'absolute inset-x-0 bottom-16 z-20 flex justify-center px-6 sm:bottom-20',
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-3',
      ].join(' ')}
    >
      <div
        className="w-full max-w-[300px] rounded-2xl border border-white/10 bg-[#070a18]/55 px-7 py-6 text-center backdrop-blur-md"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 20px 60px rgba(0,0,0,0.45)' }}
      >
        <p
          className="font-sans text-[17px] font-medium tracking-[0.06em] text-white"
          style={{ textShadow: '0 0 18px rgba(190,205,255,0.35)' }}
        >
          {website?.name ?? ''}
        </p>
        <p className="mt-2 font-sans text-[11px] tracking-[0.2em] uppercase text-space-300">
          {universe ? `${universe.name} Universe` : ''}
        </p>
        <button
          type="button"
          onClick={clearWebsite}
          className={[
            'mt-6 inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2',
            'font-sans text-[11px] tracking-[0.2em] uppercase text-white/85',
            'transition-colors duration-300 hover:border-white/40 hover:text-white',
          ].join(' ')}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
