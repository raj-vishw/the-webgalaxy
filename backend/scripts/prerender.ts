/**
 * `npm run build` → `vite build && npm run prerender` (from the repo root)
 *
 * Search engines and link previews never run the 3D scene, so the build
 * writes a static HTML page for the home, every universe and every website
 * into `dist/` — the app's own `index.html` with per-page title, description,
 * canonical and Open Graph tags, plus real, linked content inside `#root`
 * (which React replaces the moment it mounts). Also `sitemap.xml` and a
 * `robots.txt` that points at it.
 *
 * Vercel serves these files before the SPA rewrite (`cleanUrls` maps
 * `/website/github` to `website/github.html`), so `/website/github` is a
 * page to a crawler and a deep link to a visitor — the same URL. The
 * absolute site URL comes from `VITE_SITE_URL`, else Vercel's production
 * domain, else localhost.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { directoryRelationships, directoryWebsites } from '../../src/data/directory.ts'
import { relationships as curatedRelationships } from '../../src/data/relationships.ts'
import { universes } from '../../src/data/universes.ts'
import { websites as curatedWebsites } from '../../src/data/websites.ts'
import type { UniverseDefinition, WebsiteDefinition } from '../../src/types/galaxy.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const DIST = resolve(ROOT, 'dist')
const SITE_NAME = 'The WebGalaxy'
const SITE_URL = (process.env.VITE_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')).replace(/\/$/, '')

const websites: WebsiteDefinition[] = [...curatedWebsites, ...directoryWebsites]
const byId = new Map(websites.map((w) => [w.id, w]))
const universeById = new Map(universes.map((u) => [u.id, u]))
const related = new Map<string, Set<string>>()
const link = (a: string, b: string) => {
  if (!byId.has(a) || !byId.has(b) || a === b) return
  related.set(a, (related.get(a) ?? new Set()).add(b))
  related.set(b, (related.get(b) ?? new Set()).add(a))
}
for (const r of [...curatedRelationships, ...directoryRelationships]) link(r.source, r.target)
for (const w of websites) for (const r of w.relationships ?? []) link(w.id, r.target)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const trim = (s: string, max = 158) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`)
const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
}

interface Page {
  path: string
  title: string
  description: string
  body: string
  jsonLd: Record<string, unknown>
}

const STYLE = 'font-family:Inter,system-ui,sans-serif;color:#dfe6ff;background:#020308;min-height:100vh;margin:0;padding:3rem 1.5rem;box-sizing:border-box'
const INNER = 'max-width:44rem;margin:0 auto;font-weight:300;line-height:1.6'
const LINK = 'color:#c9d4ff;text-decoration:none'
const MUTED = 'color:#8f9bc4;font-size:0.85rem'

function shell(page: Page, template: string): string {
  const url = `${SITE_URL}${page.path}`
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${SITE_URL}/social.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/social.png" />`,
    `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
  // Replace the template's generic title/description/social tags with the page's own.
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<meta (property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '')
    .replace('<meta name="color-scheme" content="dark" />', `<meta name="color-scheme" content="dark" />\n    ${head}`)
  // Static content in place of the noscript fallback: visible until the app mounts.
  html = html.replace(/<div id="root">[\s\S]*?<\/div>(\s*<\/body>)/, (_, tail: string) => `<div id="root">${page.body}</div>${tail}`)
  return html
}

const nav = `<p style="${MUTED}"><a href="/" style="${LINK}">${SITE_NAME}</a></p>`
const footer = `<p style="${MUTED};margin-top:2.5rem">The WebGalaxy is an interactive 3D map of the web: every universe is a category, every celestial object a website. It needs JavaScript and WebGL; a <a href="/?view=list" style="${LINK}">list view</a> works everywhere. Directory titles and descriptions come from <a href="https://curlie.org" style="${LINK}" rel="noopener">Curlie.org</a> (CC BY 3.0).</p>`

function homePage(): Page {
  const list = universes.map((u) => `<li><a href="/universe/${u.id}" style="${LINK}">${esc(u.name)}</a> <span style="${MUTED}">— ${esc(u.description)}</span></li>`).join('')
  return {
    path: '/',
    title: `${SITE_NAME} — Explore the Internet as a Universe`,
    description: `An immersive 3D map of the web: ${universes.length} universes, ${websites.length.toLocaleString('en')} websites, and the connections between them. Explore, search and discover what's next.`,
    body: `<main style="${STYLE}"><div style="${INNER}"><h1 style="font-weight:300;letter-spacing:0.3em">THE WEBGALAXY</h1><p>Explore the internet as a living universe: ${universes.length} universes, ${websites.length.toLocaleString('en')} websites.</p><h2 style="font-weight:400;font-size:1rem;letter-spacing:0.15em;text-transform:uppercase;margin-top:2rem">Universes</h2><ul style="list-style:none;padding:0">${list}</ul>${footer}</div></main>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: 'An interactive 3D map of the web where every universe is a category and every celestial object a website.',
    },
  }
}

function universePage(u: UniverseDefinition): Page {
  const members = websites.filter((w) => w.universeId === u.id).sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
  const list = members.map((w) => `<li><a href="/website/${w.id}" style="${LINK}">${esc(w.name)}</a>${w.description ? ` <span style="${MUTED}">— ${esc(trim(w.description, 120))}</span>` : ''}</li>`).join('')
  const topics = [...new Set(members.map((w) => w.topic).filter(Boolean))] as string[]
  return {
    path: `/universe/${u.id}`,
    title: `${u.name} · ${SITE_NAME}`,
    description: trim(`${u.description}. ${members.length} websites in the ${u.name} universe of The WebGalaxy${topics.length ? `: ${topics.slice(0, 6).join(', ')}` : ''}, with their connections.`),
    body: `<main style="${STYLE}"><div style="${INNER}">${nav}<h1 style="font-weight:300;letter-spacing:0.2em;text-transform:uppercase">${esc(u.name)}</h1><p>${esc(u.description)}. ${members.length} websites${topics.length ? ` across ${esc(topics.join(', '))}` : ''}.</p><ul style="list-style:none;padding:0">${list}</ul>${footer}</div></main>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${u.name} · ${SITE_NAME}`,
      url: `${SITE_URL}/universe/${u.id}`,
      description: u.description,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
      mainEntity: { '@type': 'ItemList', numberOfItems: members.length, itemListElement: members.slice(0, 50).map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.name, url: `${SITE_URL}/website/${w.id}` })) },
    },
  }
}

function websitePage(w: WebsiteDefinition): Page {
  const u = universeById.get(w.universeId)!
  const host = hostOf(w.url)
  const neighbours = [...(related.get(w.id) ?? [])].map((id) => byId.get(id)!).slice(0, 12)
  const description = trim(w.description ? `${w.description} ${w.name} in the ${u.name} universe of The WebGalaxy.` : `${w.name}${host ? ` (${host})` : ''} in the ${u.name} universe of The WebGalaxy.`)
  const visit = w.url ? `<p><a href="${esc(w.url)}" rel="noopener" style="${LINK}">Visit ${esc(host || w.name)} ↗</a></p>` : ''
  const relatedList = neighbours.length
    ? `<h2 style="font-weight:400;font-size:0.9rem;letter-spacing:0.15em;text-transform:uppercase;margin-top:2rem">Connected websites</h2><ul style="list-style:none;padding:0">${neighbours.map((n) => `<li><a href="/website/${n.id}" style="${LINK}">${esc(n.name)}</a> <span style="${MUTED}">— ${esc(universeById.get(n.universeId)?.name ?? '')}</span></li>`).join('')}</ul>`
    : ''
  const tags = w.tags?.length ? `<p style="${MUTED}">${esc(w.tags.join(' · '))}</p>` : ''
  return {
    path: `/website/${w.id}`,
    title: `${w.name} · ${u.name} · ${SITE_NAME}`,
    description,
    body: `<main style="${STYLE}"><div style="${INNER}">${nav}<p style="${MUTED}"><a href="/universe/${u.id}" style="${LINK}">${esc(u.name)}</a>${w.topic ? ` · ${esc(w.topic)}` : ''}</p><h1 style="font-weight:300;letter-spacing:0.1em">${esc(w.name)}</h1><p>${esc(w.description ?? '')}</p>${visit}${tags}${relatedList}${footer}</div></main>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${w.name} · ${SITE_NAME}`,
      url: `${SITE_URL}/website/${w.id}`,
      description,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
      about: w.url ? { '@type': 'WebSite', name: w.name, url: w.url } : undefined,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: u.name, item: `${SITE_URL}/universe/${u.id}` },
          { '@type': 'ListItem', position: 3, name: w.name, item: `${SITE_URL}/website/${w.id}` },
        ],
      },
    },
  }
}

// ─── Write ───────────────────────────────────────────────────────────────────
const template = await readFile(resolve(DIST, 'index.html'), 'utf8')
const pages: Page[] = [homePage(), ...universes.map(universePage), ...websites.filter((w) => universeById.has(w.universeId)).map(websitePage)]
const fileFor = (path: string) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`)
const dirs = new Set<string>()
for (const page of pages) {
  const file = resolve(DIST, fileFor(page.path))
  const dir = dirname(file)
  if (!dirs.has(dir)) {
    await mkdir(dir, { recursive: true })
    dirs.add(dir)
  }
  await writeFile(file, shell(page, template))
}

const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
  .map((p) => `  <url><loc>${esc(SITE_URL + p.path)}</loc><lastmod>${today}</lastmod><changefreq>${p.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p.path === '/' ? '1.0' : p.path.startsWith('/universe/') ? '0.8' : '0.5'}</priority></url>`)
  .join('\n')}\n</urlset>\n`
await writeFile(resolve(DIST, 'sitemap.xml'), sitemap)
await writeFile(resolve(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
console.log(`[prerender] ${pages.length} pages, sitemap.xml and robots.txt written to dist/ for ${SITE_URL}`)
