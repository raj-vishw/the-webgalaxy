import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
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

const INTRO_START = new Vector3(0, 2, 300)
const INTRO_APPROACH = new Vector3(0, 5, 72)

const focusPoint = new Vector3()
const focusDelta = new Vector3()

/**
 * Owns the camera: the cinematic intro (GSAP), damped orbit controls for free
 * exploration, the follow behaviour while a website is focused, and the
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

  const overview = useMemo(() => overviewFor(aspect), [aspect])

  // ─── Intro ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { setIntroPhase, setIntroMilestone } = useGalaxyStore.getState()
    const destination = overviewFor(getState().viewport.aspect)

    camera.position.copy(INTRO_START)
    camera.lookAt(destination.target)
    controlsRef.current?.target.copy(destination.target)
    sceneMotion.starReveal = 0
    sceneMotion.universeReveal = 0

    const tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } })
    tl.to(sceneMotion, { starReveal: 0.3, duration: 4 }, 0)
      .to(camera.position, { x: INTRO_APPROACH.x, y: INTRO_APPROACH.y, z: INTRO_APPROACH.z, duration: 6.8, ease: 'power2.inOut' }, 0)
      .to(sceneMotion, { starReveal: 1, duration: 5 }, 2)
      .call(() => setIntroMilestone('titleVisible', true), [], 3.2)
      .call(() => setIntroMilestone('subtitleVisible', true), [], 4.4)
      .to(camera.position, { x: destination.position.x, y: destination.position.y, z: destination.position.z, duration: 5, ease: 'power2.inOut' }, 6.8)
      .to(sceneMotion, { universeReveal: 1, duration: 4.2 }, 7)
      .call(() => {
        setIntroMilestone('titleVisible', false)
        setIntroMilestone('subtitleVisible', false)
      }, [], 9.4)
      .call(() => setIntroMilestone('chromeVisible', true), [], 10.4)
      .call(() => setIntroPhase('complete'), [], 11.8)

    // Reduced motion keeps the sequence (it is how the scene appears) but
    // plays it several times faster so the camera settles quickly.
    if (profile.reducedMotion) tl.timeScale(4)

    setIntroPhase('playing')
    registerIntroTimeline(tl)

    return () => {
      registerIntroTimeline(null)
      tl.kill()
    }
  }, [camera, getState, profile.reducedMotion])

  // Keep the camera aimed at the galaxy while GSAP owns its position.
  useFrame(() => {
    if (introPhase !== 'complete') camera.lookAt(overview.target)
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
        autoRotate={!profile.reducedMotion && viewMode === 'galaxy' && hoveredUniverseId === null}
        autoRotateSpeed={0.12}
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
