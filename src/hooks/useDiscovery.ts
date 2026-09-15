import { useCallback } from 'react'
import { resolveDiscoveryTarget, type DiscoveryTarget } from '../services/discoveryService'
import { useGalaxyStore } from '../store/galaxyStore'
import type { DiscoveryMode } from '../utils/discovery'

/**
 * Discovery from a component's point of view: current phase, a way to
 * start a mode, and the (backend-aware) destination resolver the animation
 * uses. Keeps API calls out of the components themselves.
 */
export function useDiscovery() {
  const discovery = useGalaxyStore((s) => s.discovery)
  const startDiscovery = useGalaxyStore((s) => s.startDiscovery)
  const endDiscovery = useGalaxyStore((s) => s.endDiscovery)

  const resolveTarget = useCallback((mode: DiscoveryMode): Promise<DiscoveryTarget | null> => {
    return resolveDiscoveryTarget(mode, useGalaxyStore.getState().recommendationContext)
  }, [])

  return { discovery, startDiscovery, endDiscovery, resolveTarget }
}
