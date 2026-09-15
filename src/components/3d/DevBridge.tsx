import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { celestialRegistry } from '../../lib/celestialRegistry'
import { useGalaxyStore } from '../../store/galaxyStore'

declare global {
  interface Window {
    __webgalaxy?: {
      store: typeof useGalaxyStore
      /** Screen position (CSS px) of a registered universe or website, or null. */
      project: (id: string) => { x: number; y: number; distance: number } | null
      camera: () => { position: [number, number, number] }
    }
  }
}

const point = new Vector3()

/** Development-only hooks for driving the scene from tests and the console. */
export function DevBridge() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    window.__webgalaxy = {
      store: useGalaxyStore,
      camera: () => {
        const { camera } = get()
        return { position: [camera.position.x, camera.position.y, camera.position.z] }
      },
      project: (id) => {
        const object = celestialRegistry.get(id)
        if (!object) return null
        const { camera, size } = get()
        object.getWorldPosition(point)
        const distance = point.distanceTo(camera.position)
        point.project(camera)
        return { x: ((point.x + 1) / 2) * size.width, y: ((1 - point.y) / 2) * size.height, distance }
      },
    }
    return () => {
      delete window.__webgalaxy
    }
  }, [get])
  return null
}
