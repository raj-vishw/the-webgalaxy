import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { CanvasTexture, SRGBColorSpace, Vector3, type Sprite } from 'three'
import type { LogoAtlas } from '../../../lib/logoAtlas'
import type { WebsiteDefinition } from '../../../types/galaxy'
import { accentFor } from '../../../utils/celestial'
import type { CelestialFrameState } from './celestialFrame'

interface EmblemProps {
  website: WebsiteDefinition
  atlas: LogoAtlas
  frame: RefObject<CelestialFrameState>
  /** Body radius in world units. */
  size: number
}

const TEXTURE_PX = 96
const worldPosition = new Vector3()
const toCamera = new Vector3()

/**
 * The website's icon worn on the lit face of its body, like a sigil: a small
 * dark disc so any icon reads against any surface, a thin ring in the site's
 * accent, and the icon itself. It always turns to the camera and sits just
 * outside the surface, so it is never swallowed by the body's own rotation.
 */
export function Emblem({ website, atlas, frame, size }: EmblemProps) {
  const ref = useRef<Sprite>(null)
  const rect = atlas.rectOf(website.id)

  const texture = useMemo(() => {
    if (!rect) return null
    const canvas = document.createElement('canvas')
    canvas.width = TEXTURE_PX
    canvas.height = TEXTURE_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const c = TEXTURE_PX / 2
    ctx.beginPath()
    ctx.arc(c, c, c - 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(8, 10, 24, 0.84)'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = accentFor(website)
    ctx.globalAlpha = 0.75
    ctx.stroke()
    ctx.globalAlpha = 1
    const icon = TEXTURE_PX * 0.6
    ctx.drawImage(atlas.image, rect.x, rect.y, rect.size, rect.size, c - icon / 2, c - icon / 2, icon, icon)
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    return t
  }, [atlas, rect, website])
  useEffect(() => () => texture?.dispose(), [texture])

  useFrame(({ camera }) => {
    const sprite = ref.current
    if (!sprite || !sprite.parent) return
    const f = frame.current
    sprite.visible = f.lod !== 'point' && f.visibility > 0.2
    if (!sprite.visible) return
    sprite.parent.getWorldPosition(worldPosition)
    toCamera.subVectors(camera.position, worldPosition).normalize()
    // Parent groups carry no rotation, so a world direction is a local one.
    const lift = size * 1.04 * (1 + 0.12 * f.hover + 0.1 * f.focus)
    sprite.position.copy(toCamera).multiplyScalar(lift)
    const s = size * 0.86 * (1 + 0.12 * f.hover + 0.1 * f.focus)
    sprite.scale.set(s, s, 1)
    sprite.material.opacity = f.visibility * (1 - f.dim * 0.55)
  })

  if (!texture) return null
  return (
    <sprite ref={ref}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}
