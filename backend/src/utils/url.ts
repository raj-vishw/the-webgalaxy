/**
 * Submitted URLs are untrusted. Only http(s) with a real host is accepted;
 * credentials, fragments and javascript:/data: schemes are rejected. The
 * normalised form (no scheme/www/trailing slash, lower-case) is what duplicate
 * detection compares.
 */
const PRIVATE_HOSTS = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\])/i

export interface ParsedUrl {
  href: string
  normalized: string
}

export function parseWebsiteUrl(input: string, { allowPrivate = false } = {}): ParsedUrl | null {
  const raw = input.trim()
  if (!raw || raw.length > 2048) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (!url.hostname || !url.hostname.includes('.')) return null
  if (!allowPrivate && PRIVATE_HOSTS.test(url.hostname)) return null
  url.hash = ''
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  const normalized = `${host}${path}${url.search}`.toLowerCase()
  return { href: url.href, normalized }
}
