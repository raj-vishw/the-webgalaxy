import { interactionEvents, type InteractionEvent } from '../utils/interaction'

/**
 * Privacy-conscious product analytics, kept abstract: the app emits named
 * events with a few non-identifying properties to whatever provider is
 * installed. The default provider is a no-op (a console echo in development).
 * No identifiers, no page fingerprinting, nothing personal.
 */
export type AnalyticsEventName =
  | 'galaxy.entered'
  | 'universe.selected'
  | 'website.selected'
  | 'search.performed'
  | 'discovery.started'
  | 'discovery.completed'
  | 'external_site.opened'
  | 'submission.created'

export interface AnalyticsProvider {
  track(event: AnalyticsEventName, properties?: Record<string, string | number | boolean | null>): void
}

const noop: AnalyticsProvider = { track: () => undefined }
const consoleProvider: AnalyticsProvider = { track: (event, properties) => console.debug('[analytics]', event, properties ?? {}) }

let provider: AnalyticsProvider = import.meta.env.DEV ? consoleProvider : noop

export function setAnalyticsProvider(next: AnalyticsProvider) {
  provider = next
}

export function track(event: AnalyticsEventName, properties?: Record<string, string | number | boolean | null>) {
  try {
    provider.track(event, properties)
  } catch {
    // Analytics must never break the galaxy.
  }
}

/** Maps interaction-bus events to product events. Returns the unsubscribe. */
export function startAnalytics(): () => void {
  const map = (event: InteractionEvent) => {
    switch (event.type) {
      case 'galaxy:enter':
        return track('galaxy.entered', { firstVisit: event.firstVisit })
      case 'universe:select':
        return track('universe.selected', { universe: event.universeId })
      case 'website:select':
        return track('website.selected', { website: event.websiteId })
      case 'search:perform':
        return track('search.performed', { length: event.query.length, results: event.results })
      case 'discovery:start':
        return track('discovery.started', { mode: event.mode })
      case 'discovery:complete':
        return track('discovery.completed', { mode: event.mode, found: event.targetId !== null })
      case 'website:visit':
        return track('external_site.opened', { website: event.websiteId })
      case 'submission:create':
        return track('submission.created')
      default:
        return undefined
    }
  }
  return interactionEvents.subscribe(map)
}
