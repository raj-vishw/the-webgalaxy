import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, NormalBlending, type Sprite } from 'three'
import { createGlyphTexture } from '../../../utils/celestial'
import type { CelestialFrameState } from './celestialFrame'

interface GlyphSpriteProps {
  glyph: string
  frame: RefObject<CelestialFrameState>
  scale: number
  color: string
  opacity: number
  additive?: boolean
}

/** A website's monogram, shown only at full detail so it reads as part of the body. */
export function GlyphSprite({ glyph, frame, scale, color, opacity, additive = false }: GlyphSpriteProps) {
  const ref = useRef<Sprite>(null)
  const texture = useMemo(() => createGlyphTexture(glyph), [glyph])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame(() => {
    const sprite = ref.current
    if (!sprite) return
    const f = frame.current
    sprite.visible = f.lod !== 'point' && f.visibility > 0.2
    sprite.material.opacity = opacity * f.visibility * (1 - f.dim * 0.5)
  })

  return (
    <sprite ref={ref} scale={scale}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={additive ? AdditiveBlending : NormalBlending}
      />
    </sprite>
  )
}
