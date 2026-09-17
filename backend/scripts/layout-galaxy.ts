/**
 * `npm run layout [-- --distance=300 --write]`
 *
 * Lays the universes out as a barred spiral galaxy with volume and writes
 * the positions into `src/data/universes.ts`. Each spiral arm is a theme
 * family (technology, culture, life, society) so related universes are
 * neighbours along an arm; the order along an arm follows affinity, never
 * rank — the core is empty glow, nothing sits "above" anything else. A few
 * universes float in a halo above and below the disc so the galaxy has depth.
 *
 * Positions are then relaxed in screen space against the two landscape
 * overview cameras so no two labels collide at rest (the runtime declutter
 * handles every other pose), and the resulting extents are printed so the
 * overview distance in `src/utils/camera.ts` can be checked.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { universes } from '../../src/data/universes.ts'
import { ARM_COUNT, DISC_DEPTH, armAngle, armRadius } from '../../src/utils/galaxyShape.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const FILE = resolve(ROOT, 'src/data/universes.ts')
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=') as [string, string]))
const DISTANCE = Number(args.distance ?? 300)
const WRITE = 'write' in args

/** Theme families, inner → outer along each arm. Every universe must appear exactly once. */
if (ARM_COUNT !== 4) throw new Error('ARMS below assume four arms')
const ARMS: string[][] = [
  ['technology', 'hardware', 'software', 'development', 'ai', 'cybersecurity', 'internet', 'productivity', 'design', 'gaming'],
  ['arts', 'music', 'literature', 'entertainment', 'museums', 'reference', 'education', 'kids', 'communities', 'religion'],
  ['health', 'medicine', 'food', 'home', 'nature', 'travel', 'recreation', 'sports', 'fashion', 'vehicles'],
  ['society', 'news', 'government', 'business', 'finance', 'crypto', 'startups', 'shopping', 'science'],
]
/** Universes lifted out of the disc, and how far (world units). */
const HALO: Record<string, number> = { kids: 26, crypto: -24, nature: 22, religion: -20, gaming: 18, science: -22, travel: 16, design: -14 }

/** Disc thickness (world units) for universes that are not in the halo. */
const THICKNESS = 7

// ─── 1. Spiral seed positions ────────────────────────────────────────────────
const known = new Set(universes.map((u) => u.id))
const placed = new Set<string>()
const positions = new Map<string, [number, number, number]>()
let hash = 17
const jitter = () => ((hash = (hash * 48271) % 2147483647) / 2147483647 - 0.5) * 2
ARMS.forEach((arm, k) => {
  arm.forEach((id, i) => {
    if (!known.has(id)) throw new Error(`unknown universe in layout: ${id}`)
    if (placed.has(id)) throw new Error(`universe listed twice: ${id}`)
    placed.add(id)
    const t = (i + 0.5) / arm.length
    const r = armRadius(t) + jitter() * 6
    const theta = armAngle(k, t) + jitter() * 0.06
    const y = HALO[id] ?? jitter() * THICKNESS
    positions.set(id, [Math.cos(theta) * r, y, Math.sin(theta) * r * DISC_DEPTH])
  })
})
const missing = universes.filter((u) => !placed.has(u.id)).map((u) => u.id)
if (missing.length) throw new Error(`universes not on any arm: ${missing.join(', ')}`)

// ─── 2. Relax label collisions in screen space ───────────────────────────────
const FOV = (50 * Math.PI) / 180
type V3 = [number, number, number]
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l]
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const LAND_DIR = norm([0, 80, 95])
function camera(aspect: number) {
  const f = Math.min(2.2, Math.max(1, 1.7 / aspect))
  const pos: V3 = [LAND_DIR[0] * DISTANCE * f, LAND_DIR[1] * DISTANCE * f, LAND_DIR[2] * DISTANCE * f]
  return { pos, target: [0, 0, 0] as V3, aspect }
}
function project(cam: ReturnType<typeof camera>, p: V3): [number, number] {
  const z = norm(sub(cam.pos, cam.target))
  const x = norm(cross([0, 1, 0], z))
  const y = cross(z, x)
  const d = sub(p, cam.pos)
  const cz = -dot(d, z)
  const t = Math.tan(FOV / 2)
  return [dot(d, x) / (cz * t * cam.aspect), dot(d, y) / (cz * t)]
}
const cams = [
  { cam: camera(1.78), ex: 0.19, ey: 0.07 },
  { cam: camera(1.33), ex: 0.24, ey: 0.07 },
]
const ids = [...positions.keys()]
const P = ids.map((id) => positions.get(id)!)
for (let iter = 0; iter < 3000; iter++) {
  let moved = false
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      const wd = Math.hypot(...sub(P[i], P[j]))
      let push = wd < 27 ? 27 - wd : 0
      for (const { cam, ex, ey } of cams) {
        const a = project(cam, P[i])
        const b = project(cam, P[j])
        const d = Math.hypot((a[0] - b[0]) / ex, (a[1] - b[1]) / ey)
        if (d < 1) push = Math.max(push, (1 - d) * 12)
      }
      if (!push) continue
      moved = true
      const dir = norm(sub(P[i], P[j]))
      // Push apart in the disc plane; depth stays as designed.
      P[i][0] += dir[0] * push * 0.5
      P[i][2] += dir[2] * push * 0.5
      P[j][0] -= dir[0] * push * 0.5
      P[j][2] -= dir[2] * push * 0.5
    }
  }
  if (!moved) break
}
let ndc = [0, 0]
for (const p of P) {
  const a = project(cams[0].cam, p)
  ndc = [Math.max(ndc[0], Math.abs(a[0])), Math.max(ndc[1], Math.abs(a[1]))]
}
const radius = Math.max(...P.map((p) => Math.hypot(p[0], p[2])))
console.log(`[layout] ${P.length} universes on ${ARMS.length} arms · radius ${radius.toFixed(0)} · 16:9 extent x ${ndc[0].toFixed(2)} y ${ndc[1].toFixed(2)} at distance ${DISTANCE}`)

// ─── 3. Write ────────────────────────────────────────────────────────────────
if (WRITE) {
  let source = await readFile(FILE, 'utf8')
  ids.forEach((id, i) => {
    const [x, y, z] = P[i].map(Math.round)
    const pattern = new RegExp(`(id: '${id}',\\n    name: '[^']*',\\n    description: '[^']*',\\n    )position: \\[[^\\]]*\\]`)
    if (!pattern.test(source)) throw new Error(`could not find position of ${id}`)
    source = source.replace(pattern, `$1position: [${x}, ${y}, ${z}]`)
  })
  await writeFile(FILE, source)
  console.log('[layout] positions written to src/data/universes.ts')
} else {
  console.log('[layout] dry run — add --write to update src/data/universes.ts')
}
