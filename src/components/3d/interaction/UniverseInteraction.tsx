import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import { Mesh } from 'three'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition } from '../../../types/galaxy'

/**
 * While the camera is inside a universe its hit sphere must not intersect at
 * all: R3F keeps a hovered-and-stopped object blocking pointer events for
 * everything behind it until it leaves the hit list.
 */
const noRaycast = () => null

interface UniverseInteractionProps {
  definition: UniverseDefinition
  /** Disabled while the camera is inside this universe so websites get the clicks. */
  enabled: boolean
  onHoverChange: (hovered: boolean) => void
}

/**
 * Invisible hit volume for a universe (the particle cloud itself cannot be
 * raycast). Hovering highlights the structure; clicking travels into it.
 */
export function UniverseInteraction({ definition, enabled, onHoverChange }: UniverseInteractionProps) {
  const [hovered, setHovered] = useState(false)
  const setHoveredUniverse = useGalaxyStore((s) => s.setHoveredUniverse)
  const enterUniverse = useGalaxyStore((s) => s.enterUniverse)

  useCursor(hovered && enabled)

  const onPointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return
      e.stopPropagation()
      setHovered(true)
      onHoverChange(true)
      setHoveredUniverse(definition.id)
    },
    [definition.id, enabled, onHoverChange, setHoveredUniverse],
  )

  const onPointerOut = useCallback(() => {
    setHovered(false)
    onHoverChange(false)
    useGalaxyStore.setState((s) => (s.hoveredUniverseId === definition.id ? { hoveredUniverseId: null } : s))
  }, [definition.id, onHoverChange])

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!enabled) return
      e.stopPropagation()
      setHovered(false)
      onHoverChange(false)
      enterUniverse(definition.id)
    },
    [definition.id, enabled, enterUniverse, onHoverChange],
  )

  return (
    <mesh
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
      raycast={enabled ? Mesh.prototype.raycast : noRaycast}
    >
      <sphereGeometry args={[1.2, 12, 10]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  )
}
