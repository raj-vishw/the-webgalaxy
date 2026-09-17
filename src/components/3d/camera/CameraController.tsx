import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useIdle } from '../../../hooks/useIdle'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { registerIntroTimeline } from '../../../lib/intro'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useGalaxyStore } from '../../../store/galaxyStore'
import { overviewFor } from '../../../utils/camera'
import { CameraTransition } from './CameraTransition'

interface CameraControllerProps {
  profile: QualityProfile
}

/** Where the camera waits behind the landing title, relative to the overview. */
const LANDING_PULLBACK = 1.75
const LANDING_LIFT = 0.1
/** Flight lengths in seconds: first visit, returning visitor, reduced motion. */
const CINEMATIC_SECONDS = 4.6
const RETURNING_SECONDS = 2.3
const REDUCED_SECONDS = 0.6
/** How far the landing view drifts forward per second while the title is up. */
const LANDING_DRIFT = 0.012

const focusPoint = new Vector3()
const focusDelta = new Vector3()
const heading = new Vector3()
const landingPose = new Vector3()

function landingPositionFor(overview: { position: Vector3; target: Vector3 }, out: Vector3) {
  out.subVectors(overview.position, overview.target).multiplyScalar(LANDING_PULLBACK)
  out.y += out.length() * LANDING_LIFT
  return out.add(overview.target)
}

/**
 * Owns the camera: the entry sequence (landing pose with a slow forward
 * drift, then the GSAP flight into the overview), damped orbit controls for
 * free exploration, the follow behaviour while a website is focused, and the
 * exploration flights via `CameraTransition`.
 */
export function CameraController({ profile }: CameraControllerProps) {
  const camera = useThree((s) => s.camera)
  const getState = useThree((s) => s.get)
  const aspect = useThree((s) => s.viewport.aspect)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const hoveredUniverseId = useGalaxyStore((s) => s.hoveredUniverseId)
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const isTransitioning = useGalaxyStore((s) => s.isTransitioning)
  // Left alone for a few seconds, the overview glides around the galaxy.
  const idle = useIdle(5000)

  const overview = useMemo(() => overviewFor(aspect), [aspect])

  // ─── Landing: the galaxy appears behind the title ─────────────────────────
  useEffect(() => {
    if (introPhase !== 'loading' && introPhase !== 'landing') return
    const destination = overviewFor(getState().viewport.aspect)
    camera.position.copy(landingPositionFor(destination, landingPose))
    camera.lookAt(destination.target)
    controlsRef.current?.target.copy(destination.target)
    // Stars first, then the universes — the reveal plays under the loading screen.
    const tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } })
    if (sceneMotion.starReveal < 1) tl.to(sceneMotion, { starReveal: 1, duration: 2.6 }, 0)
    if (sceneMotion.universeReveal < 1) tl.to(sceneMotion, { universeReveal: 1, duration: 3.2 }, 0.8)
    // Labels wait behind the title.
    tl.to(sceneMotion, { labelReveal: 0, duration: 0.6 }, 0)
    if (profile.reducedMotion) tl.timeScale(3)
    return () => {
      tl.kill()
      sceneMotion.starReveal = 1
      sceneMotion.universeReveal = 1
    }
  }, [camera, getState, introPhase, profile.reducedMotion])

  // ─── Cinematic: "Enter the WebGalaxy" flies into the overview ─────────────
  useEffect(() => {
    if (introPhase !== 'playing') return
    const { finishIntro, intro } = useGalaxyStore.getState()
    const destination = overviewFor(getState().viewport.aspect)
    const duration = profile.reducedMotion ? REDUCED_SECONDS : intro.cinematic ? CINEMATIC_SECONDS : RETURNING_SECONDS
    const tl = gsap.timeline()
    tl.to(camera.position, { x: destination.position.x, y: destination.position.y, z: destination.position.z, duration, ease: 'power2.inOut' }, 0)
      .to(sceneMotion, { labelReveal: 1, duration: Math.max(0.4, duration * 0.5), ease: 'sine.out' }, duration * 0.45)
      .call(finishIntro, [], duration)
    registerIntroTimeline(tl)
    return () => {
      registerIntroTimeline(null)
      tl.kill()
    }
  }, [camera, getState, introPhase, profile.reducedMotion])

  // Keep the camera aimed at the galaxy while the sequence owns its position
  // (with a barely perceptible forward drift behind the title), and publish
  // the pose for the minimap.
  useFrame((_, delta) => {
    if (introPhase !== 'complete') {
      if ((introPhase === 'landing' || introPhase === 'loading') && !profile.reducedMotion) {
        camera.position.lerp(overview.position, LANDING_DRIFT * delta)
      }
      camera.lookAt(overview.target)
    }
    camera.getWorldDirection(heading)
    sceneMotion.camera.x = camera.position.x
    sceneMotion.camera.z = camera.position.z
    sceneMotion.camera.headingX = heading.x
    sceneMotion.camera.headingZ = heading.z
  })

  // While a website is focused, keep the camera riding along with its orbit.
  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return
    const { viewMode: mode, selectedWebsiteId: id, isTransitioning: flying } = useGalaxyStore.getState()
    if (flying || mode !== 'website' || !id) return
    const object = celestialRegistry.get(id)
    if (!object) return
    object.getWorldPosition(focusPoint)
    focusDelta.subVectors(focusPoint, controls.target)
    if (focusDelta.lengthSq() < 1e-10) return
    camera.position.add(focusDelta)
    controls.target.copy(focusPoint)
  })

  const maxDistance = Math.max(260, overview.position.distanceTo(overview.target) * 1.25)

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={introPhase === 'complete' && !isTransitioning}
        enableDamping
        dampingFactor={0.045}
        rotateSpeed={0.35}
        zoomSpeed={0.5}
        panSpeed={0.35}
        minDistance={3}
        maxDistance={maxDistance}
        minPolarAngle={0.12}
        maxPolarAngle={1.4}
        autoRotate={!profile.reducedMotion && viewMode === 'galaxy' && hoveredUniverseId === null && idle}
        autoRotateSpeed={0.3}
        onStart={() => {
          sceneMotion.dragging = true
        }}
        onEnd={() => {
          sceneMotion.dragging = false
        }}
      />
      <CameraTransition controls={controlsRef} overview={overview} reducedMotion={profile.reducedMotion} />
    </>
  )
}
