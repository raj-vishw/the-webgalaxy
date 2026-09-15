import { create } from 'zustand'

/**
 * Small persisted preferences (localStorage): graphics quality, whether the
 * visitor has been here before, whether onboarding was completed. Nothing
 * here identifies anyone; it only shapes the entry experience and render
 * budget on this device.
 */
export type GraphicsSetting = 'auto' | 'high' | 'medium' | 'low'

interface Persisted {
  graphics: GraphicsSetting
  visits: number
  onboardingDone: boolean
}

export interface SettingsState extends Persisted {
  /** True on the very first load on this device (until the galaxy is entered). */
  firstVisit: boolean
  setGraphics: (graphics: GraphicsSetting) => void
  recordVisit: () => void
  setOnboardingDone: (done: boolean) => void
}

const KEY = 'webgalaxy.settings.v1'
const DEFAULTS: Persisted = { graphics: 'auto', visits: 0, onboardingDone: false }

function load(): Persisted {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      graphics: (['auto', 'high', 'medium', 'low'] as const).includes(parsed.graphics as GraphicsSetting) ? (parsed.graphics as GraphicsSetting) : 'auto',
      visits: typeof parsed.visits === 'number' ? parsed.visits : 0,
      onboardingDone: !!parsed.onboardingDone,
    }
  } catch {
    return DEFAULTS
  }
}

function save(value: Persisted) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Private mode: preferences simply don't persist.
  }
}

const initial = typeof window !== 'undefined' ? load() : DEFAULTS

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  firstVisit: initial.visits === 0,
  setGraphics: (graphics) => {
    set({ graphics })
    save({ graphics, visits: get().visits, onboardingDone: get().onboardingDone })
  },
  recordVisit: () => {
    const visits = get().visits + 1
    set({ visits })
    save({ graphics: get().graphics, visits, onboardingDone: get().onboardingDone })
  },
  setOnboardingDone: (onboardingDone) => {
    set({ onboardingDone })
    save({ graphics: get().graphics, visits: get().visits, onboardingDone })
  },
}))
