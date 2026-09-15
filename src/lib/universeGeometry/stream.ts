import { Color } from 'three'
import { createRandom } from '../random'
import type { UniverseDefinition } from '../../types/galaxy'
import { ParticleWriter, mixColor } from './buffers'
import type { GlowSpec, UniverseGeometry } from './types'

/** An elongated dense star region: a gently curved stellar stream with clumps. */
export function buildStream(def: UniverseDefinition, count: number): UniverseGeometry {
  const rnd = createRandom(def.seed)
  const w = new ParticleWriter(count, rnd)
  const core = new Color(def.palette.core)
  const primary = new Color(def.palette.primary)
  const secondary = new Color(def.palette.secondary)

  const bendA = rnd.range(1.2, 2.2)
  const bendB = rnd.range(0.8, 1.6)
  const clumps = [rnd.range(-0.7, -0.3), rnd.range(-0.15, 0.15), rnd.range(0.3, 0.7)]

  const centerline = (t: number): [number, number, number] => [
    t,
    Math.sin(t * bendA) * 0.16,
    Math.cos(t * bendB) * 0.12 - 0.06,
  ]

  for (let i = 0; i < count; i++) {
    const inClump = rnd.next() < 0.4
    const t = inClump
      ? clumps[Math.floor(rnd.next() * clumps.length)] + rnd.gaussian() * 0.1
      : rnd.range(-1, 1)
    const tt = Math.max(-1, Math.min(1, t))
    const [cx, cy, cz] = centerline(tt)
    const thickness = 0.05 + 0.1 * (1 - tt * tt)
    const x = cx + rnd.gaussian() * thickness * 0.6
    const y = cy + rnd.gaussian() * thickness
    const z = cz + rnd.gaussian() * thickness

    const base = rnd.next() < 0.2 ? secondary : primary
    const c = inClump ? mixColor(core, base, rnd.range(0.2, 0.7)) : base
    const size = inClump ? rnd.range(0.6, 1.3) : rnd.range(0.4, 0.9)
    const alpha = (inClump ? rnd.range(0.5, 0.95) : rnd.range(0.25, 0.65)) * (1 - tt * tt * 0.4)
    w.push(x, y, z, c, size, alpha)
  }

  const glows: GlowSpec[] = clumps.map((t) => ({
    position: centerline(t),
    color: def.palette.core,
    size: 0.45,
    intensity: 0.28,
    falloff: 5,
  }))

  return {
    ...w.finish(),
    glows,
    orientation: [rnd.range(-0.4, 0.4), rnd.range(0, Math.PI * 2), rnd.range(-0.5, 0.5)],
    spinSpeed: 0,
  }
}
