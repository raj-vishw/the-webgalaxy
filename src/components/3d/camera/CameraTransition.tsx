import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef, type RefObject } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { ViewMode } from '../../../types/galaxy'
import { flightDuration, flightLift, type CameraPose } from '../../../utils/camera'
import { resolveDestination } from './CameraTargeting'

interface CameraTransitionProps {
  controls: RefObject<OrbitControlsImpl | null>
  overview: CameraPose
  reducedMotion: boolean
}

const startPosition = new Vector3()
const startTarget = new Vector3()
const flightPosition = new Vector3()
const flightTarget = new Vector3()
const a = new Vector3()
const b = new Vector3()

/** Quadratic bezier: start → control → end. */
function bezier(out: Vector3, p0: Vector3, p1: Vector3, p2: Vector3, t: number) {
  a.lerpVectors(p0, p1, t)
  b.lerpVectors(p1, p2, t)
  return out.lerpVectors(a, b, t)
}

/**
 * Flies the camera between exploration levels. Every journey is a continuous
 * GSAP tween through the same world — never a cut. Journeys with a waypoint
 * bend through it (search: galaxy → universe → website in one movement). The
 * user can interrupt a flight by touching the scene; it stops where it is and
 * hands control back.
 */
export function CameraTransition({ controls, overview, reducedMotion }: CameraTransitionProps) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const flightRef = useRef<gsap.core.Tween | null>(null)
  const previousModeRef = useRef<ViewMode>('galaxy')
  const previousUniverseRef = useRef<string | null>(null)

  useEffect(() => {
    if (introPhase !== 'complete') return
    const orbit = controls.current
    if (!orbit) return
    const store = useGalaxyStore.getState()
    const previousMode = previousModeRef.current
    const previousUniverseId = previousUniverseRef.current
    previousModeRef.current = viewMode
    previousUniverseRef.current = activeUniverseId

    // Remember where we came from only when entering focus from free
    // exploration *inside the same universe*; a focus reached from the
    // overview or from another universe returns to that universe's view.
    if (viewMode === 'website' && previousMode === 'universe' && previousUniverseId === activeUniverseId) {
      store.rememberCameraPose(
        [camera.position.x, camera.position.y, camera.position.z],
        [orbit.target.x, orbit.target.y, orbit.target.z],
      )
    }

    // The destination object may register a frame later than the store
    // update (a website promoted from the point cloud to a full object), so
    // resolution retries for a few frames before giving up.
    let raf = 0
    let attempts = 0
    let cleanupFlight: (() => void) | null = null
    const start = () => {
      const destination = resolveDestination({
        viewMode,
        previousMode,
        previousUniverseId,
        activeUniverseId,
        selectedWebsiteId,
        previousCameraPosition: store.previousCameraPosition,
        previousCameraTarget: store.previousCameraTarget,
        cameraPosition: camera.position,
        overview,
      })
      if (!destination) {
        if (++attempts < 30) raf = requestAnimationFrame(start)
        return
      }
      cleanupFlight = fly(destination)
    }

    const fly = (destination: NonNullable<ReturnType<typeof resolveDestination>>) => {
      flightRef.current?.kill()
      startPosition.copy(camera.position)
      startTarget.copy(orbit.target)
      const initialFocus = destination.focus()
      const end = destination.position(initialFocus).clone()
      const waypoint = destination.waypoint
      const travel = waypoint
        ? startPosition.distanceTo(waypoint.position) + waypoint.position.distanceTo(end)
        : startPosition.distanceTo(end)
      const duration = flightDuration(travel, reducedMotion) * (waypoint ? 1.35 : 1)
      const lift = waypoint ? 0 : flightLift(travel, reducedMotion)
      store.setCameraTarget([initialFocus.x, initialFocus.y, initialFocus.z])
      // `isTransitioning` disables the orbit controls for the flight.
      store.setTransitioning(true)

      const proxy = { t: 0 }
      const tween = gsap.to(proxy, {
        t: 1,
        duration,
        ease: waypoint ? 'power1.inOut' : 'power2.inOut',
        onUpdate: () => {
          const focus = destination.focus()
          const finish = destination.position(focus)
          if (waypoint) {
            bezier(flightPosition, startPosition, waypoint.position, finish, proxy.t)
            bezier(flightTarget, startTarget, waypoint.target, focus, proxy.t)
          } else {
            flightPosition.lerpVectors(startPosition, finish, proxy.t)
            flightPosition.y += Math.sin(proxy.t * Math.PI) * lift
            flightTarget.lerpVectors(startTarget, focus, proxy.t)
          }
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

      // Touching the scene mid-flight stops the flight where it is; the
      // controls come straight back so the user is never locked out.
      const interrupt = () => {
        if (flightRef.current !== tween) return
        tween.kill()
        flightRef.current = null
        useGalaxyStore.getState().setTransitioning(false)
      }
      canvas.addEventListener('pointerdown', interrupt)
      canvas.addEventListener('touchstart', interrupt, { passive: true })
      canvas.addEventListener('wheel', interrupt, { passive: true })


      return () => {
        canvas.removeEventListener('pointerdown', interrupt)
        canvas.removeEventListener('touchstart', interrupt)
        canvas.removeEventListener('wheel', interrupt)
        tween.kill()
        if (flightRef.current === tween) {
          flightRef.current = null
          useGalaxyStore.getState().setTransitioning(false)
        }
      }
    }

    start()

    return () => {
      cancelAnimationFrame(raf)
      cleanupFlight?.()
    }
  }, [camera, canvas, controls, viewMode, activeUniverseId, selectedWebsiteId, introPhase, overview, reducedMotion])

  return null
}
