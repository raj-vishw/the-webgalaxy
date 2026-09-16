import { CanvasTexture, Color, SRGBColorSpace, type Texture } from 'three'
import { sceneMotion } from '../lib/sceneMotion'
import type { CelestialObjectType, UniverseDefinition, WebsiteDefinition } from '../types/galaxy'

/** Type multipliers on the uniform size — kept at 1 so every body reads the same size. */
const BASE_SIZE: Record<CelestialObjectType, number> = {
  star: 1,
  planet: 1,
  moon: 1,
  comet: 1,
}

const DEFAULT_IMPORTANCE = 50
const DEFAULT_ACCENT = '#c9d4ff'

/** Importance clamped to 0–1, defaulting when the data omits it. */
export function importanceFor(website: WebsiteDefinition): number {
  const raw = typeof website.importance === 'number' && Number.isFinite(website.importance) ? website.importance : DEFAULT_IMPORTANCE
  return Math.min(1, Math.max(0, raw / 100))
}

/** Accent colour with a neutral fallback for sites without brand data. */
export function accentFor(website: WebsiteDefinition): string {
  return website.accent && /^#[0-9a-f]{3,8}$/i.test(website.accent) ? website.accent : DEFAULT_ACCENT
}

/** Monogram: explicit glyph, else the initials of the name (max 3). */
export function glyphFor(website: WebsiteDefinition): string {
  if (website.glyph?.trim()) return website.glyph.trim().slice(0, 4)
  const words = website.name.trim().split(/\s+/).filter(Boolean)
  const initials = words.length > 1 ? words.map((w) => w[0]).join('') : website.name.slice(0, 2)
  return (initials || '·').slice(0, 3)
}

/** Whether the site has a URL we can actually open. */
export function urlFor(website: WebsiteDefinition): string | null {
  try {
    if (!website.url) return null
    const parsed = new URL(website.url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch {
    return null
  }
}

/** Every body is the same size; the type decides its look and the halo its prominence. */
const UNIFORM_SIZE = 1.05

/**
 * Body radius in world units. Uniform on purpose: with dozens of websites in
 * a universe, identity comes from each body's face (icon, monogram, surface)
 * and prominence from its halo and name — never from being bigger.
 * `website.size` remains as a manual nudge for special cases.
 */
export function sizeFor(website: WebsiteDefinition): number {
  return UNIFORM_SIZE * BASE_SIZE[website.objectType] * (website.size ?? 1)
}

/** Glow strength (0–1-ish) driven by importance — where prominence now lives. */
export function glowFor(website: WebsiteDefinition): number {
  return 0.35 + 0.65 * importanceFor(website)
}

/** Halo reach (× body radius) driven by importance: flagships glow wide, minor sites tight. */
export function haloScaleFor(website: WebsiteDefinition): number {
  return 0.75 + 0.6 * importanceFor(website)
}

/**
 * Distances (from the camera) between which an object fades in. Prominent
 * objects become visible from further away, so a universe reveals its major
 * stars first as you approach, then planets, then the small things.
 */
export function fadeDistancesFor(website: WebsiteDefinition, universe: UniverseDefinition, interior = 1) {
  const importance = importanceFor(website)
  const reach = universe.scale * interior * sceneMotion.universeFraming
  const far = reach * (4.5 + 3.5 * importance)
  return { near: far - reach * 1.5, far }
}

/** Window (0–1) of the universe-entry reveal in which each type appears. */
export const ENTRY_REVEAL_WINDOW: Record<CelestialObjectType, readonly [number, number]> = {
  star: [0, 0.35],
  planet: [0.25, 0.65],
  moon: [0.5, 0.85],
  comet: [0.6, 1],
}

/** Stable small integer hash of a string. */
export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const SURFACE_VARIANTS = 6

export function variantFor(website: WebsiteDefinition): number {
  return website.visualVariant ?? hashString(website.id) % SURFACE_VARIANTS
}

// ─── Textures ───────────────────────────────────────────────────────────────

let glowTexture: Texture | null = null

/** Shared soft radial sprite used for every glow in the celestial system. */
export function getGlowTexture(): Texture {
  if (glowTexture) return glowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.14)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  glowTexture = new CanvasTexture(canvas)
  glowTexture.colorSpace = SRGBColorSpace
  return glowTexture
}

const GLYPH_FONT = '600 64px Inter, "Segoe UI", system-ui, sans-serif'

/** A website's monogram on a transparent square, for stars and comets. */
export function createGlyphTexture(glyph: string): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.font = GLYPH_FONT
  const width = ctx.measureText(glyph).width
  const scale = Math.min(1, (size * 0.78) / width)
  ctx.translate(size / 2, size / 2)
  ctx.scale(scale, scale)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(glyph, 0, 4)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Seamless 2D value noise for the surface patterns.
function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}
function noise2(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
function fbm2(x: number, y: number, octaves = 3) {
  let v = 0, amp = 0.5, f = 1
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2(x * f, y * f)
    amp *= 0.5
    f *= 2.1
  }
  return v
}

const SURFACE_W = 192
const SURFACE_H = 96
const surfacePatterns: Float32Array[] = []

/**
 * Grayscale lightness maps, one per variant, shared by every website using
 * that variant. Computed once; colourising per website is cheap.
 */
function surfacePattern(variant: number): Float32Array {
  if (surfacePatterns[variant]) return surfacePatterns[variant]
  const data = new Float32Array(SURFACE_W * SURFACE_H)
  const offset = variant * 17.3
  for (let y = 0; y < SURFACE_H; y++) {
    const v = y / SURFACE_H
    for (let x = 0; x < SURFACE_W; x++) {
      const u = x / SURFACE_W
      // Blend two noise samples so the map tiles horizontally around the sphere.
      const n = (1 - u) * fbm2(u * 4 + offset, v * 3 + offset) + u * fbm2((u - 1) * 4 + offset, v * 3 + offset)
      let l: number
      switch (variant) {
        case 0: l = 0.5 + 0.15 * Math.sin(v * Math.PI * 7 + n * 2.4) + 0.12 * (n - 0.5); break // banded
        case 1: l = 0.35 + 0.5 * n; break // mottled
        case 2: l = 0.6 + 0.25 * (n - 0.5) + 0.08 * Math.sin(u * Math.PI * 12 + n * 4); break // icy streaks
        case 3: l = n > 0.52 ? 0.62 + (n - 0.52) * 0.8 : 0.32 + n * 0.25; break // continents
        case 4: l = 0.48 + 0.16 * (n - 0.5); break // dusty, low contrast
        default: l = 0.42 + 0.3 * n - (fbm2(u * 9 + offset, v * 7, 2) > 0.62 ? 0.18 : 0); break // cratered
      }
      data[y * SURFACE_W + x] = Math.min(1, Math.max(0, l))
    }
  }
  surfacePatterns[variant] = data
  return data
}

const hsl = { h: 0, s: 0, l: 0 }
const paletteColor = new Color()

/**
 * A planet / moon surface: the variant pattern colourised from the website's
 * accent, with its monogram drawn twice around the equator as a subtle emblem.
 */
export function createSurfaceTexture(website: WebsiteDefinition, muted = false): CanvasTexture {
  const variant = variantFor(website)
  const pattern = surfacePattern(variant)
  const glyph = glyphFor(website)
  new Color(accentFor(website)).getHSL(hsl)
  const saturation = muted ? hsl.s * 0.3 : Math.min(0.62, hsl.s * 0.65)
  const lightnessMin = muted ? 0.12 : 0.14
  const lightnessMax = muted ? 0.5 : 0.58

  const lut = new Uint8ClampedArray(64 * 3)
  for (let i = 0; i < 64; i++) {
    const l = lightnessMin + (lightnessMax - lightnessMin) * (i / 63)
    paletteColor.setHSL(hsl.h, saturation, l, 'srgb')
    lut[i * 3] = paletteColor.r * 255
    lut[i * 3 + 1] = paletteColor.g * 255
    lut[i * 3 + 2] = paletteColor.b * 255
  }

  const canvas = document.createElement('canvas')
  canvas.width = SURFACE_W
  canvas.height = SURFACE_H
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(SURFACE_W, SURFACE_H)
  for (let i = 0; i < pattern.length; i++) {
    const idx = Math.floor(pattern[i] * 63) * 3
    image.data[i * 4] = lut[idx]
    image.data[i * 4 + 1] = lut[idx + 1]
    image.data[i * 4 + 2] = lut[idx + 2]
    image.data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)

  ctx.font = '600 30px Inter, "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = muted ? 0.28 : 0.42
  ctx.fillStyle = '#ffffff'
  const width = ctx.measureText(glyph).width
  const glyphScale = Math.min(1, 52 / width)
  for (const u of [0.25, 0.75]) {
    ctx.save()
    ctx.translate(u * SURFACE_W, SURFACE_H / 2)
    ctx.scale(glyphScale, glyphScale)
    ctx.fillText(glyph, 0, 1)
    ctx.restore()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
