/**
 * Label boxes for the declutter pass are measured from the DOM, which forces
 * a synchronous layout. Measuring on a slow, staggered schedule — and never
 * re-measuring an element the renderer has hidden (offsetWidth 0) — keeps
 * that cost negligible; until the first measurement, a text estimate serves.
 */
export interface LabelBox {
  width: number
  height: number
  /** Frame counter, seeded per label so measurements spread across frames. */
  tick: number
}

const INTERVAL = 180

export function createLabelBox(text: string, seed: number, pxPerChar = 7.5, height = 14): LabelBox {
  return { width: text.length * pxPerChar, height, tick: seed % INTERVAL }
}

/** Refreshes `box` from `el` every `INTERVAL` frames; returns the (possibly cached) box. */
export function measureLabel(box: LabelBox, el: HTMLElement): LabelBox {
  if (box.tick++ % INTERVAL === 0) {
    const width = el.offsetWidth
    if (width > 0) {
      box.width = width
      box.height = el.offsetHeight
    }
  }
  return box
}
