import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { celestialRegistry } from '../../lib/celestialRegistry'
import { registerIntroTimeline } from '../../lib/intro'
import { sceneMotion } from '../../lib/sceneMotion'
import { useGalaxyStore } from '../../store/galaxyStore'
import type { CelestialObjectType, ExplorationMode } from '../../types/galaxy'
import { sizeFor } from '../../utils/celestial'

const INTRO_START = new Vector3(0, 2, 300)
const INTRO_APPROACH = new Vector3(0, 5, 72)
/** Resting overview for landscape viewports: in front of and above the galaxy. */
const LANDSCAPE_DIRECTION = new Vector3(0, 34, 118).normalize()
/**
 * Portrait viewports look almost straight down from the side, so the galaxy's
 * long axis runs down the screen instead of being squeezed across it.
 */
const PORTRAIT_DIRECTION = new Vector3(-0.174, 0.985, 0).normalize()
const OVERVIEW_DISTANCE = 124
const LANDSCAPE_TARGET = new Vector3(0, 0, 0)
/** Centre of the layout's depth range, so the portrait framing is balanced. */
const PORTRAIT_TARGET = new Vector3(0, 0, -20)

interface Overview {
  position: Vector3
  target: Vector3
}

/** Viewing distance when focusing a website, by object type (× size + base). */
const WEBSITE_VIEW: Record<CelestialObjectType, { perSize: number; base: number }> = {
  star: { perSize: 14, base: 9 },
  planet: { perSize: 6.5, base: 3 },
  moon: { perSize: 8, base: 3 },
  comet: { perSize: 7, base: 6 },
}
/** Viewing distance when entering a universe, as a multiple of its scale. */
const UNIVERSE_VIEW_FACTOR = 3

interface Destination {
  /** Live focus point (websites move). */
  focus: () => Vector3
  /** Camera position for a given focus. */
  position: (focus: Vector3) => Vector3
}

const focusPoint = new Vector3()
const focusDelta = new Vector3()
const approach = new Vector3()
const destinationPosition = new Vector3()
const flightStartPosition = new Vector3()
const flightStartTarget = new Vector3()
const flightPosition = new Vector3()
const flightTarget = new Vector3()

/**
 * Approach direction: keep the side the camera is already on (no swinging
 * around the target) but stay a little elevated so the view reads as 3D.
 */
function approachDirection(from: Vector3, focus: Vector3, minElevation: number) {
  approach.subVectors(from, focus)
  if (approach.lengthSq() < 1e-6) approach.set(0, 0.4, 1)
  approach.normalize()
  if (approach.y < minElevation) approach.y = minElevation
  return approach.normalize()
}

/**
 * Picks the resting camera for the current aspect ratio. Horizontal field of
 * view shrinks with aspect, so narrower viewports sit further back; portrait
 * also switches to the side-on framing.
 */
function overviewFor(aspect: number): Overview {
  if (aspect < 1) {
    const factor = MathUtils.clamp(1.38 / aspect, 1.5, 3.6)
    const target = PORTRAIT_TARGET
    return { target, position: PORTRAIT_DIRECTION.clone().multiplyScalar(OVERVIEW_DISTANCE * factor).add(target) }
  }
  const factor = MathUtils.clamp(1.7 / aspect, 1, 2.2)
  const target = LANDSCAPE_TARGET
  return { target, position: LANDSCAPE_DIRECTION.clone().multiplyScalar(OVERVIEW_DISTANCE * factor).add(target) }
}

/**
 * Drives the cinematic intro with GSAP, then hands the camera to damped orbit
 * controls. The timeline also publishes reveal progress for the shaders and
 * milestone flags for the DOM overlay.
 */
export function CameraController() {
  const camera = useThree((s) => s.camera)
  const getState = useThree((s) => s.get)
  const aspect = useThree((s) => s.viewport.aspect)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const hoveredUniverseId = useGalaxyStore((s) => s.hoveredUniverseId)
  const explorationMode = useGalaxyStore((s) => s.explorationMode)
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const flightRef = useRef<gsap.core.Tween | null>(null)
  const previousModeRef = useRef<ExplorationMode>('galaxy')

  const overview = useMemo(() => overviewFor(aspect), [aspect])

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

    setIntroPhase('playing')
    registerIntroTimeline(tl)

    return () => {
      registerIntroTimeline(null)
      tl.kill()
    }
  }, [camera, getState])

  // Keep the camera aimed at the galaxy while GSAP owns its position.
  useFrame(() => {
    if (introPhase !== 'complete') camera.lookAt(overview.target)
  })

  // ─── Exploration flights ──────────────────────────────────────────────────
  useEffect(() => {
    if (introPhase !== 'complete') return
    const controls = controlsRef.current
    if (!controls) return
    const from = previousModeRef.current
    previousModeRef.current = explorationMode

    let destination: Destination | null = null
    if (explorationMode === 'galaxy' && from !== 'galaxy') {
      destination = {
        focus: () => focusPoint.copy(overview.target),
        position: () => destinationPosition.copy(overview.position),
      }
    } else if (explorationMode === 'universe' && activeUniverseId) {
      const universe = universes.find((u) => u.id === activeUniverseId)
      const object = celestialRegistry.get(activeUniverseId)
      if (universe && object) {
        const distance = universe.scale * UNIVERSE_VIEW_FACTOR
        const direction = approachDirection(camera.position, object.getWorldPosition(focusPoint), 0.28).clone()
        destination = {
          focus: () => object.getWorldPosition(focusPoint),
          position: (focus) => destinationPosition.copy(focus).addScaledVector(direction, distance),
        }
      }
    } else if (explorationMode === 'website' && selectedWebsiteId) {
      const website = websites.find((w) => w.id === selectedWebsiteId)
      const object = celestialRegistry.get(selectedWebsiteId)
      if (website && object) {
        const view = WEBSITE_VIEW[website.objectType]
        const distance = sizeFor(website) * view.perSize + view.base
        const direction = approachDirection(camera.position, object.getWorldPosition(focusPoint), 0.15).clone()
        destination = {
          focus: () => object.getWorldPosition(focusPoint),
          position: (focus) => destinationPosition.copy(focus).addScaledVector(direction, distance),
        }
      }
    }
    if (!destination) return

    flightRef.current?.kill()
    flightStartPosition.copy(camera.position)
    flightStartTarget.copy(controls.target)
    const initialFocus = destination.focus()
    const travel = flightStartPosition.distanceTo(destination.position(initialFocus))
    const duration = MathUtils.clamp(travel / 55, 1.4, 3.4)
    const lift = Math.min(travel * 0.12, 18)
    useGalaxyStore.getState().setCameraTarget([initialFocus.x, initialFocus.y, initialFocus.z])
    // The controls hand the camera to the flight and get it back on arrival.
    controls.enabled = false

    const proxy = { t: 0 }
    const tween = gsap.to(proxy, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const focus = destination.focus()
        const end = destination.position(focus)
        flightPosition.lerpVectors(flightStartPosition, end, proxy.t)
        // A gentle arc keeps long journeys from feeling like a straight zoom.
        flightPosition.y += Math.sin(proxy.t * Math.PI) * lift
        flightTarget.lerpVectors(flightStartTarget, focus, proxy.t)
        camera.position.copy(flightPosition)
        controls.target.copy(flightTarget)
        camera.lookAt(flightTarget)
      },
      onComplete: () => {
        flightRef.current = null
        controls.enabled = true
      },
    })
    flightRef.current = tween
    return () => {
      tween.kill()
      if (flightRef.current === tween) {
        flightRef.current = null
        controls.enabled = true
      }
    }
  }, [camera, explorationMode, activeUniverseId, selectedWebsiteId, introPhase, overview])

  // While a website is focused, keep the camera riding along with its orbit.
  useFrame(() => {
    const controls = controlsRef.current
    if (!controls || flightRef.current) return
    const { explorationMode: mode, selectedWebsiteId: id } = useGalaxyStore.getState()
    if (mode !== 'website' || !id) return
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
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={introPhase === 'complete'}
      enableDamping
      dampingFactor={0.045}
      rotateSpeed={0.35}
      zoomSpeed={0.5}
      panSpeed={0.35}
      minDistance={3}
      maxDistance={maxDistance}
      minPolarAngle={0.12}
      maxPolarAngle={1.4}
      autoRotate={explorationMode === 'galaxy' && hoveredUniverseId === null}
      autoRotateSpeed={0.12}
      onStart={() => {
        sceneMotion.dragging = true
      }}
      onEnd={() => {
        sceneMotion.dragging = false
      }}
    />
  )
}
