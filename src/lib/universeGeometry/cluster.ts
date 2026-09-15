import { Color } from 'three'
import { createRandom } from '../random'
import type { UniverseDefinition } from '../../types/galaxy'
import { ParticleWriter, mixColor } from './buffers'
import type { UniverseGeometry } from './types'

/** A globular cluster: a dense spherical core with a sparse halo. */
export function buildCluster(def: UniverseDefinition, count: number): UniverseGeometry {
  const rnd = createRandom(def.seed)
  const w = new ParticleWriter(count, rnd)
  const core = new Color(def.palette.core)
  const primary = new Color(def.palette.primary)
  const secondary = new Color(def.palette.secondary)

  for (let i = 0; i < count; i++) {
    const [dx, dy, dz] = rnd.onSphere()
    const inHalo = rnd.next() < 0.12
    const r = inHalo ? Math.pow(rnd.next(), 0.5) : Math.min(Math.abs(rnd.gaussian()) * 0.3, 1)

    const bright = rnd.next() < 0.05
    const base = rnd.next() < 0.15 ? secondary : primary
    const c = bright ? core : mixColor(core, base, Math.min(r / 0.25 + 0.2, 1))
    const size = bright ? rnd.range(1.5, 2.4) : rnd.range(0.4, 1.0)
    const alpha = bright ? rnd.range(0.8, 1) : (0.2 + 0.6 * (1 - r)) * rnd.range(0.6, 1)
    w.push(dx * r, dy * r, dz * r, c, size, alpha)
  }

  return {
    ...w.finish(),
    glows: [
      { position: [0, 0, 0], color: def.palette.core, size: 0.75, intensity: 0.45, falloff: 5 },
      { position: [0, 0, 0], color: def.palette.primary, size: 1.9, intensity: 0.08, falloff: 3 },
    ],
    orientation: [0, 0, 0],
    spinSpeed: rnd.range(0.006, 0.012),
  }
}
