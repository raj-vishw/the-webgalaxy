import { Canvas } from '@react-three/fiber'
import { Suspense, lazy, useCallback, useState } from 'react'
import { useQualityProfile } from '../../hooks/useQualityProfile'
import { baselineDpr } from '../../lib/renderScale'
import { useGalaxyStore } from '../../store/galaxyStore'
import { BackgroundNebula } from './BackgroundNebula'
import { CameraController } from './camera/CameraController'
import { AdaptiveQuality } from './AdaptiveQuality'
import { ResolutionGovernor } from './ResolutionGovernor'
import { DevBridge } from './DevBridge'
import { PerfMonitor } from './PerfMonitor'
import { EmphasisBridge } from './EmphasisBridge'
import { GalaxyInteraction } from './interaction/GalaxyInteraction'
import { PointerTracker } from './PointerTracker'
import { DiscoveryPath } from './relationships/DiscoveryPath'
import { RelationshipGraph } from './relationships/RelationshipGraph'
import { StarField } from './StarField'
import { GalacticDisc } from './GalacticDisc'
import { GalaxyLife } from './GalaxyLife'
import { UniverseField } from './UniverseField'

const Effects = lazy(() => import('./Effects'))

const BACKGROUND = '#020308'

/** Full-viewport React Three Fiber scene: the whole of The WebGalaxy. */
export function WebGalaxyScene() {
  const profile = useQualityProfile()
  // The canvas resolution is governed (see ResolutionGovernor): it starts at
  // the tier's pixel budget for this viewport and follows the frame rate.
  // Every point shader sizes in device pixels, so the same ratio flows down.
  const [pixelRatio, setPixelRatio] = useState(() => baselineDpr(profile.tier, window.innerWidth, window.innerHeight, profile.maxDpr))
  const onResolution = useCallback((dpr: number) => setPixelRatio(dpr), [])

  return (
    <Canvas
      className="absolute inset-0"
      dpr={pixelRatio}
      camera={{ fov: 50, near: 0.5, far: 5000, position: [0, 2, 300] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      flat
      onPointerMissed={() => useGalaxyStore.getState().clearWebsite()}
      // Points (the non-detailed websites) answer the pointer within this many world units.
      raycaster={{ params: { Points: { threshold: 1.4 }, Line: { threshold: 1 }, Mesh: {}, LOD: {}, Sprite: {} } }}
      onCreated={() => useGalaxyStore.getState().setSceneReady(true)}
    >
      <color attach="background" args={[BACKGROUND]} />
      {/* Soft key light for planets; everything else is self-illuminated. */}
      <ambientLight intensity={0.55} color="#c9d4ff" />
      <directionalLight position={[-40, 60, 80]} intensity={3.2} color="#fff4e6" />
      <PointerTracker enabled={!profile.coarsePointer && !profile.reducedMotion} />
      <GalaxyInteraction reducedMotion={profile.reducedMotion} />
      <EmphasisBridge />
      {import.meta.env.DEV && <DevBridge />}
      {import.meta.env.DEV && <PerfMonitor />}
      <ResolutionGovernor profile={profile} dpr={pixelRatio} onChange={onResolution} />
      <AdaptiveQuality />
      <CameraController profile={profile} />
      <BackgroundNebula />
      <StarField profile={profile} pixelRatio={pixelRatio} />
      <GalacticDisc profile={profile} pixelRatio={pixelRatio} />
      <UniverseField profile={profile} pixelRatio={pixelRatio} />
      <GalaxyLife pixelRatio={pixelRatio} reducedMotion={profile.reducedMotion} />
      {/* Connections and the explorer's trail: only what is relevant right now is drawn. */}
      <RelationshipGraph pixelRatio={pixelRatio} reducedMotion={profile.reducedMotion} />
      <DiscoveryPath pixelRatio={pixelRatio} reducedMotion={profile.reducedMotion} />
      {profile.postProcessing && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  )
}
