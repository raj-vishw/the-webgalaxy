import { universes } from '../../data/universes'
import { useGalaxyStore } from '../../store/galaxyStore'

/**
 * Where the camera is: a back link and the current universe name, under the
 * wordmark. Hidden at the galaxy overview.
 */
export function ExplorationContext() {
  const mode = useGalaxyStore((s) => s.explorationMode)
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const leaveUniverse = useGalaxyStore((s) => s.leaveUniverse)
  const universe = universes.find((u) => u.id === activeUniverseId)
  const visible = mode !== 'galaxy' && !!universe

  return (
    <div
      className={[
        'absolute top-14 left-5 z-20 flex items-center gap-3 sm:top-16 sm:left-9',
        'font-sans text-[11px] tracking-[0.18em] uppercase',
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={leaveUniverse}
        className="text-space-300/80 transition-colors hover:text-white"
      >
        ← The WebGalaxy
      </button>
      <span className="text-space-300/40">/</span>
      <span className="text-white/85" style={{ textShadow: '0 0 12px rgba(190,205,255,0.35)' }}>
        {universe?.name}
      </span>
    </div>
  )
}
