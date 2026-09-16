import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, MathUtils, type Mesh, type MeshBasicMaterial, type Sprite } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import type { WebsiteDefinition } from '../../../types/galaxy'
import { accentFor, glowFor, haloScaleFor, hashString, glyphFor } from '../../../utils/celestial'
import type { CelestialFrameState } from './celestialFrame'
import { GlyphSprite } from './GlyphSprite'
import { ObjectGlow } from './ObjectGlow'

interface StarWebsiteProps {
  website: WebsiteDefinition
  frame: RefObject<CelestialFrameState>
  profile: QualityProfile
  /** The site wears an icon emblem instead of its monogram. */
  emblem?: boolean
}

/** A prominent website: small bright core, layered glow, gentle pulse. */
export function StarWebsite({ website, frame, profile, emblem = false }: StarWebsiteProps) {
  const coreRef = useRef<Mesh>(null)
  const innerRef = useRef<Sprite>(null)
  const outerRef = useRef<Sprite>(null)
  const glow = glowFor(website)
  const halo = haloScaleFor(website)
  const accent = accentFor(website)
  const glyph = glyphFor(website)
  const phase = useMemo(() => (hashString(website.id) % 1000) / 1000 * Math.PI * 2, [website.id])
  const coreColor = useMemo(() => new Color(accent).lerp(new Color('#ffffff'), 0.55), [accent])

  useFrame(({ clock }) => {
    const f = frame.current
    const pulse = 1 + 0.05 * Math.sin(clock.elapsedTime * 1.4 + phase)
    const lift = 1 + f.hover * 0.5 + f.focus * 0.35
    const fade = f.visibility * (1 - f.dim * 0.55)
    // Up close the wide corona would flood the view, so it thins out.
    const proximity = MathUtils.clamp(f.distance / (f.size * 34), 0.22, 1)

    if (coreRef.current) {
      coreRef.current.visible = f.lod !== 'point'
      ;(coreRef.current.material as MeshBasicMaterial).opacity = fade
    }
    if (innerRef.current) {
      innerRef.current.material.opacity = 0.85 * glow * fade * lift * (0.55 + 0.45 * proximity)
      innerRef.current.scale.setScalar(4.5 * pulse)
    }
    if (outerRef.current) {
      outerRef.current.material.opacity = 0.22 * glow * fade * lift * proximity
      outerRef.current.scale.setScalar(11 * (1 + 0.04 * Math.sin(clock.elapsedTime * 0.9 + phase)))
    }
  })

  return (
    <group>
      <mesh ref={coreRef} scale={0.8}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshBasicMaterial color={coreColor} transparent />
      </mesh>
      <ObjectGlow ref={innerRef} color={accent} whiten={0.45} scale={3.4 * halo} />
      <ObjectGlow ref={outerRef} color={accent} whiten={0.1} scale={8.5 * halo} />
      {profile.tier !== 'low' && !emblem && (
        <GlyphSprite glyph={glyph} frame={frame} scale={1.25} color="#0b0d18" opacity={0.6} />
      )}
    </group>
  )
}
