import type { UniverseDefinition, WebsiteDefinition } from '../types/galaxy'
import { urlFor } from './celestial'

export type DiscoveryMode = 'website' | 'universe'

/** Only well-formed entries are worth sending someone to. */
export function isDiscoverable(website: WebsiteDefinition): boolean {
  return Boolean(urlFor(website) && website.description?.trim() && website.name.trim())
}

function pick<T>(items: T[], exclude?: string, idOf?: (item: T) => string): T | null {
  const pool = exclude && idOf ? items.filter((item) => idOf(item) !== exclude) : items
  if (pool.length === 0) return items[0] ?? null
  return pool[Math.floor(Math.random() * pool.length)]
}

export function pickRandomWebsite(websites: WebsiteDefinition[], excludeId?: string): WebsiteDefinition | null {
  return pick(websites.filter(isDiscoverable), excludeId, (w) => w.id)
}

export function pickRandomUniverse(universes: UniverseDefinition[], excludeId?: string): UniverseDefinition | null {
  return pick(universes, excludeId, (u) => u.id)
}

/**
 * Candidate ids to flash through while "the galaxy searches itself": a run
 * of random ids that slows down (intervals grow) and ends on the target.
 */
export function scanSequence(ids: string[], targetId: string, steps = 11): { id: string; delay: number }[] {
  const pool = ids.filter((id) => id !== targetId)
  const sequence: { id: string; delay: number }[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const id = pool.length ? pool[Math.floor(Math.random() * pool.length)] : targetId
    sequence.push({ id, delay: 70 + Math.pow(t, 2.2) * 320 })
  }
  sequence.push({ id: targetId, delay: 0 })
  return sequence
}
