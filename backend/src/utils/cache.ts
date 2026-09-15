/**
 * Tiny in-process TTL cache for read-mostly public data (universe list,
 * trending, emerging). Admin writes call `clear()` so edits show up at once;
 * a multi-instance deployment would swap this for a shared cache.
 */
interface Entry<T> {
  value: T
  expires: number
}

export class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>()
  private readonly defaultTtlMs: number

  constructor(defaultTtlMs = 60_000) {
    this.defaultTtlMs = defaultTtlMs
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expires < Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs) {
    this.entries.set(key, { value, expires: Date.now() + ttlMs })
  }

  async remember<T>(key: string, produce: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = this.get<T>(key)
    if (hit !== undefined) return hit
    const value = await produce()
    this.set(key, value, ttlMs)
    return value
  }

  clear(prefix?: string) {
    if (!prefix) return this.entries.clear()
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key)
  }
}
