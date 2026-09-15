import { Vector3 } from 'three'
import { universes } from '../../../data/universes'
import { websites } from '../../../data/websites'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import type { ViewMode } from '../../../types/galaxy'
import {
  approachDirection,
  poseFrom,
  universeViewDistance,
  websiteViewDistance,
  type CameraPose,
} from '../../../utils/camera'

/**
 * A resolved camera journey: where to look, where to stand, and optionally a
 * waypoint to pass through on the way (used when a search result lives in a
 * universe the camera is not in yet — travel to the universe, then continue
 * to the website, as one movement).
 */
export interface CameraDestination {
  /** Live focus point (websites move). */
  focus: () => Vector3
  /** Camera position for a given focus. */
  position: (focus: Vector3) => Vector3
  waypoint?: { position: Vector3; target: Vector3 }
}

export interface TargetingContext {
  viewMode: ViewMode
  previousMode: ViewMode
  previousUniverseId: string | null
  activeUniverseId: string | null
  selectedWebsiteId: string | null
  previousCameraPosition: readonly [number, number, number] | null
  previousCameraTarget: readonly [number, number, number] | null
  cameraPosition: Vector3
  overview: CameraPose
}

const focusPoint = new Vector3()
const anchorPoint = new Vector3()
const awayFromAnchor = new Vector3()
const destinationPosition = new Vector3()
const universeCentre = new Vector3()

/** Where the camera should go for the current navigation state, or null to stay. */
export function resolveDestination(ctx: TargetingContext): CameraDestination | null {
  const { viewMode, previousMode, activeUniverseId, selectedWebsiteId, cameraPosition, overview } = ctx

  if (viewMode === 'galaxy') {
    if (previousMode === 'galaxy') return null
    return {
      focus: () => focusPoint.copy(overview.target),
      position: () => destinationPosition.copy(overview.position),
    }
  }

  if (viewMode === 'universe' && activeUniverseId) {
    const restorePosition = previousMode === 'website' ? ctx.previousCameraPosition : null
    const restoreTarget = previousMode === 'website' ? ctx.previousCameraTarget : null
    if (restorePosition && restoreTarget) {
      // Closing a website: go back to where the user was, not to a preset.
      return {
        focus: () => focusPoint.set(...restoreTarget),
        position: () => destinationPosition.set(...restorePosition),
      }
    }
    const universe = universes.find((u) => u.id === activeUniverseId)
    const object = celestialRegistry.get(activeUniverseId)
    if (!universe || !object) return null
    const distance = universeViewDistance(universe)
    const direction = approachDirection(cameraPosition, object.getWorldPosition(focusPoint), 0.28).clone()
    return {
      focus: () => object.getWorldPosition(focusPoint),
      position: (focus) => poseFrom(focus, direction, distance, destinationPosition),
    }
  }

  if (viewMode === 'website' && selectedWebsiteId) {
    const website = websites.find((w) => w.id === selectedWebsiteId)
    const object = celestialRegistry.get(selectedWebsiteId)
    if (!website || !object) return null
    const distance = websiteViewDistance(website)
    const direction = approachDirection(cameraPosition, object.getWorldPosition(focusPoint), 0.15).clone()
    // A moon sits close to the body it circles: approach from the far side
    // of that body so it never fills the frame.
    const anchor = website.orbitAnchorId ? celestialRegistry.get(website.orbitAnchorId) : null
    if (anchor) {
      awayFromAnchor.subVectors(focusPoint, anchor.getWorldPosition(anchorPoint)).normalize()
      direction.lerp(awayFromAnchor, 0.75).normalize()
      if (direction.y < 0.15) direction.y = 0.15
      direction.normalize()
    }

    // Coming from elsewhere in the galaxy: pass by the universe first.
    const arrivingFromOutside = previousMode === 'galaxy' || ctx.previousUniverseId !== website.universeId
    let waypoint: CameraDestination['waypoint']
    if (arrivingFromOutside) {
      const universe = universes.find((u) => u.id === website.universeId)
      const universeObject = celestialRegistry.get(website.universeId)
      if (universe && universeObject) {
        universeObject.getWorldPosition(universeCentre)
        const towards = approachDirection(cameraPosition, universeCentre, 0.28, new Vector3())
        waypoint = {
          target: universeCentre.clone(),
          position: universeCentre.clone().addScaledVector(towards, universeViewDistance(universe) * 1.1),
        }
      }
    }

    return {
      focus: () => object.getWorldPosition(focusPoint),
      position: (focus) => poseFrom(focus, direction, distance, destinationPosition),
      waypoint,
    }
  }

  return null
}
