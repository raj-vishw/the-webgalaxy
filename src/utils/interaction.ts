import type { Object3D } from 'three'

/**
 * Interaction events, emitted by the store's navigation actions and the
 * camera. Nothing plays sound yet; a future audio layer subscribes here
 * without touching the 3D components.
 */
export type InteractionEvent =
  | { type: 'universe:hover'; universeId: string | null }
  | { type: 'universe:select'; universeId: string }
  | { type: 'website:hover'; websiteId: string | null }
  | { type: 'website:select'; websiteId: string }
  | { type: 'website:visit'; websiteId: string }
  | { type: 'navigate:back'; to: 'universe' | 'galaxy' }
  | { type: 'camera:travel'; phase: 'start' | 'end' }

type Listener = (event: InteractionEvent) => void

const listeners = new Set<Listener>()

export const interactionEvents = {
  emit(event: InteractionEvent) {
    for (const listener of listeners) listener(event)
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/** Which kind of thing a raycast-able object represents. */
export type InteractionKind = 'website' | 'universe'

export interface InteractionTag {
  kind: InteractionKind
  id: string
}

/** Tags a hit volume so the event filter can rank it. */
export function tagInteraction(object: Object3D, tag: InteractionTag) {
  object.userData.interaction = tag
}

export function interactionTagOf(object: Object3D | null | undefined): InteractionTag | null {
  return (object?.userData?.interaction as InteractionTag | undefined) ?? null
}

/**
 * Ranks pointer hits so overlapping volumes resolve predictably:
 * the selected website, then websites, then universes, then anything else.
 * Ties keep their distance order.
 */
export function rankInteraction(tag: InteractionTag | null, selectedWebsiteId: string | null): number {
  if (!tag) return 3
  if (tag.kind === 'website') return tag.id === selectedWebsiteId ? 0 : 1
  return 2
}
