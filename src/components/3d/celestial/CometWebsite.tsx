import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, type Mesh, type MeshBasicMaterial, type Sprite } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import type { WebsiteDefinition } from '../../../types/galaxy'
import { accentFor, glowFor, glyphFor, haloScaleFor } from '../../../utils/celestial'
import type { CelestialFrameState } from './celestialFrame'
import { GlyphSprite } from './GlyphSprite'
import { ObjectGlow } from './ObjectGlow'

interface CometWebsiteProps {
  website: WebsiteDefinition
  frame: RefObject<CelestialFrameState>
  profile: QualityProfile
  /** The site wears an icon emblem instead of its monogram. */
  emblem?: boolean
}

/** The head of a comet: a bright nucleus and coma. The tail is drawn by `CometTrail`. */
export function CometWebsite({ website, frame, profile, emblem = false }: CometWebsiteProps) {
  const coreRef = useRef<Mesh>(null)
  const comaRef = useRef<Sprite>(null)
  const glow = glowFor(website)
  const accent = accentFor(website)
  const glyph = glyphFor(website)
  const coreColor = useMemo(() => new Color(accent).lerp(new Color('#ffffff'), 0.7), [accent])

  useFrame(({ clock }) => {
    const f = frame.current
    const fade = f.visibility * (1 - f.dim * 0.55)
    if (coreRef.current) {
      coreRef.current.visible = f.lod !== 'point'
      ;(coreRef.current.material as MeshBasicMaterial).opacity = fade
    }
    if (comaRef.current) {
      const flicker = 1 + 0.06 * Math.sin(clock.elapsedTime * 2.3)
      comaRef.current.material.opacity = 0.6 * glow * fade * (1 + f.hover * 0.6 + f.focus * 0.3)
      comaRef.current.scale.setScalar(4 * flicker)
    }
  })

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color={coreColor} transparent />
      </mesh>
      <ObjectGlow ref={comaRef} color={accent} whiten={0.35} scale={3.2 * haloScaleFor(website)} />
      {profile.tier !== 'low' && !emblem && (
        <GlyphSprite glyph={glyph} frame={frame} scale={1.8} color="#ffffff" opacity={0.5} additive />
      )}
    </group>
  )
}
