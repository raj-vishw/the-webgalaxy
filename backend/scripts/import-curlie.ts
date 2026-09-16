/**
 * `npm run import:curlie [-- --per-universe=50 --max-rank=150000]`
 *
 * Builds `src/data/directory.ts` — the imported part of the catalogue — from
 * two free datasets that must be unpacked under `content/` (git-ignored):
 *
 *   content/curlie-rdf/rdf-*-c.tsv, rdf-*-s.tsv   the Curlie.org directory dump
 *                                                (curlie.org/download, CC BY 3.0)
 *   content/top-1m.csv                            the Tranco popularity list
 *                                                (tranco-list.eu, no sign-up)
 *
 * Curlie provides the category tree plus an editorial title and description
 * for every website; Tranco provides a popularity rank. Only English topic
 * categories are used — Regional, World (other languages) and Adult are
 * never read. Each Curlie category maps to one universe (`UNIVERSE_RULES`);
 * inside a universe the best-ranked sites are taken round-robin across the
 * second-level categories so every universe stays varied rather than being
 * dominated by its single biggest topic.
 *
 * The output is deterministic for a given input, so re-running after a fresh
 * dump only changes what actually changed. Hand-curated websites in
 * `src/data/websites.ts` are never touched and always win over an import of
 * the same host.
 */
import { createReadStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { universes } from '../../src/data/universes.ts'
import { websites as curated } from '../../src/data/websites.ts'
import type { CelestialObjectType, WebsiteDefinition, WebsiteRelationship } from '../../src/types/galaxy.ts'
import { hashString, slugify } from '../src/utils/slug.ts'
import { parseWebsiteUrl } from '../src/utils/url.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const CONTENT = resolve(ROOT, 'content')
const OUTPUT = resolve(ROOT, 'src/data/directory.ts')

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=') as [string, string]))
const PER_UNIVERSE = Number(args['per-universe'] ?? 50)
const MAX_RANK = Number(args['max-rank'] ?? 150_000)
/** Only these Curlie files hold English topic categories. */
const FILES = ['Top', 'Arts', 'Business', 'KT', 'Society']

/**
 * Curlie category prefix → universe id. The first matching rule wins, so the
 * specific entries come before the broad ones. Anything unmatched is skipped.
 */
const UNIVERSE_RULES: [prefix: string, universe: string][] = [
  ['Computers/Artificial_Intelligence', 'ai'],
  ['Computers/Robotics', 'ai'],
  ['Computers/Artificial_Life', 'ai'],
  ['Computers/Speech_Technology', 'ai'],
  ['Computers/Security', 'cybersecurity'],
  ['Computers/Hacking', 'cybersecurity'],
  ['Computers/Programming', 'development'],
  ['Computers/Open_Source', 'development'],
  ['Computers/Computer_Science', 'development'],
  ['Computers/Algorithms', 'development'],
  ['Computers/Data_Formats', 'development'],
  ['Computers/Software/Operating_Systems', 'development'],
  ['Computers/Graphics', 'design'],
  ['Computers/CAD_and_CAM', 'design'],
  ['Arts/Design', 'design'],
  ['Arts/Graphic_Design', 'design'],
  ['Arts/Architecture', 'design'],
  ['Arts/Illustration', 'design'],
  ['Arts/Photography', 'design'],
  ['Arts/Digital', 'design'],
  ['Arts/Music', 'music'],
  ['Shopping/Music', 'music'],
  ['Arts/Movies', 'entertainment'],
  ['Arts/Television', 'entertainment'],
  ['Arts/Animation', 'entertainment'],
  ['Arts/Comics', 'entertainment'],
  ['Arts/Radio', 'entertainment'],
  ['Arts/Entertainment', 'entertainment'],
  ['Arts/Video', 'entertainment'],
  ['Arts/People', 'entertainment'],
  ['Recreation/Humor', 'entertainment'],
  ['Games/', 'gaming'],
  ['Reference/Education', 'education'],
  ['Computers/Education', 'education'],
  ['Arts/Education', 'education'],
  ['Business/Investing', 'finance'],
  ['Business/Financial_Services', 'finance'],
  ['Business/Accounting', 'finance'],
  ['Home/Personal_Finance', 'finance'],
  ['Science/Social_Sciences/Economics', 'finance'],
  ['Home/Cooking', 'food'],
  ['Recreation/Food', 'food'],
  ['Shopping/Food', 'food'],
  ['Recreation/Travel', 'travel'],
  ['Business/Hospitality', 'travel'],
  ['Computers/', 'technology'],
  ['Science/', 'science'],
  ['Arts/', 'arts'],
  ['Business/', 'business'],
  ['Health/', 'health'],
  ['Home/', 'home'],
  ['Kids_and_Teens/', 'kids'],
  ['News/', 'news'],
  ['Recreation/', 'recreation'],
  ['Reference/', 'reference'],
  ['Shopping/', 'shopping'],
  ['Society/', 'society'],
  ['Sports/', 'sports'],
]

/** Hosts that are platforms hosting many unrelated sites — never a "website" of their own here. */
const PLATFORM_HOSTS = /(^|\.)(angelfire\.com|tripod\.com|geocities\.com|blogspot\.com|wordpress\.com|wixsite\.com|weebly\.com|google\.com|yahoo\.com|facebook\.com|youtube\.com|wikipedia\.org|amazon\.com|apple\.com|microsoft\.com)$/

interface Candidate {
  host: string
  url: string
  title: string
  description: string
  path: string
  rank: number
}

function log(message: string, extra: Record<string, unknown> = {}) {
  console.log(`[import] ${message}`, Object.keys(extra).length ? extra : '')
}

async function* rows(file: string, separator = '\t'): AsyncGenerator<string[]> {
  const reader = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of reader) if (line) yield line.split(separator)
}

function universeFor(path: string): string | null {
  for (const [prefix, universe] of UNIVERSE_RULES) if (path.startsWith(prefix)) return universe
  return null
}

function hostOf(url: string): { host: string; root: boolean } | null {
  const parsed = parseWebsiteUrl(url)
  if (!parsed) return null
  const u = new URL(parsed.href)
  return { host: u.hostname.replace(/^www\./, '').toLowerCase(), root: u.pathname === '/' && !u.search }
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Short display name: the part before a separator if the title is long, capped at 48 characters. */
function nameFrom(title: string): string {
  let name = cleanText(title).replace(/\s*[-–—|:]\s*(official (web)?site|home ?page|welcome).*$/i, '')
  if (name.length > 40) {
    const head = name.split(/\s+[-–—|:]\s+/)[0]
    if (head.length >= 3) name = head
  }
  if (name.length > 48) name = `${name.slice(0, 47).replace(/\s+\S*$/, '')}…`
  return name
}

/** One or two sentences, at most 280 characters. */
function descriptionFrom(value: string): string {
  const text = cleanText(value)
  if (text.length <= 280) return text
  const cut = text.slice(0, 280)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '))
  return end > 120 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`
}

/** 100 for the #1 site, ~76 at #100, ~52 at #10 000, ~40 at #100 000. */
function importanceFrom(rank: number): number {
  return Math.round(Math.min(96, Math.max(30, 100 - 12 * Math.log10(rank))))
}

/** Category segments as tags: "Arts/Music/Jazz" → ["music", "jazz"]. */
function tagsFrom(path: string): string[] {
  return [...new Set(path.split('/').slice(1, 4).map((s) => s.replace(/_/g, ' ').toLowerCase()).filter((s) => s.length <= 40))]
}

/** Slug from the host: nytimes.com → nytimes; bbc.co.uk → bbc; clashes get the full host. */
function slugFor(host: string, taken: Set<string>): string {
  const parts = host.split('.')
  const second = parts.length > 2 && /^(co|com|org|net|ac|gov|edu)$/.test(parts[parts.length - 2]) ? 3 : 2
  const base = slugify(parts.slice(0, -second + 1).join('-').replace(/^(www|en)-/, '') || parts[0]) || slugify(host)
  let slug = base
  if (taken.has(slug)) slug = slugify(host)
  let n = 2
  while (taken.has(slug)) slug = `${slugify(host)}-${n++}`
  taken.add(slug)
  return slug
}

/** Accent colour: the universe's primary hue, varied a little per website. */
function accentFor(universeId: string, slug: string): string {
  const palette = universes.find((u) => u.id === universeId)?.palette.primary ?? '#9db4ff'
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(palette.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = ((h * 60 + 360) % 360 + ((hashString(slug) % 61) - 30) + 360) % 360
  const s = 0.5 + (hashString(`${slug}s`) % 25) / 100
  const l = 0.62 + (hashString(`${slug}l`) % 12) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return `#${[r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`
}

// ─── Read Tranco ─────────────────────────────────────────────────────────────
const rank = new Map<string, number>()
for await (const [r, host] of rows(resolve(CONTENT, 'top-1m.csv'), ',')) {
  const n = Number(r)
  if (n <= MAX_RANK) rank.set(host.trim(), n)
}
log('tranco ranks loaded', { hosts: rank.size, maxRank: MAX_RANK })

// ─── Read Curlie categories, then websites ───────────────────────────────────
const categories = new Map<string, string>()
for (const f of FILES) for await (const [id, path] of rows(resolve(CONTENT, `curlie-rdf/rdf-${f}-s.tsv`))) if (id && path) categories.set(id, path)
log('curlie categories loaded', { categories: categories.size })

const curatedHosts = new Set(curated.map((w) => (w.url ? hostOf(w.url)?.host : null)).filter(Boolean) as string[])
/** One entry per host across the whole directory: its most specific listing decides the universe. */
const byHost = new Map<string, Candidate & { universe: string }>()
let scanned = 0
for (const f of FILES) {
  for await (const [url, title, description, categoryId] of rows(resolve(CONTENT, `curlie-rdf/rdf-${f}-c.tsv`))) {
    scanned++
    const path = categories.get(categoryId)
    if (!path || !url || !title) continue
    const universe = universeFor(path)
    if (!universe) continue
    const target = hostOf(url)
    if (!target || !target.root || PLATFORM_HOSTS.test(target.host) || curatedHosts.has(target.host)) continue
    const r = rank.get(target.host)
    if (!r) continue
    const existing = byHost.get(target.host)
    if (!existing || path.split('/').length > existing.path.split('/').length) {
      byHost.set(target.host, { host: target.host, url: url.trim(), title, description, path, rank: r, universe })
    }
  }
}
const byUniverse = new Map<string, Map<string, Candidate>>()
for (const c of byHost.values()) {
  const pool = byUniverse.get(c.universe) ?? new Map<string, Candidate>()
  pool.set(c.host, c)
  byUniverse.set(c.universe, pool)
}
log('curlie websites scanned', { scanned, candidates: [...byUniverse.values()].reduce((n, m) => n + m.size, 0) })

// ─── Select per universe: round-robin over second-level categories by rank ──
const taken = new Set(curated.map((w) => w.id))
const selected: (WebsiteDefinition & { path: string; rank: number })[] = []
for (const universe of universes) {
  const pool = byUniverse.get(universe.id)
  if (!pool) {
    log('no candidates for universe', { universe: universe.id })
    continue
  }
  const buckets = new Map<string, Candidate[]>()
  for (const c of pool.values()) {
    const key = c.path.split('/').slice(0, 2).join('/')
    const list = buckets.get(key) ?? []
    list.push(c)
    buckets.set(key, list)
  }
  const ordered = [...buckets.values()].map((list) => list.sort((a, b) => a.rank - b.rank)).sort((a, b) => a[0].rank - b[0].rank)
  const picks: Candidate[] = []
  while (picks.length < PER_UNIVERSE && ordered.some((l) => l.length)) {
    for (const list of ordered) {
      const next = list.shift()
      if (next) picks.push(next)
      if (picks.length >= PER_UNIVERSE) break
    }
  }
  picks.sort((a, b) => a.rank - b.rank)
  for (const [i, c] of picks.entries()) {
    const slug = slugFor(c.host, taken)
    // Prominence blends the site's global popularity with its standing inside
    // this universe, so a quieter topic still has bright leaders of its own.
    const standing = picks.length > 1 ? i / (picks.length - 1) : 0
    const importance = Math.round(0.5 * importanceFrom(c.rank) + 0.5 * (92 - 50 * standing))
    let objectType: CelestialObjectType
    if (i < 2 && importance >= 74) objectType = 'star'
    else if (standing < 0.4) objectType = 'planet'
    else objectType = i % 4 === 3 ? 'comet' : 'moon'
    selected.push({
      id: slug,
      name: nameFrom(c.title),
      url: c.url,
      universeId: universe.id,
      objectType,
      importance,
      description: descriptionFrom(c.description),
      accent: accentFor(universe.id, slug),
      tags: tagsFrom(c.path),
      path: c.path,
      rank: c.rank,
    })
  }
  log(`selected for ${universe.id}`, { picked: picks.length, pool: pool.size, topics: buckets.size })
}

// ─── Moons orbit a planet or star of the same universe (visual only) ─────────
for (const universe of universes) {
  const anchors = [...curated, ...selected].filter((w) => w.universeId === universe.id && (w.objectType === 'planet' || w.objectType === 'star'))
  let n = 0
  for (const w of selected) {
    if (w.universeId !== universe.id || w.objectType !== 'moon') continue
    if (!anchors.length) {
      w.objectType = 'comet'
      continue
    }
    w.orbitAnchorId = anchors[n++ % anchors.length].id
  }
}

// ─── Relationships: neighbours in the same leaf category are "related" ──────
const relationships: WebsiteRelationship[] = []
const byLeaf = new Map<string, typeof selected>()
for (const w of selected) {
  const list = byLeaf.get(w.path) ?? []
  list.push(w)
  byLeaf.set(w.path, list)
}
for (const [path, group] of byLeaf) {
  if (group.length < 2) continue
  group.sort((a, b) => a.rank - b.rank)
  const label = path.split('/').slice(1).join(' › ').replace(/_/g, ' ')
  for (let i = 0; i + 1 < group.length; i++) {
    relationships.push({ source: group[i].id, target: group[i + 1].id, type: 'related', note: `Both charted under ${label}` })
  }
}

// ─── Write ───────────────────────────────────────────────────────────────────
const lines = selected.map((w) => {
  const { path: _path, rank: _rank, ...def } = w
  return `  ${JSON.stringify(def)},`
})
const source = `import type { WebsiteDefinition, WebsiteRelationship } from '../types/galaxy'

/**
 * GENERATED by \`npm run import:curlie\` — do not edit by hand; edit the
 * importer or the source data instead.
 *
 * Websites charted from the Curlie.org directory (curlie.org, CC BY 3.0 —
 * titles and descriptions are Curlie's editorial content) ranked by the
 * Tranco list (tranco-list.eu). ${selected.length} websites across
 * ${new Set(selected.map((w) => w.universeId)).size} universes; each universe holds at most ${PER_UNIVERSE}.
 * Relationships connect neighbours from the same Curlie category as equals.
 */
export const directoryWebsites: WebsiteDefinition[] = [
${lines.join('\n')}
]

export const directoryRelationships: WebsiteRelationship[] = [
${relationships.map((r) => `  ${JSON.stringify(r)},`).join('\n')}
]
`
await mkdir(resolve(ROOT, 'src/data'), { recursive: true })
await writeFile(OUTPUT, source)
log('written', { file: 'src/data/directory.ts', websites: selected.length, relationships: relationships.length })
