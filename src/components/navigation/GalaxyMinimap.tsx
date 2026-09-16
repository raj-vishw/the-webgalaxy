import { useEffect, useState } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { sceneMotion } from '../../lib/sceneMotion'
import { useGalaxyStore } from '../../store/galaxyStore'
import { galaxyNavigation } from '../../utils/navigation'
import { focusRing, glassPanel } from '../ui/panel'

const W = 176
const H = 116
const PAD = 14
/** World extent (x/z) the map covers, centred on the layout envelope of `data/universes.ts`. */
const RANGE_X = 180
const RANGE_Z = 110
const CENTER_Z = -36

const toMap = (x: number, z: number) => ({
  x: PAD + ((x + RANGE_X) / (2 * RANGE_X)) * (W - PAD * 2),
  y: PAD + ((z - CENTER_Z + RANGE_Z) / (2 * RANGE_Z)) * (H - PAD * 2),
})

/**
 * Top-down map of the galaxy: universe markers, the camera's position and
 * heading, and the focused website. Clicking a marker travels there.
 */
export function GalaxyMinimap() {
  const visible = useGalaxyStore((s) => s.minimapVisible)
  const setMinimapVisible = useGalaxyStore((s) => s.setMinimapVisible)
  const introDone = useGalaxyStore((s) => s.introPhase === 'complete')
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const universes = useCatalogStore((s) => s.universes)
  const websites = useCatalogStore((s) => s.websites)
  // The info panel owns the right edge while a website is focused; the map steps aside.
  const aside = useGalaxyStore((s) => s.viewMode === 'website')
  const [cam, setCam] = useState(() => ({ ...sceneMotion.camera }))

  // A few samples per second is plenty for a map; no per-frame React work.
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => setCam({ ...sceneMotion.camera }), 120)
    return () => window.clearInterval(id)
  }, [visible])

  const camPoint = toMap(cam.x, cam.z)
  const headingLength = Math.hypot(cam.headingX, cam.headingZ) || 1
  const heading = { x: cam.headingX / headingLength, y: cam.headingZ / headingLength }
  const selected = websites.find((w) => w.id === selectedWebsiteId)
  const selectedUniverse = selected && universes.find((u) => u.id === selected.universeId)

  if (!introDone) return null

  return (
    <div
      className={[
        'absolute right-6 bottom-6 z-10 flex flex-col items-end gap-2 transition-opacity duration-500 sm:right-9 sm:bottom-8',
        aside ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
      aria-hidden={aside}
    >
      <div
        aria-hidden={!visible}
        className={[
          glassPanel,
          'overflow-hidden transition-[opacity,transform] duration-300',
          visible ? 'opacity-100 translate-y-0' : 'pointer-events-none h-0 opacity-0 translate-y-2',
        ].join(' ')}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Galaxy map">
          {universes.map((u) => {
            const p = toMap(u.position[0], u.position[2])
            const active = u.id === activeUniverseId
            return (
              <g key={u.id}>
                <circle cx={p.x} cy={p.y} r={active ? 9 : 6} fill={u.palette.primary} opacity={active ? 0.28 : 0.12} />
                <circle cx={p.x} cy={p.y} r={active ? 3 : 2} fill={active ? '#ffffff' : u.palette.primary} opacity={active ? 1 : 0.85} />
              </g>
            )
          })}
          {selectedUniverse && (
            <circle cx={toMap(selectedUniverse.position[0], selectedUniverse.position[2]).x} cy={toMap(selectedUniverse.position[0], selectedUniverse.position[2]).y} r={5} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1} />
          )}
          <g transform={`translate(${camPoint.x} ${camPoint.y})`}>
            <path
              d={`M ${heading.x * 16} ${heading.y * 16} L ${-heading.y * 6} ${heading.x * 6} L ${heading.y * 6} ${-heading.x * 6} Z`}
              fill="#ffffff"
              opacity={0.12}
            />
            <circle r={2.4} fill="#ffffff" />
          </g>
          {universes.map((u) => {
            const p = toMap(u.position[0], u.position[2])
            return (
              <circle
                key={`hit-${u.id}`}
                cx={p.x}
                cy={p.y}
                r={9}
                fill="transparent"
                role="button"
                tabIndex={visible ? 0 : -1}
                aria-label={`Travel to ${u.name}`}
                className="cursor-pointer outline-none focus-visible:stroke-white/80"
                onClick={() => galaxyNavigation.focusUniverse(u.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    galaxyNavigation.focusUniverse(u.id)
                  }
                }}
              >
                <title>{u.name}</title>
              </circle>
            )
          })}
        </svg>
      </div>
      <button
        type="button"
        onClick={() => setMinimapVisible(!visible)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide galaxy map' : 'Show galaxy map'}
        className={`rounded-full px-2 py-1 font-sans text-[10px] tracking-[0.2em] uppercase text-space-300/60 transition-colors hover:text-white ${focusRing}`}
      >
        {visible ? 'Map ▾' : 'Map ▴'}
      </button>
    </div>
  )
}
