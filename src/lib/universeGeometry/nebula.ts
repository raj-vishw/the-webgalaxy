import { Color } from 'three'
import { createRandom } from '../random'
import type { UniverseDefinition } from '../../types/galaxy'
import { ParticleWriter, mixColor } from './buffers'
import type { GlowSpec, UniverseGeometry } from './types'

/** A diffuse nebula: several soft overlapping lobes with embedded young stars. */
export function buildNebula(def: UniverseDefinition, count: number): UniverseGeometry {
  const rnd = createRandom(def.seed)
  const w = new ParticleWriter(count, rnd)
  const core = new Color(def.palette.core)
  const primary = new Color(def.palette.primary)
  const secondary = new Color(def.palette.secondary)

  const lobeCount = 4 + Math.floor(rnd.next() * 3)
  const lobes = Array.from({ length: lobeCount }, () => {
    const [dx, dy, dz] = rnd.onSphere()
    const d = rnd.range(0.1, 0.5)
    return {
      center: [dx * d, dy * d * 0.6, dz * d] as const,
      sigma: [rnd.range(0.18, 0.4), rnd.range(0.12, 0.28), rnd.range(0.18, 0.4)] as const,
      tint: rnd.next(),
    }
  })

  for (let i = 0; i < count; i++) {
    const lobe = lobes[Math.floor(rnd.next() * lobeCount)]
    const x = lobe.center[0] + rnd.gaussian() * lobe.sigma[0]
    const y = lobe.center[1] + rnd.gaussian() * lobe.sigma[1]
    const z = lobe.center[2] + rnd.gaussian() * lobe.sigma[2]

    const isStar = rnd.next() < 0.14
    if (isStar) {
      const c = mixColor(core, primary, rnd.range(0, 0.4))
      w.push(x, y, z, c, rnd.range(0.5, 1.2), rnd.range(0.5, 1))
    } else {
      // Large, faint particles overlap into a cloud rather than reading as points.
      const c = mixColor(primary, secondary, lobe.tint * 0.7 + rnd.next() * 0.3)
      w.push(x, y, z, c, rnd.range(1.8, 4.2), rnd.range(0.035, 0.11))
    }
  }

  const glows: GlowSpec[] = lobes.slice(0, 4).map((lobe) => ({
    position: lobe.center,
    color: lobe.tint > 0.5 ? def.palette.secondary : def.palette.primary,
    size: rnd.range(1.1, 1.7),
    intensity: rnd.range(0.09, 0.15),
    falloff: 4,
  }))

  return {
    ...w.finish(),
    glows,
    orientation: [rnd.range(-0.3, 0.3), rnd.range(0, Math.PI * 2), rnd.range(-0.3, 0.3)],
    spinSpeed: rnd.range(0.004, 0.008),
  }
}
