import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { Group, Vector3 } from 'three'
import { sceneMotion } from '../lib/sceneMotion'

const right = new Vector3()
const up = new Vector3()

/**
 * Offsets a group in camera space according to the smoothed pointer position.
 * `strength` is the world-unit offset at full pointer deflection; nearer layers
 * should use larger values than distant ones so screen-space shift grows with
 * proximity, like a real camera nudge.
 */
export function useParallax(strength: number): RefObject<Group | null> {
  const ref = useRef<Group>(null)
  useFrame(({ camera }) => {
    const group = ref.current
    if (!group) return
    right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    const { x, y } = sceneMotion.pointer
    group.position
      .copy(right.multiplyScalar(x * strength))
      .add(up.multiplyScalar(y * strength))
  })
  return ref
}
