import type { RefObject } from 'react'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import type { WebsiteDefinition } from '../../../types/galaxy'
import type { OrbitSpec } from '../../../utils/generateOrbits'
import type { CelestialFrameState } from './celestialFrame'
import { PlanetWebsite } from './PlanetWebsite'

interface MoonWebsiteProps {
  website: WebsiteDefinition
  frame: RefObject<CelestialFrameState>
  orbit: OrbitSpec
  profile: QualityProfile
}

/**
 * A smaller, quieter body. Visually it may circle another website, which is
 * an arrangement in space only — never a statement about the site itself.
 */
export function MoonWebsite(props: MoonWebsiteProps) {
  return <PlanetWebsite {...props} muted />
}
