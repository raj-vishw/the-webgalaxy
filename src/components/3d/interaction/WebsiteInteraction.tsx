import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Mesh } from 'three'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { WebsiteDefinition } from '../../../types/galaxy'
import { tagInteraction } from '../../../utils/interaction'
import type { CelestialFrameState } from '../celestial/celestialFrame'

interface WebsiteInteractionProps {
  website: WebsiteDefinition
  /** Hit radius in the object's unit space (1 = the object's visual radius). */
  radius: number
  frame: RefObject<CelestialFrameState>
}

/** Pointer handling for one website object: hover → store, click → select. */
export function WebsiteInteraction({ website, radius, frame }: WebsiteInteractionProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const setHoveredWebsite = useGalaxyStore((s) => s.setHoveredWebsite)
  const selectWebsite = useGalaxyStore((s) => s.selectWebsite)

  useEffect(() => {
    if (meshRef.current) tagInteraction(meshRef.current, { kind: 'website', id: website.id })
  }, [website.id])

  useCursor(hovered)

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    // Objects that have faded out with distance must not react.
    if (frame.current.visibility < 0.3) return
    e.stopPropagation()
    setHovered(true)
    setHoveredWebsite(website.id)
  }

  const onPointerOut = () => {
    setHovered(false)
    useGalaxyStore.setState((s) => (s.hoveredWebsiteId === website.id ? { hoveredWebsiteId: null } : s))
  }

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (frame.current.visibility < 0.3) return
    e.stopPropagation()
    selectWebsite(website.id, website.universeId)
  }

  // A website that leaves the scene while hovered releases the hover — but
  // only on a real unmount. A point promoted to a full object mounts while
  // it is already the hovered website, and StrictMode's rehearsal unmount
  // must not clear that, so the check is deferred past any remount.
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      queueMicrotask(() => {
        if (!mountedRef.current) useGalaxyStore.setState((s) => (s.hoveredWebsiteId === website.id ? { hoveredWebsiteId: null } : s))
      })
    }
  }, [website.id])

  return (
    <mesh ref={meshRef} onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
      <sphereGeometry args={[radius, 10, 8]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  )
}
