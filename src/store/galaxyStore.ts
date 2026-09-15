import { create } from 'zustand'
import type { IntroPhase, Vec3, ViewMode } from '../types/galaxy'
import type { DiscoveryMode } from '../utils/discovery'
import { EMPTY_FILTERS, type WebsiteFilters } from '../utils/filtering'
import { interactionEvents } from '../utils/interaction'

export type DiscoveryPhase = 'idle' | 'scanning' | 'found' | 'travelling'

export interface DiscoveryState {
  mode: DiscoveryMode
  phase: DiscoveryPhase
  /** Id of the website or universe being flashed / chosen. */
  candidateId: string | null
  targetId: string | null
}

/** Which floating panel is open; they are mutually exclusive to keep the scene clear. */
export type OverlayKind = 'search' | 'filters' | 'navigator' | 'discover' | null

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
  /** Search & discovery layer. Results are derived from `searchQuery`, never stored. */
  overlay: OverlayKind
  searchQuery: string
  filters: WebsiteFilters
  discovery: DiscoveryState
  minimapVisible: boolean
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
  openOverlay: (kind: Exclude<OverlayKind, null>) => void
  closeOverlay: () => void
  toggleOverlay: (kind: Exclude<OverlayKind, null>) => void
  setSearchQuery: (query: string) => void
  setFilters: (patch: Partial<WebsiteFilters>) => void
  clearFilters: () => void
  setDiscovery: (patch: Partial<DiscoveryState>) => void
  startDiscovery: (mode: DiscoveryMode) => void
  endDiscovery: () => void
  setMinimapVisible: (visible: boolean) => void
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
  overlay: null,
  searchQuery: '',
  filters: EMPTY_FILTERS,
  discovery: { mode: 'website', phase: 'idle', candidateId: null, targetId: null },
  minimapVisible: !(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches),
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
    const { viewMode, overlay, clearWebsite, leaveUniverse, closeOverlay } = get()
    if (overlay) closeOverlay()
    else if (viewMode === 'website') clearWebsite()
    else if (viewMode === 'universe') leaveUniverse()
  },
  setCameraTarget: (target) => set({ cameraTarget: target }),
  rememberCameraPose: (position, target) => set({ previousCameraPosition: position, previousCameraTarget: target }),
  setTransitioning: (value) => {
    if (get().isTransitioning === value) return
    set({ isTransitioning: value })
    interactionEvents.emit({ type: 'camera:travel', phase: value ? 'start' : 'end' })
  },
  openOverlay: (kind) => set({ overlay: kind }),
  closeOverlay: () => set({ overlay: null }),
  toggleOverlay: (kind) => set((s) => ({ overlay: s.overlay === kind ? null : kind })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  setDiscovery: (patch) => set((s) => ({ discovery: { ...s.discovery, ...patch } })),
  startDiscovery: (mode) =>
    set({ overlay: null, discovery: { mode, phase: 'scanning', candidateId: null, targetId: null } }),
  endDiscovery: () => set((s) => ({ discovery: { ...s.discovery, phase: 'idle', candidateId: null } })),
  setMinimapVisible: (visible) => set({ minimapVisible: visible }),
  setIntroPhase: (phase) => set({ introPhase: phase }),
  setIntroMilestone: (key, value) =>
    set((state) => ({ intro: { ...state.intro, [key]: value } })),
}))
