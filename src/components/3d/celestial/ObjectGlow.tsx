import { forwardRef, useMemo } from 'react'
import { AdditiveBlending, Color, type Sprite } from 'three'
import { getGlowTexture } from '../../../utils/celestial'

interface ObjectGlowProps {
  color: string
  /** Blend toward white (0 = pure accent, 1 = white). */
  whiten?: number
  scale: number
  opacity?: number
  depthTest?: boolean
}

/**
 * Additive billboard glow. The owner animates `material.opacity` and `scale`
 * per frame through the forwarded ref.
 */
export const ObjectGlow = forwardRef<Sprite, ObjectGlowProps>(function ObjectGlow(
  { color, whiten = 0, scale, opacity = 1, depthTest = true },
  ref,
) {
  const tint = useMemo(() => new Color(color).lerp(new Color('#ffffff'), whiten), [color, whiten])
  const texture = useMemo(() => getGlowTexture(), [])
  return (
    <sprite ref={ref} scale={scale}>
      <spriteMaterial
        map={texture}
        color={tint}
        opacity={opacity}
        transparent
        depthWrite={false}
        depthTest={depthTest}
        blending={AdditiveBlending}
      />
    </sprite>
  )
})
