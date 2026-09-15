import { create } from 'zustand'
import type { ExplorationMode, IntroPhase, Vec3 } from '../types/galaxy'

interface GalaxyState {
  /** Universe the cursor is currently over, if any. */
  hoveredUniverseId: string | null
  /** Universe the camera has travelled into, if any. */
  activeUniverseId: string | null
  hoveredWebsiteId: string | null
  selectedWebsiteId: string | null
  /** World-space point the camera is currently focused on. */
  cameraTarget: Vec3
  explorationMode: ExplorationMode
  introPhase: IntroPhase
  /** DOM-side milestones driven by the intro timeline. */
  intro: {
    titleVisible: boolean
    subtitleVisible: boolean
    chromeVisible: boolean
  }

  setHoveredUniverse: (id: string | null) => void
  setHoveredWebsite: (id: string | null) => void
  /** Travel into a universe (from the galaxy overview or another universe). */
  enterUniverse: (id: string) => void
  /** Return to the galaxy overview. */
  leaveUniverse: () => void
  /** Focus a website; also enters its universe if needed. */
  selectWebsite: (id: string, universeId: string) => void
  /** Drop the website focus, staying inside its universe. */
  clearWebsite: () => void
  /** Step back one level: website → universe → galaxy. */
  goBack: () => void
  setCameraTarget: (target: Vec3) => void
  setIntroPhase: (phase: IntroPhase) => void
  setIntroMilestone: (key: keyof GalaxyState['intro'], value: boolean) => void
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  hoveredUniverseId: null,
  activeUniverseId: null,
  hoveredWebsiteId: null,
  selectedWebsiteId: null,
  cameraTarget: [0, 0, 0],
  explorationMode: 'galaxy',
  introPhase: 'idle',
  intro: { titleVisible: false, subtitleVisible: false, chromeVisible: false },

  setHoveredUniverse: (id) => set({ hoveredUniverseId: id }),
  setHoveredWebsite: (id) => set({ hoveredWebsiteId: id }),
  enterUniverse: (id) =>
    set({ activeUniverseId: id, selectedWebsiteId: null, hoveredUniverseId: null, explorationMode: 'universe' }),
  leaveUniverse: () =>
    set({ activeUniverseId: null, selectedWebsiteId: null, hoveredWebsiteId: null, explorationMode: 'galaxy' }),
  selectWebsite: (id, universeId) =>
    set({ selectedWebsiteId: id, activeUniverseId: universeId, explorationMode: 'website' }),
  clearWebsite: () =>
    set((s) => (s.selectedWebsiteId ? { selectedWebsiteId: null, explorationMode: 'universe' } : s)),
  goBack: () => {
    const { explorationMode, clearWebsite, leaveUniverse } = get()
    if (explorationMode === 'website') clearWebsite()
    else if (explorationMode === 'universe') leaveUniverse()
  },
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setIntroPhase: (phase) => set({ introPhase: phase }),
  setIntroMilestone: (key, value) =>
    set((state) => ({ intro: { ...state.intro, [key]: value } })),
}))
