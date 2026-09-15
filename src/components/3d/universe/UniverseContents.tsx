import type { QualityProfile } from '../../../hooks/useQualityProfile'
import type { UniverseDefinition } from '../../../types/galaxy'
import { UniverseEnvironment } from './UniverseEnvironment'
import { UniverseWebsites } from './UniverseWebsites'

interface UniverseContentsProps {
  universe: UniverseDefinition
  profile: QualityProfile
  pixelRatio: number
}

/**
 * Everything that lives inside a universe: its websites and its ambient
 * environment. Rendered in unscaled world space so object sizes are absolute.
 */
export function UniverseContents({ universe, profile, pixelRatio }: UniverseContentsProps) {
  return (
    <>
      <UniverseWebsites universe={universe} profile={profile} pixelRatio={pixelRatio} />
      <UniverseEnvironment universe={universe} profile={profile} pixelRatio={pixelRatio} />
    </>
  )
}
