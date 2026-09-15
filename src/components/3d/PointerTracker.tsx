import { useFrame } from '@react-three/fiber'
import { sceneMotion } from '../../lib/sceneMotion'

interface PointerTrackerProps {
  enabled: boolean
}

/**
 * Smooths the raw pointer into `sceneMotion.pointer` once per frame so every
 * parallax layer reads the same eased value. Runs before other frame callbacks.
 */
export function PointerTracker({ enabled }: PointerTrackerProps) {
  useFrame(({ pointer }, delta) => {
    const target = enabled && !sceneMotion.dragging ? pointer : { x: 0, y: 0 }
    const k = 1 - Math.exp(-delta * 2.2)
    sceneMotion.pointer.x += (target.x - sceneMotion.pointer.x) * k
    sceneMotion.pointer.y += (target.y - sceneMotion.pointer.y) * k
  }, -10)
  return null
}
