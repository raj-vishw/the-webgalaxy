import type { Object3D } from 'three'

/**
 * Live lookup of scene objects by id (universes and websites), so the camera
 * can fly to and follow things that move without threading refs through the
 * tree. Full celestial objects register on mount; websites currently drawn
 * as a point cloud register a lightweight *placeholder* that a full object
 * overrides while it exists and that comes back when it unmounts.
 */
const objects = new Map<string, Object3D>()
const placeholders = new Map<string, Object3D>()

export const celestialRegistry = {
  register(id: string, object: Object3D) {
    objects.set(id, object)
    return () => {
      if (objects.get(id) === object) objects.delete(id)
    }
  },
  registerPlaceholder(id: string, object: Object3D) {
    placeholders.set(id, object)
    return () => {
      if (placeholders.get(id) === object) placeholders.delete(id)
    }
  },
  get(id: string) {
    return objects.get(id) ?? placeholders.get(id) ?? null
  },
}
