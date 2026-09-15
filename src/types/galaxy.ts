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
  universeId: string
  objectType: CelestialObjectType
  /** 0–100: drives visual prominence (size, glow, how early it appears). */
  importance?: number
  /** Missing URLs are tolerated: the object still renders, "Visit" is disabled. */
  url?: string
  description?: string
  tags?: string[]
  /** Brand accent colour used to tint the object; falls back to the universe palette. */
  accent?: string
  /** 1–4 character monogram integrated into the object's surface; derived from the name if omitted. */
  glyph?: string
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
  /**
   * Connections to other websites, declared inline. Merged with the shared
   * relationship dataset by the relationship service. A relationship is a
   * link between equals — never ownership, containment or rank.
   */
  relationships?: WebsiteRelationshipRef[]
}

/**
 * Controlled vocabulary of relationship types. Every one of them connects two
 * independent websites; none of them imply that one is above the other.
 */
export type RelationshipType =
  | 'related' // solve similar or related problems
  | 'alternative' // can be used instead of each other
  | 'integration' // commonly used together
  | 'ecosystem' // part of the same broader ecosystem
  | 'complementary' // different functionality that works well together
  | 'competitor' // serve similar markets
  | 'same-company' // operated by the same organisation

/** A relationship declared from one website's point of view. */
export interface WebsiteRelationshipRef {
  target: string
  type: RelationshipType
  /**
   * Most relationships are symmetrical and are declared once. Set `directed`
   * when the connection genuinely has a direction (e.g. "A publishes to B");
   * only then does the visualisation show movement from source to target.
   */
  directed?: boolean
  /** Short human-readable justification, surfaced as an explanation. */
  note?: string
}

/** A relationship as stored in the shared dataset (`data/relationships.ts`). */
export interface WebsiteRelationship extends WebsiteRelationshipRef {
  source: string
}

export type TrendDirection = 'up' | 'steady' | 'down'

/**
 * Static demo trend record for a website. This is placeholder data shaped so
 * a backend can replace it — it is NOT live traffic.
 */
export interface WebsiteTrend {
  websiteId: string
  /** 0–1: how strongly the site is trending right now. */
  trendingScore: number
  trendDirection: TrendDirection
  /** Low prominence but high discovery potential. */
  emerging?: boolean
  /** ISO date the snapshot represents. */
  asOf: string
}

/**
 * Two universes whose websites are often useful to the same explorer. This is
 * an affinity between peers — neither universe contains or ranks the other.
 */
export interface UniverseAffinity {
  universeIds: readonly [string, string]
  reason: string
}

export type IntroPhase = 'idle' | 'playing' | 'complete'

/**
 * Which level of The WebGalaxy the camera is currently exploring. This is
 * navigation state only — it says where the camera is, not that websites are
 * nested under universes in any data sense.
 */
export type ViewMode = 'galaxy' | 'universe' | 'website'
