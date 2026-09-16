import { useEffect, useState } from 'react'
import { LinearFilter, SRGBColorSpace, Texture } from 'three'

/**
 * Website icons, packed one atlas per universe by `npm run logos` into
 * `public/logos/`. Loaded lazily — only for the universe being explored —
 * and entirely optional: without the files every site keeps its monogram.
 */
export interface LogoAtlas {
  universeId: string
  image: HTMLImageElement
  texture: Texture
  /** Cell size in pixels and in atlas UV units. */
  cell: number
  columns: number
  rows: number
  /** Cell index of a website, or -1. */
  slotOf(slug: string): number
  /** Pixel rectangle of a website's icon in `image`, or null. */
  rectOf(slug: string): { x: number; y: number; size: number } | null
  /** Atlas UV origin (bottom-left, GL convention) of a website's cell, or null. */
  uvOf(slug: string): { u: number; v: number } | null
}

interface Manifest {
  cell: number
  universes: Record<string, { file: string; columns: number; slots: Record<string, number> }>
}

let manifestPromise: Promise<Manifest | null> | null = null
const atlases = new Map<string, Promise<LogoAtlas | null>>()

function loadManifest(): Promise<Manifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch('/logos/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .catch(() => null)
  }
  return manifestPromise
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`could not load ${src}`))
    image.src = src
  })
}

export function loadLogoAtlas(universeId: string): Promise<LogoAtlas | null> {
  let pending = atlases.get(universeId)
  if (!pending) {
    pending = (async () => {
      const manifest = await loadManifest()
      const entry = manifest?.universes[universeId]
      if (!manifest || !entry) return null
      const image = await loadImage(`/logos/${entry.file}`)
      const texture = new Texture(image)
      texture.colorSpace = SRGBColorSpace
      texture.minFilter = LinearFilter
      texture.magFilter = LinearFilter
      texture.generateMipmaps = false
      texture.needsUpdate = true
      const { cell } = manifest
      const columns = entry.columns
      const rows = Math.ceil(image.height / cell)
      const slotOf = (slug: string) => entry.slots[slug] ?? -1
      return {
        universeId,
        image,
        texture,
        cell,
        columns,
        rows,
        slotOf,
        rectOf: (slug) => {
          const i = slotOf(slug)
          return i < 0 ? null : { x: (i % columns) * cell, y: Math.floor(i / columns) * cell, size: cell }
        },
        uvOf: (slug) => {
          const i = slotOf(slug)
          if (i < 0) return null
          const col = i % columns
          const row = Math.floor(i / columns)
          // Texture v runs bottom-up; row 0 is the top of the image.
          return { u: col / columns, v: 1 - (row + 1) / rows }
        },
      } satisfies LogoAtlas
    })().catch(() => null)
    atlases.set(universeId, pending)
  }
  return pending
}

/** The universe's icon atlas once loaded (null until then, or when there is none). */
export function useLogoAtlas(universeId: string, enabled: boolean): LogoAtlas | null {
  const [atlas, setAtlas] = useState<LogoAtlas | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void loadLogoAtlas(universeId).then((loaded) => {
      if (!cancelled) setAtlas(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [universeId, enabled])
  return enabled ? atlas : null
}
