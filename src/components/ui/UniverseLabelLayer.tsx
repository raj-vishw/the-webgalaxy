import { labelLayer } from '../../lib/labelLayer'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { UniverseLabel } from './UniverseLabel'

/**
 * The universe names, as one overlay above the canvas. Each name is an
 * absolutely positioned, GPU-composited element that the universe's frame
 * loop moves and fades (see `Universe.tsx`); React only touches this layer
 * when the catalogue or the hovered universe changes.
 */
export function UniverseLabelLayer() {
  const universes = useCatalogStore((s) => s.universes)
  const hoveredId = useGalaxyStore((s) => s.hoveredUniverseId)
  const activeId = useGalaxyStore((s) => s.activeUniverseId)

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {universes.map((u) => (
        <div
          key={u.id}
          ref={(el) => labelLayer.register(u.id, el)}
          className="absolute top-0 left-0 will-change-transform"
          style={{ opacity: 0 }}
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <UniverseLabel name={u.name} hovered={hoveredId === u.id && activeId !== u.id} />
          </div>
        </div>
      ))}
    </div>
  )
}
