import { Color } from 'three'
import { createRandom } from '../random'
import type { UniverseDefinition } from '../../types/galaxy'
import { ParticleWriter, mixColor } from './buffers'
import type { OrbitBody, UniverseGeometry } from './types'

/** A bright star with concentric dust rings and a few orbiting bodies. */
export function buildPlanetary(def: UniverseDefinition, count: number): UniverseGeometry {
  const rnd = createRandom(def.seed)
  const w = new ParticleWriter(count, rnd)
  const primary = new Color(def.palette.primary)
  const secondary = new Color(def.palette.secondary)

  const ringCount = 2 + Math.floor(rnd.next() * 2)
  const rings = Array.from({ length: ringCount }, (_, i) => 0.38 + (i / (ringCount - 1 || 1)) * 0.55)

  for (let i = 0; i < count; i++) {
    const onRing = rnd.next() < 0.65
    const r = onRing
      ? rings[Math.floor(rnd.next() * ringCount)] + rnd.gaussian() * 0.035
      : rnd.range(0.3, 1)
    const a = rnd.next() * Math.PI * 2
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const y = rnd.gaussian() * 0.012

    const c = mixColor(primary, secondary, rnd.next())
    const alpha = onRing ? rnd.range(0.25, 0.55) : rnd.range(0.08, 0.22)
    w.push(x, y, z, c, rnd.range(0.35, 0.8), alpha)
  }

  const bodies: OrbitBody[] = rings.map((r) => ({
    radius: r,
    speed: 0.12 / Math.pow(r, 1.5),
    phase: rnd.next() * Math.PI * 2,
    inclination: rnd.range(-0.05, 0.05),
    size: rnd.range(2.2, 3.2),
    color: rnd.next() > 0.5 ? def.palette.primary : def.palette.secondary,
  }))

  return {
    ...w.finish(),
    glows: [
      { position: [0, 0, 0], color: def.palette.core, size: 0.32, intensity: 1.6, falloff: 8 },
      { position: [0, 0, 0], color: def.palette.primary, size: 1.4, intensity: 0.14, falloff: 4 },
    ],
    orientation: [rnd.range(0.35, 0.8), rnd.range(0, Math.PI * 2), rnd.range(-0.2, 0.2)],
    spinSpeed: rnd.range(0.02, 0.03),
    bodies,
  }
}
