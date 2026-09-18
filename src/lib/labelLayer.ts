/**
 * Registry of the DOM elements that show universe names. The names live in
 * one overlay next to the canvas (`UniverseLabelLayer`) rather than in one
 * `<Html>` portal per universe: a single container, positioned once, whose
 * children the scene moves directly each frame. Dozens of independently
 * managed portals cost a measurable share of every frame; this costs a few
 * style writes.
 */
const elements = new Map<string, HTMLElement>()

export const labelLayer = {
  register(id: string, el: HTMLElement | null) {
    if (el) elements.set(id, el)
    else elements.delete(id)
  },
  get(id: string): HTMLElement | undefined {
    return elements.get(id)
  },
}
