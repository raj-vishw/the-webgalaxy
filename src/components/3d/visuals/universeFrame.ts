/**
 * Per-universe values that change every frame (reveal progress and eased hover
 * amount). The owning `Universe` writes them; its visual children read them in
 * their own frame callbacks, avoiding React state churn.
 */
export interface UniverseFrameState {
  reveal: number
  hover: number
  /** 0 → 1: how far the structure is dimmed while a website inside is focused. */
  dim: number
  /** 0 → 1: label visibility after screen-space decluttering. */
  label: number
  /** Cached label box (CSS px), re-measured now and then to avoid layout reads every frame. */
  labelBox: [width: number, height: number]
  frames: number
}

export const createUniverseFrameState = (): UniverseFrameState => ({ reveal: 0, hover: 0, dim: 0, label: 1, labelBox: [0, 0], frames: 0 })
