import type { Object3D } from 'three'

/**
 * Live lookup of scene objects by id (universes and websites), so the camera
 * can fly to and follow things that move without threading refs through the
 * tree. Entries are registered on mount and removed on unmount.
 */
const objects = new Map<string, Object3D>()

export const celestialRegistry = {
  register(id: string, object: Object3D) {
    objects.set(id, object)
    return () => {
      if (objects.get(id) === object) objects.delete(id)
    }
  },
  get(id: string) {
    return objects.get(id) ?? null
  },
}
