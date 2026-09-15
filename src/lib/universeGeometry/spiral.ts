import { Color } from 'three'
import { createRandom } from '../random'
import type { UniverseDefinition } from '../../types/galaxy'
import { ParticleWriter, mixColor } from './buffers'
import type { UniverseGeometry } from './types'

/** A small spiral galaxy: bright bulge, two or three winding arms, thin disc. */
export function buildSpiral(def: UniverseDefinition, count: number): UniverseGeometry {
  const rnd = createRandom(def.seed)
  const w = new ParticleWriter(count, rnd)
  const core = new Color(def.palette.core)
  const primary = new Color(def.palette.primary)
  const secondary = new Color(def.palette.secondary)

  const arms = rnd.next() > 0.5 ? 2 : 3
  const winding = rnd.range(2.6, 3.6)
  const bulgeShare = 0.22

  for (let i = 0; i < count; i++) {
    if (rnd.next() < bulgeShare) {
      const [dx, dy, dz] = rnd.onSphere()
      const r = Math.abs(rnd.gaussian()) * 0.11
      const c = mixColor(core, primary, Math.min(r / 0.22, 1))
      w.push(dx * r, dy * r * 0.7, dz * r, c, rnd.range(0.6, 1.3), rnd.range(0.45, 0.9))
      continue
    }

    const r = Math.pow(rnd.next(), 0.55)
    const arm = Math.floor(rnd.next() * arms)
    const theta = (arm / arms) * Math.PI * 2 + r * winding
    const spread = 0.03 + 0.14 * r
    const ox = rnd.gaussian() * spread
    const oz = rnd.gaussian() * spread
    const x = Math.cos(theta) * r + ox
    const z = Math.sin(theta) * r + oz
    const y = rnd.gaussian() * (0.035 - 0.02 * r)

    const isAccent = rnd.next() < 0.1
    const base = isAccent ? secondary : primary
    const c = mixColor(core, base, Math.min(r / 0.35, 1))
    const size = isAccent ? rnd.range(1.0, 1.8) : rnd.range(0.45, 1.1)
    const alpha = (0.25 + 0.55 * Math.pow(1 - r, 1.4)) * rnd.range(0.7, 1)
    w.push(x, y, z, c, size, alpha)
  }

  return {
    ...w.finish(),
    glows: [
      { position: [0, 0, 0], color: def.palette.core, size: 0.5, intensity: 0.85, falloff: 6 },
      { position: [0, 0, 0], color: def.palette.primary, size: 2.1, intensity: 0.1, falloff: 3.5 },
    ],
    orientation: [rnd.range(0.45, 0.95), rnd.range(0, Math.PI * 2), rnd.range(-0.3, 0.3)],
    spinSpeed: rnd.range(0.015, 0.025) * (rnd.next() > 0.5 ? 1 : -1),
  }
}
