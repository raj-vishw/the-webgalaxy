import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef, type RefObject } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { universes } from '../../../data/universes'
import { websites } from '../../../data/websites'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { ViewMode } from '../../../types/galaxy'
import {
  approachDirection,
  flightDuration,
  flightLift,
  poseFrom,
  universeViewDistance,
  websiteViewDistance,
  type CameraPose,
} from '../../../utils/camera'

interface CameraTransitionProps {
  controls: RefObject<OrbitControlsImpl | null>
  overview: CameraPose
  reducedMotion: boolean
}

interface Destination {
  /** Live focus point (websites move). */
  focus: () => Vector3
  /** Camera position for a given focus. */
  position: (focus: Vector3) => Vector3
}

const focusPoint = new Vector3()
const anchorPoint = new Vector3()
const awayFromAnchor = new Vector3()
const destinationPosition = new Vector3()
const startPosition = new Vector3()
const startTarget = new Vector3()
const flightPosition = new Vector3()
const flightTarget = new Vector3()

/**
 * Flies the camera between exploration levels. Every journey is a continuous
 * GSAP tween through the same world — never a cut — and the orbit controls
 * hand the camera over for the duration. Closing a website restores the pose
 * the user had before focusing it.
 */
export function CameraTransition({ controls, overview, reducedMotion }: CameraTransitionProps) {
  const camera = useThree((s) => s.camera)
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const flightRef = useRef<gsap.core.Tween | null>(null)
  const previousModeRef = useRef<ViewMode>('galaxy')

  useEffect(() => {
    if (introPhase !== 'complete') return
    const orbit = controls.current
    if (!orbit) return
    const from = previousModeRef.current
    previousModeRef.current = viewMode
    const store = useGalaxyStore.getState()

    let destination: Destination | null = null
    if (viewMode === 'galaxy' && from !== 'galaxy') {
      destination = {
        focus: () => focusPoint.copy(overview.target),
        position: () => destinationPosition.copy(overview.position),
      }
    } else if (viewMode === 'universe' && activeUniverseId) {
      const restorePosition = from === 'website' ? store.previousCameraPosition : null
      const restoreTarget = from === 'website' ? store.previousCameraTarget : null
      const universe = universes.find((u) => u.id === activeUniverseId)
      const object = celestialRegistry.get(activeUniverseId)
      if (restorePosition && restoreTarget) {
        // Closing a website: go back to where the user was, not to a preset.
        destination = {
          focus: () => focusPoint.set(...restoreTarget),
          position: () => destinationPosition.set(...restorePosition),
        }
      } else if (universe && object) {
        const distance = universeViewDistance(universe)
        const direction = approachDirection(camera.position, object.getWorldPosition(focusPoint), 0.28).clone()
        destination = {
          focus: () => object.getWorldPosition(focusPoint),
          position: (focus) => poseFrom(focus, direction, distance, destinationPosition),
        }
      }
    } else if (viewMode === 'website' && selectedWebsiteId) {
      const website = websites.find((w) => w.id === selectedWebsiteId)
      const object = celestialRegistry.get(selectedWebsiteId)
      if (website && object) {
        // Remember where we came from only when entering focus from free exploration.
        if (from !== 'website') {
          store.rememberCameraPose(
            [camera.position.x, camera.position.y, camera.position.z],
            [orbit.target.x, orbit.target.y, orbit.target.z],
          )
        }
        const distance = websiteViewDistance(website)
        const direction = approachDirection(camera.position, object.getWorldPosition(focusPoint), 0.15).clone()
        // A moon sits close to the body it circles: approach from the far side
        // of that body so it never fills the frame.
        const anchor = website.orbitAnchorId ? celestialRegistry.get(website.orbitAnchorId) : null
        if (anchor) {
          awayFromAnchor.subVectors(focusPoint, anchor.getWorldPosition(anchorPoint)).normalize()
          direction.lerp(awayFromAnchor, 0.75).normalize()
          if (direction.y < 0.15) direction.y = 0.15
          direction.normalize()
        }
        destination = {
          focus: () => object.getWorldPosition(focusPoint),
          position: (focus) => poseFrom(focus, direction, distance, destinationPosition),
        }
      }
    }
    if (!destination) return

    flightRef.current?.kill()
    startPosition.copy(camera.position)
    startTarget.copy(orbit.target)
    const initialFocus = destination.focus()
    const travel = startPosition.distanceTo(destination.position(initialFocus))
    const duration = flightDuration(travel, reducedMotion)
    const lift = flightLift(travel, reducedMotion)
    store.setCameraTarget([initialFocus.x, initialFocus.y, initialFocus.z])
    // `isTransitioning` disables the orbit controls for the flight.
    store.setTransitioning(true)

    const proxy = { t: 0 }
    const tween = gsap.to(proxy, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const focus = destination.focus()
        const end = destination.position(focus)
        flightPosition.lerpVectors(startPosition, end, proxy.t)
        flightPosition.y += Math.sin(proxy.t * Math.PI) * lift
        flightTarget.lerpVectors(startTarget, focus, proxy.t)
        camera.position.copy(flightPosition)
        orbit.target.copy(flightTarget)
        camera.lookAt(flightTarget)
      },
      onComplete: () => {
        flightRef.current = null
        useGalaxyStore.getState().setTransitioning(false)
      },
    })
    flightRef.current = tween
    return () => {
      tween.kill()
      if (flightRef.current === tween) {
        flightRef.current = null
        useGalaxyStore.getState().setTransitioning(false)
      }
    }
  }, [camera, controls, viewMode, activeUniverseId, selectedWebsiteId, introPhase, overview, reducedMotion])

  return null
}
