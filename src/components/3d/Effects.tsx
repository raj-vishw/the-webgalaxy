import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

/**
 * Post-processing stack: a restrained bloom so bright cores breathe, and a
 * soft vignette to pull focus to the centre. Lazy-loaded and skipped entirely
 * on low-end devices.
 */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.32} luminanceSmoothing={0.35} radius={0.75} />
      <Vignette eskil={false} offset={0.22} darkness={0.5} />
    </EffectComposer>
  )
}
