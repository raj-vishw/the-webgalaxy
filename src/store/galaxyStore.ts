import { create } from 'zustand'
import type { IntroPhase, Vec3, ViewMode } from '../types/galaxy'
import { interactionEvents } from '../utils/interaction'

interface GalaxyState {
  /** Navigation level of the camera: galaxy → universe → website. Not a data hierarchy. */
  viewMode: ViewMode
  /** Universe the camera has travelled into, if any. */
  activeUniverseId: string | null
  hoveredUniverseId: string | null
  hoveredWebsiteId: string | null
  selectedWebsiteId: string | null
  /** World-space point the camera is currently focused on. */
  cameraTarget: Vec3
  /** Camera pose before the current website focus, restored on close. */
  previousCameraPosition: Vec3 | null
  previousCameraTarget: Vec3 | null
  /** True while a camera flight is in progress. */
  isTransitioning: boolean
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
  rememberCameraPose: (position: Vec3, target: Vec3) => void
  setTransitioning: (value: boolean) => void
  setIntroPhase: (phase: IntroPhase) => void
  setIntroMilestone: (key: keyof GalaxyState['intro'], value: boolean) => void
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  viewMode: 'galaxy',
  activeUniverseId: null,
  hoveredUniverseId: null,
  hoveredWebsiteId: null,
  selectedWebsiteId: null,
  cameraTarget: [0, 0, 0],
  previousCameraPosition: null,
  previousCameraTarget: null,
  isTransitioning: false,
  introPhase: 'idle',
  intro: { titleVisible: false, subtitleVisible: false, chromeVisible: false },

  setHoveredUniverse: (id) => {
    if (get().hoveredUniverseId === id) return
    set({ hoveredUniverseId: id })
    interactionEvents.emit({ type: 'universe:hover', universeId: id })
  },
  setHoveredWebsite: (id) => {
    if (get().hoveredWebsiteId === id) return
    set({ hoveredWebsiteId: id })
    interactionEvents.emit({ type: 'website:hover', websiteId: id })
  },
  enterUniverse: (id) => {
    set({
      activeUniverseId: id,
      selectedWebsiteId: null,
      hoveredUniverseId: null,
      previousCameraPosition: null,
      previousCameraTarget: null,
      viewMode: 'universe',
    })
    interactionEvents.emit({ type: 'universe:select', universeId: id })
  },
  leaveUniverse: () => {
    set({
      activeUniverseId: null,
      selectedWebsiteId: null,
      hoveredWebsiteId: null,
      previousCameraPosition: null,
      previousCameraTarget: null,
      viewMode: 'galaxy',
    })
    interactionEvents.emit({ type: 'navigate:back', to: 'galaxy' })
  },
  selectWebsite: (id, universeId) => {
    if (get().selectedWebsiteId === id) return
    set({ selectedWebsiteId: id, activeUniverseId: universeId, viewMode: 'website' })
    interactionEvents.emit({ type: 'website:select', websiteId: id })
  },
  clearWebsite: () => {
    if (!get().selectedWebsiteId) return
    set({ selectedWebsiteId: null, viewMode: 'universe' })
    interactionEvents.emit({ type: 'navigate:back', to: 'universe' })
  },
  goBack: () => {
    const { viewMode, clearWebsite, leaveUniverse } = get()
    if (viewMode === 'website') clearWebsite()
    else if (viewMode === 'universe') leaveUniverse()
  },
  setCameraTarget: (target) => set({ cameraTarget: target }),
  rememberCameraPose: (position, target) => set({ previousCameraPosition: position, previousCameraTarget: target }),
  setTransitioning: (value) => {
    if (get().isTransitioning === value) return
    set({ isTransitioning: value })
    interactionEvents.emit({ type: 'camera:travel', phase: value ? 'start' : 'end' })
  },
  setIntroPhase: (phase) => set({ introPhase: phase }),
  setIntroMilestone: (key, value) =>
    set((state) => ({ intro: { ...state.intro, [key]: value } })),
}))
