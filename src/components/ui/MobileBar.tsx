import { useState } from 'react'
import { useGalaxyStore } from '../../store/galaxyStore'
import { focusRing, glassPanel } from './panel'

/**
 * Touch controls for small screens: the few things that matter — back,
 * search, discover — plus a "more" sheet for the rest. Replaces the desktop
 * header links below the `sm` breakpoint; never a shrunken desktop bar.
 */
export function MobileBar() {
  const chrome = useGalaxyStore((s) => s.intro.chromeVisible)
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const overlay = useGalaxyStore((s) => s.overlay)
  const discovering = useGalaxyStore((s) => s.discovery.phase !== 'idle')
  const goBack = useGalaxyStore((s) => s.goBack)
  const toggleOverlay = useGalaxyStore((s) => s.toggleOverlay)
  const minimapVisible = useGalaxyStore((s) => s.minimapVisible)
  const setMinimapVisible = useGalaxyStore((s) => s.setMinimapVisible)
  const [more, setMore] = useState(false)
  const visible = chrome && !discovering

  const key = `flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 font-sans text-[10px] tracking-[0.16em] uppercase transition-colors ${focusRing}`
  const item = (label: string, glyph: string, onClick: () => void, active = false, disabled = false) => (
    <button key={label} type="button" onClick={onClick} disabled={disabled || !visible} aria-pressed={active} className={`${key} ${active ? 'text-white' : 'text-space-300/85'} disabled:opacity-35`}>
      <span aria-hidden className="text-[16px] leading-none">{glyph}</span>
      {label}
    </button>
  )

  return (
    <nav
      aria-label="Controls"
      aria-hidden={!visible}
      className={['absolute inset-x-3 bottom-3 z-20 sm:hidden', 'transition-[opacity,transform] duration-500', visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'].join(' ')}
    >
      {more && overlay === null && (
        <div className={`${glassPanel} mb-2 grid grid-cols-5 gap-1 px-2 py-2`} role="group" aria-label="More controls">
          {item('Explore', '◎', () => { setMore(false); toggleOverlay('navigator') })}
          {item('Filter', '⌥', () => { setMore(false); toggleOverlay('filters') })}
          {item('Add', '+', () => { setMore(false); toggleOverlay('submit') })}
          {item('Map', '▦', () => setMinimapVisible(!minimapVisible), minimapVisible)}
          {item('Help', '?', () => { setMore(false); toggleOverlay('help') })}
        </div>
      )}
      <div className={`${glassPanel} flex items-center justify-around px-2 py-1`}>
        {item('Back', '←', goBack, false, viewMode === 'galaxy' && overlay === null)}
        {item('Search', '◉', () => toggleOverlay('search'), overlay === 'search')}
        {item('Discover', '✨', () => toggleOverlay('discover'), overlay === 'discover')}
        {item('More', '⋯', () => setMore((v) => !v), more)}
      </div>
    </nav>
  )
}
