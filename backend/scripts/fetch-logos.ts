/**
 * `npm run logos [-- --refresh --concurrency=8]`
 *
 * Collects a favicon for every website in the bundled catalogue (curated +
 * directory) and packs them into one small texture atlas per universe:
 *
 *   content/logos/<slug>.png          raw icons as fetched (cache, git-ignored)
 *   public/logos/<universe>.png       64 px cells, one atlas per universe
 *   public/logos/manifest.json        which cell holds which website
 *
 * The scene draws a site's icon as the emblem on its body and as the face of
 * its medallion when it is a minor site; anything without an icon falls back
 * to the monogram, so this step is optional and can be re-run any time.
 * Icons come from the site's own favicon via Google's favicon service, with
 * DuckDuckGo's as a fallback; unknown sites yield nothing rather than a
 * placeholder globe.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Jimp, ResizeStrategy } from 'jimp'
import { directoryWebsites } from '../../src/data/directory.ts'
import { universes } from '../../src/data/universes.ts'
import { websites as curated } from '../../src/data/websites.ts'
import type { WebsiteDefinition } from '../../src/types/galaxy.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const CACHE = resolve(ROOT, 'content/logos')
const OUT = resolve(ROOT, 'public/logos')
const CELL = 64
/** Icon drawn inside the cell, leaving a transparent margin for the disc and ring. */
const ICON = 52

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=') as [string, string]))
const REFRESH = 'refresh' in args
const CONCURRENCY = Number(args.concurrency ?? 8)

const log = (message: string, extra: Record<string, unknown> = {}) => console.log(`[logos] ${message}`, Object.keys(extra).length ? extra : '')

function hostOf(website: WebsiteDefinition): string | null {
  try {
    return website.url ? new URL(website.url).hostname.replace(/^www\./, '') : null
  } catch {
    return null
  }
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false)
}

async function fetchIcon(host: string): Promise<Buffer | null> {
  const sources = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
  ]
  for (const url of sources) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12_000) })
      if (!res.ok) continue
      const bytes = Buffer.from(await res.arrayBuffer())
      // Must decode as an image (some ".ico" answers are real ICO files, which we skip).
      const image = await Jimp.read(bytes).catch(() => null)
      if (!image || image.width < 8) continue
      return bytes
    } catch {
      // try the next source
    }
  }
  return null
}

// ─── 1. Fetch (cached) ───────────────────────────────────────────────────────
await mkdir(CACHE, { recursive: true })
await mkdir(OUT, { recursive: true })
const all = [...curated, ...directoryWebsites]
const queue = all.filter((w) => hostOf(w))
let fetched = 0, cached = 0, missing = 0
const missingFile = resolve(CACHE, '.missing.json')
const known: Record<string, number> = await readFile(missingFile, 'utf8').then(JSON.parse, () => ({}))

async function worker() {
  while (queue.length) {
    const w = queue.shift()!
    const file = resolve(CACHE, `${w.id}.png`)
    if (!REFRESH && (await exists(file))) {
      cached++
      continue
    }
    // Sites that had no icon last time are retried only every ~30 days.
    if (!REFRESH && known[w.id] && Date.now() - known[w.id] < 30 * 86_400_000) {
      missing++
      continue
    }
    const bytes = await fetchIcon(hostOf(w)!)
    if (bytes) {
      await writeFile(file, bytes)
      delete known[w.id]
      fetched++
    } else {
      known[w.id] = Date.now()
      missing++
    }
    if ((fetched + missing) % 50 === 0) log('progress', { fetched, missing, cached, left: queue.length })
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
await writeFile(missingFile, JSON.stringify(known, null, 1))
log('icons', { fetched, cached, missing })

// ─── 2. Pack one atlas per universe ──────────────────────────────────────────
interface UniverseAtlas {
  file: string
  columns: number
  slots: Record<string, number>
}
const manifest: { cell: number; universes: Record<string, UniverseAtlas> } = { cell: CELL, universes: {} }
for (const universe of universes) {
  const members = all.filter((w) => w.universeId === universe.id)
  const icons: { slug: string; image: Awaited<ReturnType<typeof Jimp.read>> }[] = []
  for (const w of members) {
    const file = resolve(CACHE, `${w.id}.png`)
    if (!(await exists(file))) continue
    const image = await Jimp.read(file).catch(() => null)
    if (!image) continue
    icons.push({ slug: w.id, image })
  }
  if (!icons.length) continue
  const columns = Math.ceil(Math.sqrt(icons.length))
  const rows = Math.ceil(icons.length / columns)
  const atlas = new Jimp({ width: columns * CELL, height: rows * CELL, color: 0x00000000 })
  const slots: Record<string, number> = {}
  icons.forEach(({ slug, image }, i) => {
    // Fit inside the icon box, keep aspect, centre in the cell.
    const scale = Math.min(ICON / image.width, ICON / image.height)
    image.resize({ w: Math.max(1, Math.round(image.width * scale)), h: Math.max(1, Math.round(image.height * scale)), mode: ResizeStrategy.BICUBIC })
    const x = (i % columns) * CELL + Math.round((CELL - image.width) / 2)
    const y = Math.floor(i / columns) * CELL + Math.round((CELL - image.height) / 2)
    atlas.composite(image, x, y)
    slots[slug] = i
  })
  const file = `${universe.id}.png`
  await writeFile(resolve(OUT, file), await atlas.getBuffer('image/png'))
  manifest.universes[universe.id] = { file, columns, slots }
  log(`atlas ${universe.id}`, { icons: icons.length, of: members.length, size: `${columns * CELL}×${rows * CELL}` })
}
await writeFile(resolve(OUT, 'manifest.json'), JSON.stringify(manifest))
log('written', { dir: 'public/logos', universes: Object.keys(manifest.universes).length })
