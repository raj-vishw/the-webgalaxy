import { locationDescription, locationPath, locationTitle } from '../utils/navigation'

/**
 * Keeps the document's head in step with the journey: title, description,
 * canonical URL and the Open Graph pair. Crawlers get the prerendered pages
 * (see backend/scripts/prerender.ts); this is for everything that reads the
 * live document — the tab, bookmarks, reader modes, browser sharing.
 */
function meta(selector: string, attr: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  return el
}

export function applyDocumentMeta() {
  const title = locationTitle()
  const description = locationDescription()
  const url = `${window.location.origin}${locationPath()}`
  document.title = title
  meta('meta[name="description"]', 'name', 'description').content = description
  meta('meta[property="og:title"]', 'property', 'og:title').content = title
  meta('meta[property="og:description"]', 'property', 'og:description').content = description
  meta('meta[property="og:url"]', 'property', 'og:url').content = url
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = url
}
