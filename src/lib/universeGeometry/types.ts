import type { Vec3 } from '../../types/galaxy'

export interface GlowSpec {
  position: Vec3
  color: string
  /** Diameter in local (unit-radius) space. */
  size: number
  intensity: number
  /** Higher = tighter falloff. */
  falloff: number
}

export interface OrbitBody {
  radius: number
  /** Radians per second. */
  speed: number
  phase: number
  inclination: number
  size: number
  color: string
}

/**
 * GPU-ready buffers describing one universe in local space. The structure is
 * built inside a unit sphere and scaled by `UniverseDefinition.scale`.
 */
export interface UniverseGeometry {
  count: number
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  seeds: Float32Array
  glows: GlowSpec[]
  /** Euler rotation applied to the whole structure, so discs are tilted. */
  orientation: Vec3
  /** Continuous spin around the local Y axis, radians per second. */
  spinSpeed: number
  bodies?: OrbitBody[]
}
