import type { UniverseDefinition, UniverseVisualType } from '../../types/galaxy'
import { buildCluster } from './cluster'
import { buildNebula } from './nebula'
import { buildPlanetary } from './planetary'
import { buildSpiral } from './spiral'
import { buildStream } from './stream'
import type { UniverseGeometry } from './types'

export type { GlowSpec, OrbitBody, UniverseGeometry } from './types'

type Builder = (def: UniverseDefinition, count: number) => UniverseGeometry

const BUILDERS: Record<UniverseVisualType, Builder> = {
  spiral: buildSpiral,
  cluster: buildCluster,
  nebula: buildNebula,
  stream: buildStream,
  planetary: buildPlanetary,
}

/** Base particle budget per visual type at full quality. */
const BASE_COUNTS: Record<UniverseVisualType, number> = {
  spiral: 5200,
  cluster: 3600,
  nebula: 3200,
  stream: 4200,
  planetary: 2400,
}

/**
 * Builds the particle geometry for a universe. `detail` (0–1) scales the
 * particle budget so weaker devices render simpler structures.
 */
export function buildUniverseGeometry(def: UniverseDefinition, detail = 1): UniverseGeometry {
  const count = Math.max(200, Math.round(BASE_COUNTS[def.visualType] * detail))
  return BUILDERS[def.visualType](def, count)
}
