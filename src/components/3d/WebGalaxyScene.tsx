import { Canvas } from '@react-three/fiber'
import { Suspense, lazy } from 'react'
import { useQualityProfile } from '../../hooks/useQualityProfile'
import { useGalaxyStore } from '../../store/galaxyStore'
import { BackgroundNebula } from './BackgroundNebula'
import { CameraController } from './camera/CameraController'
import { DevBridge } from './DevBridge'
import { EmphasisBridge } from './EmphasisBridge'
import { GalaxyInteraction } from './interaction/GalaxyInteraction'
import { PointerTracker } from './PointerTracker'
import { DiscoveryPath } from './relationships/DiscoveryPath'
import { RelationshipGraph } from './relationships/RelationshipGraph'
import { StarField } from './StarField'
import { UniverseField } from './UniverseField'

const Effects = lazy(() => import('./Effects'))

const BACKGROUND = '#020308'

/** Full-viewport React Three Fiber scene: the whole of The WebGalaxy. */
export function WebGalaxyScene() {
  const profile = useQualityProfile()
  const pixelRatio = Math.min(window.devicePixelRatio || 1, profile.maxDpr)

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, profile.maxDpr]}
      camera={{ fov: 50, near: 0.5, far: 5000, position: [0, 2, 300] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      flat
      onPointerMissed={() => useGalaxyStore.getState().clearWebsite()}
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
      <CameraController profile={profile} />
      <BackgroundNebula />
      <StarField profile={profile} pixelRatio={pixelRatio} />
      <UniverseField profile={profile} pixelRatio={pixelRatio} />
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
