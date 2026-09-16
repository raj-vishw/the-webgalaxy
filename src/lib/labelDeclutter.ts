/**
 * Screen-space decluttering for universe labels. With two dozen universes no
 * static layout keeps every label clear at every aspect ratio and camera
 * pose, so each frame every universe reports where its label lands and how
 * big it is; the higher-priority label of any overlapping pair stays, the
 * other fades out. Priorities: hovered and active universes always win, then
 * the ones nearer the camera.
 */
interface Entry {
  x: number
  y: number
  halfWidth: number
  halfHeight: number
  priority: number
}

const entries = new Map<string, Entry>()
const hidden = new Set<string>()
/** Breathing room between labels, in CSS pixels. */
const MARGIN = 6

export const labelDeclutter = {
  report(id: string, entry: Entry) {
    entries.set(id, entry)
  },
  remove(id: string) {
    entries.delete(id)
    hidden.delete(id)
  },
  /** Greedy pass: keep labels in priority order, hiding any that overlap a kept one. */
  resolve() {
    hidden.clear()
    const kept: Entry[] = []
    const ordered = [...entries.entries()].sort((a, b) => b[1].priority - a[1].priority)
    for (const [id, e] of ordered) {
      const collides = kept.some(
        (k) => Math.abs(k.x - e.x) < k.halfWidth + e.halfWidth + MARGIN && Math.abs(k.y - e.y) < k.halfHeight + e.halfHeight + MARGIN,
      )
      if (collides) hidden.add(id)
      else kept.push(e)
    }
  },
  isHidden(id: string): boolean {
    return hidden.has(id)
  },
}
