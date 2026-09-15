/**
 * Core domain types for The WebGalaxy.
 *
 * Conceptual rule: there is no hierarchy between universes. Every universe is
 * an independent thematic region that exists directly inside The WebGalaxy.
 * Nothing in these types should introduce parent/child or level relationships.
 */

export type Vec3 = readonly [number, number, number]

/** The cosmic structure used to render a universe. */
export type UniverseVisualType =
  | 'spiral' // small spiral galaxy
  | 'cluster' // dense globular cluster
  | 'nebula' // diffuse glowing cloud
  | 'stream' // elongated dense star region / stellar stream
  | 'planetary' // bright star with orbiting bodies and a dust ring

export interface UniversePalette {
  /** Bright core / dominant star colour. */
  core: string
  /** Main particle tint. */
  primary: string
  /** Secondary tint blended into a subset of particles. */
  secondary: string
}

/**
 * Spatial character of a universe's interior: how its websites are spread,
 * how energetically they move and how much ambient dust surrounds them.
 * Purely visual — it never groups or ranks the websites inside.
 */
export interface UniverseLayout {
  /** Ellipsoid radii for website placement, as fractions of `scale`. */
  spread: Vec3
  /** 0–1: how strongly high-importance websites are pulled toward the centre. */
  coreBias: number
  /** Multiplier on orbital / drift speed. */
  energy: number
  /** Multiplier on ambient dust density. */
  dust: number
}

export interface UniverseDefinition {
  id: string
  name: string
  description: string
  position: Vec3
  /** Approximate visual radius of the structure in world units. */
  scale: number
  visualType: UniverseVisualType
  palette: UniversePalette
  /** Deterministic seed so the structure looks identical across reloads. */
  seed: number
  layout: UniverseLayout
  metadata?: Record<string, unknown>
}

/** The kind of celestial object a website is rendered as. */
export type CelestialObjectType = 'star' | 'planet' | 'moon' | 'comet'

/**
 * A website inside The WebGalaxy. Websites are rendered as celestial objects
 * within the universe that represents their broad category; there is no
 * hierarchy among websites. Positions are generated procedurally, not stored.
 */
export interface WebsiteDefinition {
  id: string
  name: string
  url: string
  universeId: string
  objectType: CelestialObjectType
  /** 0–100: drives visual prominence (size, glow, how early it appears). */
  importance: number
  description: string
  tags?: string[]
  /** Brand accent colour used to tint the object. */
  accent: string
  /** 1–4 character monogram integrated into the object's surface. */
  glyph: string
  /** Picks one of the procedural surface patterns; derived from the id if omitted. */
  visualVariant?: number
  /** Optional multiplier on the importance-derived size. */
  size?: number
  /**
   * Moons only: id of the website whose position this moon orbits. This is a
   * purely visual arrangement and implies no relationship between the sites.
   */
  orbitAnchorId?: string
  /** Reserved for a real logo asset in a later phase. */
  logo?: string
}

export type IntroPhase = 'idle' | 'playing' | 'complete'

/** Which level of The WebGalaxy the camera is currently exploring. */
export type ExplorationMode = 'galaxy' | 'universe' | 'website'
