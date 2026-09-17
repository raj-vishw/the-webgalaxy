import { useEffect, useState } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { sceneMotion } from '../../lib/sceneMotion'
import { useGalaxyStore } from '../../store/galaxyStore'
import { galaxyNavigation } from '../../utils/navigation'
import { focusRing, glassPanel } from '../ui/panel'
import { Vector3 } from 'three'
import { driftedPosition } from '../../utils/universeDrift'

const W = 176
const H = 116
/** Height of the side-elevation strip under the map (world y → screen). */
const STRIP = 22
const RANGE_Y = 40
const PAD = 14
/** World extent (x/z) the map covers, centred on the layout envelope of `data/universes.ts`. */
const RANGE_X = 215
const RANGE_Z = 150
const CENTER_Z = 0

const scratch = new Vector3()

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
  // The map follows the galaxy's slow rotation and drift; `cam` ticks every 120 ms and is the refresh signal.
  // (computed on every render: the component re-renders every 120 ms with the camera dot)
  const live = new Map<string, { x: number; y: number; z: number }>()
  for (const u of universes) {
    const v = driftedPosition(u, sceneMotion.driftTime, scratch)
    live.set(u.id, { x: v.x, y: v.y, z: v.z })
  }
  const at = (u: { id: string; position: readonly [number, number, number] }) => live.get(u.id) ?? { x: u.position[0], y: u.position[1], z: u.position[2] }

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
        <svg width={W} height={H + STRIP} viewBox={`0 0 ${W} ${H + STRIP}`} role="img" aria-label="Galaxy map">
          {/* Side elevation: where each universe sits above or below the disc. */}
          <line x1={PAD} x2={W - PAD} y1={H + STRIP / 2} y2={H + STRIP / 2} stroke="#ffffff" strokeOpacity={0.12} />
          {universes.map((u) => {
            const v = at(u)
            const x = PAD + ((v.x + RANGE_X) / (2 * RANGE_X)) * (W - PAD * 2)
            const y = H + STRIP / 2 - (Math.max(-RANGE_Y, Math.min(RANGE_Y, v.y)) / RANGE_Y) * (STRIP / 2 - 2)
            return <circle key={`elev-${u.id}`} cx={x} cy={y} r={u.id === activeUniverseId ? 2 : 1.3} fill={u.palette.primary} opacity={0.7} />
          })}
          {universes.map((u) => {
            const p = toMap(at(u).x, at(u).z)
            const active = u.id === activeUniverseId
            return (
              <g key={u.id}>
                <circle cx={p.x} cy={p.y} r={active ? 9 : 6} fill={u.palette.primary} opacity={active ? 0.28 : 0.12} />
                <circle cx={p.x} cy={p.y} r={active ? 3 : 2} fill={active ? '#ffffff' : u.palette.primary} opacity={active ? 1 : 0.85} />
              </g>
            )
          })}
          {selectedUniverse && (
            <circle cx={toMap(at(selectedUniverse).x, at(selectedUniverse).z).x} cy={toMap(at(selectedUniverse).x, at(selectedUniverse).z).y} r={5} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1} />
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
            const p = toMap(at(u).x, at(u).z)
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
