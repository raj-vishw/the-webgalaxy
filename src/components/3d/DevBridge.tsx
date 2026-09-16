import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector2, Vector3 } from 'three'
import { celestialRegistry } from '../../lib/celestialRegistry'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'

declare global {
  interface Window {
    __webgalaxy?: {
      store: typeof useGalaxyStore
      catalog: typeof useCatalogStore
      /** Screen position (CSS px) of a registered universe or website, or null. */
      project: (id: string) => { x: number; y: number; distance: number } | null
      camera: () => { position: [number, number, number] }
      /** What a pointer at this screen point would hit, nearest first. */
      hitTest: (x: number, y: number) => { type: string; name: string; index: number | null; distance: number; threshold: number | null }[]
      /** Renderer statistics for the last frame. */
      renderInfo: () => { calls: number; triangles: number; points: number; geometries: number; textures: number }
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
      catalog: useCatalogStore,
      camera: () => {
        const { camera } = get()
        return { position: [camera.position.x, camera.position.y, camera.position.z] }
      },
      renderInfo: () => {
        const { gl } = get()
        return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, points: gl.info.render.points, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }
      },
      // What the pointer would hit at a screen point (for tests and tuning).
      hitTest: (x, y) => {
        const { camera, raycaster, scene, size } = get()
        raycaster.setFromCamera(new Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera)
        return raycaster.intersectObjects(scene.children, true).slice(0, 5).map((h) => ({ type: h.object.type, name: h.object.name, index: h.index ?? null, distance: Math.round(h.distance), threshold: raycaster.params.Points?.threshold ?? null }))
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
