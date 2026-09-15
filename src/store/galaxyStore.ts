import { create } from 'zustand'
import { loadSession, saveSession } from '../lib/sessionStorage'
import { getHighlightSet, recommendationsFor, type HighlightKind } from '../services/discoveryService'
import {
  emptySignals,
  getEmergingWebsites,
  getTrendingWebsites,
  recordDiscovery,
  recordSearch,
  recordUniverseVisit,
  recordWebsiteView,
  type ExplorationEntry,
  type Recommendation,
  type RecommendationContext,
  type SessionSignals,
} from '../services/recommendationService'
import { getRelatedWebsites, getRelationshipBetween, type ResolvedRelationship } from '../services/relationshipService'
import { getCatalog, useCatalogStore } from './catalogStore'
import type { IntroPhase, RelationshipType, Vec3, ViewMode } from '../types/galaxy'
import type { DiscoveryMode } from '../utils/discovery'
import { EMPTY_FILTERS, type WebsiteFilters } from '../utils/filtering'
import { useSettingsStore } from './settingsStore'
import type { SearchResults } from '../utils/search'
import { interactionEvents } from '../utils/interaction'

export type DiscoveryPhase = 'idle' | 'scanning' | 'found' | 'travelling'

export interface DiscoveryState {
  mode: DiscoveryMode
  phase: DiscoveryPhase
  /** Id of the website or universe being flashed / chosen. */
  candidateId: string | null
  targetId: string | null
  /** Why the destination was chosen, for the announcement. */
  reason: string | null
}

/** Which floating panel is open; they are mutually exclusive to keep the scene clear. */
export type OverlayKind = 'search' | 'filters' | 'navigator' | 'discover' | 'submit' | null

/** A connection the scene currently draws. Purely a line between two equals. */
export interface VisibleRelationship {
  id: string
  sourceId: string
  targetId: string
  type: RelationshipType
  directed: boolean
}

/** Result set of Explore Similar / Find Alternatives / Works With. */
export interface HighlightState {
  kind: HighlightKind
  sourceId: string
  items: Recommendation[]
}

/** Persisted across reloads within the tab only. */
interface PersistedSession {
  explorationHistory: ExplorationEntry[]
  sessionSignals: SessionSignals
}

const MAX_HISTORY = 40
const MAX_PATH = 8
/** At most this many connections are drawn for one focused website. */
export const MAX_VISIBLE_RELATIONSHIPS = 6

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
  /** Current results for `searchQuery` (API, or local fallback); the scene mirrors them. */
  searchResults: SearchResults | null
  filters: WebsiteFilters
  discovery: DiscoveryState
  minimapVisible: boolean
  introPhase: IntroPhase
  /** DOM-side milestones driven by the entry sequence. */
  intro: {
    chromeVisible: boolean
    /** Whether the running cinematic is the long first-visit version. */
    cinematic: boolean
  }
  /** The 3D scene has created its renderer. */
  sceneReady: boolean

  // ─── Intelligence layer (temporary, session-scoped; never part of the dataset) ───
  /** Everything visited this session, oldest first. */
  explorationHistory: ExplorationEntry[]
  sessionSignals: SessionSignals
  /** Snapshot the recommendation service scored against. */
  recommendationContext: RecommendationContext
  /** "You may also explore" for the current focus. */
  recommendations: Recommendation[]
  /** Last discovery mode used. */
  activeDiscoveryMode: DiscoveryMode | null
  /** Connections the scene is drawing right now. */
  visibleRelationships: VisibleRelationship[]
  /** The explorer's own trail: website ids in the order they were followed. */
  activeDiscoveryPath: string[]
  highlight: HighlightState | null
  /** Static demo trend snapshot, resolved once. */
  trendingWebsiteIds: string[]
  emergingWebsiteIds: string[]

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
  setSearchResults: (results: SearchResults | null) => void
  /** Remember a query as a session signal (called when a search leads somewhere). */
  recordSearch: (query: string) => void
  setFilters: (patch: Partial<WebsiteFilters>) => void
  clearFilters: () => void
  setDiscovery: (patch: Partial<DiscoveryState>) => void
  startDiscovery: (mode: DiscoveryMode) => void
  endDiscovery: () => void
  /** Light up a set of websites around the focused one (or clear with null). */
  setHighlight: (kind: HighlightKind | null) => void
  clearExplorationPath: () => void
  clearExplorationHistory: () => void
  setMinimapVisible: (visible: boolean) => void
  setIntroPhase: (phase: IntroPhase) => void
  setIntroMilestone: (key: keyof GalaxyState['intro'], value: boolean) => void
  setSceneReady: (ready: boolean) => void
  /** Loading finished: show the landing. */
  showLanding: () => void
  /** "Enter the WebGalaxy": start the cinematic flight. */
  enterGalaxy: () => void
  /** The flight has landed: onboarding for first-timers, otherwise control. */
  finishIntro: () => void
  completeOnboarding: () => void
  /** Replays the landing + cinematic from wherever the explorer is. */
  replayIntro: () => void
}

const toVisible = (r: ResolvedRelationship): VisibleRelationship => ({
  id: `${r.sourceId}>${r.targetId}:${r.type}`,
  sourceId: r.sourceId,
  targetId: r.targetId,
  type: r.type,
  directed: r.directed,
})

/** The connections worth drawing for a focused website. */
function relationshipsToShow(websiteId: string): VisibleRelationship[] {
  return getRelatedWebsites(websiteId, MAX_VISIBLE_RELATIONSHIPS).map(toVisible)
}

/** Connections between a highlight source and the highlighted websites (explicit ones only). */
function highlightRelationships(sourceId: string, items: Recommendation[]): VisibleRelationship[] {
  const out: VisibleRelationship[] = []
  for (const item of items) {
    const r = item.relationship ?? getRelationshipBetween(sourceId, item.website.id)
    if (r) out.push(toVisible(r))
    if (out.length >= MAX_VISIBLE_RELATIONSHIPS + 1) break
  }
  return out
}

const contextOf = (s: Pick<GalaxyState, 'selectedWebsiteId' | 'activeUniverseId' | 'explorationHistory' | 'sessionSignals'>): RecommendationContext => ({
  currentWebsiteId: s.selectedWebsiteId,
  currentUniverseId: s.activeUniverseId,
  history: s.explorationHistory,
  signals: s.sessionSignals,
})

let recommendationRun = 0

/**
 * Recompute the derived intelligence fields for a state snapshot. The
 * recommendation provider may answer synchronously (local scorer) or later
 * (a future API/AI provider); late answers are applied only if the context
 * hasn't moved on.
 */
function intelligence(s: Pick<GalaxyState, 'selectedWebsiteId' | 'activeUniverseId' | 'explorationHistory' | 'sessionSignals'>) {
  const recommendationContext = contextOf(s)
  // Suggestions appear once the exploration has some substance: a website in
  // focus, or at least a couple of stops behind us.
  const meaningful = !!s.selectedWebsiteId || s.explorationHistory.length >= 2
  // Websites already listed as connections add nothing as suggestions.
  const listed = s.selectedWebsiteId ? relationshipsToShow(s.selectedWebsiteId).flatMap((r) => [r.sourceId, r.targetId]) : []
  const run = ++recommendationRun
  const result = meaningful ? recommendationsFor(recommendationContext, 3, listed) : []
  if (Array.isArray(result)) return { recommendationContext, recommendations: result }
  result
    .then((recommendations) => {
      if (run === recommendationRun) useGalaxyStore.setState({ recommendations })
    })
    .catch(() => undefined)
  return { recommendationContext, recommendations: [] as Recommendation[] }
}

function pushHistory(history: ExplorationEntry[], entry: Omit<ExplorationEntry, 'at'>): ExplorationEntry[] {
  const last = history[history.length - 1]
  if (last && last.kind === entry.kind && last.id === entry.id) return history
  return [...history, { ...entry, at: Date.now() }].slice(-MAX_HISTORY)
}

const restored = loadSession<PersistedSession>()
const initialHistory = Array.isArray(restored?.explorationHistory) ? restored.explorationHistory.slice(-MAX_HISTORY) : []
const initialSignals: SessionSignals = { ...emptySignals(), ...(restored?.sessionSignals ?? {}) }

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
  searchResults: null,
  filters: EMPTY_FILTERS,
  discovery: { mode: 'random', phase: 'idle', candidateId: null, targetId: null, reason: null },
  minimapVisible: !(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches),
  introPhase: 'loading',
  intro: { chromeVisible: false, cinematic: false },
  sceneReady: false,

  explorationHistory: initialHistory,
  sessionSignals: initialSignals,
  ...intelligence({ selectedWebsiteId: null, activeUniverseId: null, explorationHistory: initialHistory, sessionSignals: initialSignals }),
  activeDiscoveryMode: null,
  visibleRelationships: [],
  activeDiscoveryPath: [],
  highlight: null,
  trendingWebsiteIds: getTrendingWebsites().map((w) => w.id),
  emergingWebsiteIds: getEmergingWebsites().map((w) => w.id),

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
    const s = get()
    const explorationHistory = pushHistory(s.explorationHistory, { kind: 'universe', id })
    const sessionSignals = s.activeUniverseId === id ? s.sessionSignals : recordUniverseVisit(s.sessionSignals, id)
    set({
      activeUniverseId: id,
      selectedWebsiteId: null,
      hoveredUniverseId: null,
      previousCameraPosition: null,
      previousCameraTarget: null,
      viewMode: 'universe',
      visibleRelationships: [],
      highlight: null,
      explorationHistory,
      sessionSignals,
      ...intelligence({ selectedWebsiteId: null, activeUniverseId: id, explorationHistory, sessionSignals }),
    })
    interactionEvents.emit({ type: 'universe:select', universeId: id })
  },
  leaveUniverse: () => {
    const s = get()
    set({
      activeUniverseId: null,
      selectedWebsiteId: null,
      hoveredWebsiteId: null,
      previousCameraPosition: null,
      previousCameraTarget: null,
      viewMode: 'galaxy',
      visibleRelationships: [],
      highlight: null,
      // Back at the overview a new exploration begins; the trail fades.
      activeDiscoveryPath: [],
      recommendationContext: contextOf({ ...s, selectedWebsiteId: null, activeUniverseId: null }),
      recommendations: [],
    })
    interactionEvents.emit({ type: 'navigate:back', to: 'galaxy' })
  },
  selectWebsite: (id, universeId) => {
    const s = get()
    if (s.selectedWebsiteId === id) return
    const website = getCatalog().websites.find((w) => w.id === id)
    // Full record (description…) arrives on demand; the panel fills in as it lands.
    void useCatalogStore.getState().loadWebsiteDetail(id)
    const explorationHistory = pushHistory(s.explorationHistory, { kind: 'website', id })
    const sessionSignals = website ? recordWebsiteView(s.sessionSignals, website) : s.sessionSignals
    const last = s.activeDiscoveryPath[s.activeDiscoveryPath.length - 1]
    const activeDiscoveryPath = last === id ? s.activeDiscoveryPath : [...s.activeDiscoveryPath, id].slice(-MAX_PATH)
    // Following a connection into another universe leaves the remembered
    // free-exploration pose behind: closing there returns to that universe's
    // view, not to a spot in the universe we came from.
    const crossing = s.activeUniverseId !== universeId
    set({
      selectedWebsiteId: id,
      activeUniverseId: universeId,
      viewMode: 'website',
      ...(crossing ? { previousCameraPosition: null, previousCameraTarget: null } : {}),
      visibleRelationships: relationshipsToShow(id),
      highlight: null,
      activeDiscoveryPath,
      explorationHistory,
      sessionSignals,
      ...intelligence({ selectedWebsiteId: id, activeUniverseId: universeId, explorationHistory, sessionSignals }),
    })
    interactionEvents.emit({ type: 'website:select', websiteId: id })
  },
  clearWebsite: () => {
    const s = get()
    if (!s.selectedWebsiteId) return
    set({
      selectedWebsiteId: null,
      viewMode: 'universe',
      visibleRelationships: [],
      highlight: null,
      ...intelligence({ ...s, selectedWebsiteId: null }),
    })
    interactionEvents.emit({ type: 'navigate:back', to: 'universe' })
  },
  goBack: () => {
    const { viewMode, overlay, highlight, clearWebsite, leaveUniverse, closeOverlay, setHighlight } = get()
    if (overlay) closeOverlay()
    else if (highlight) setHighlight(null)
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
  setSearchResults: (results) => set({ searchResults: results }),
  recordSearch: (query) => {
    if (!query.trim()) return
    set((s) => ({ sessionSignals: recordSearch(s.sessionSignals, query) }))
  },
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  setDiscovery: (patch) => set((s) => ({ discovery: { ...s.discovery, ...patch } })),
  startDiscovery: (mode) =>
    set((s) => ({
      overlay: null,
      highlight: null,
      activeDiscoveryMode: mode,
      sessionSignals: recordDiscovery(s.sessionSignals),
      // Random jumps start a fresh trail; relationship-driven modes extend it.
      activeDiscoveryPath: mode === 'random' || mode === 'universe' ? [] : s.activeDiscoveryPath,
      discovery: { mode, phase: 'scanning', candidateId: null, targetId: null, reason: null },
    })),
  endDiscovery: () => set((s) => ({ discovery: { ...s.discovery, phase: 'idle', candidateId: null } })),
  setHighlight: (kind) => {
    const s = get()
    if (!kind) {
      if (!s.highlight) return
      set({
        highlight: null,
        visibleRelationships: s.selectedWebsiteId ? relationshipsToShow(s.selectedWebsiteId) : [],
      })
      return
    }
    const sourceId = s.selectedWebsiteId
    if (!sourceId) return
    if (s.highlight?.kind === kind && s.highlight.sourceId === sourceId) {
      get().setHighlight(null)
      return
    }
    const items = getHighlightSet(kind, sourceId)
    set({
      overlay: null,
      highlight: { kind, sourceId, items },
      visibleRelationships: highlightRelationships(sourceId, items),
    })
  },
  clearExplorationPath: () => set({ activeDiscoveryPath: [] }),
  clearExplorationHistory: () => {
    const sessionSignals = emptySignals()
    set((s) => ({
      explorationHistory: [],
      sessionSignals,
      activeDiscoveryPath: [],
      ...intelligence({ ...s, explorationHistory: [], sessionSignals }),
    }))
  },
  setMinimapVisible: (visible) => set({ minimapVisible: visible }),
  setIntroPhase: (phase) => set({ introPhase: phase }),
  setIntroMilestone: (key, value) =>
    set((state) => ({ intro: { ...state.intro, [key]: value } })),
  setSceneReady: (ready) => set({ sceneReady: ready }),
  showLanding: () => {
    if (get().introPhase === 'loading') set({ introPhase: 'landing' })
  },
  enterGalaxy: () => {
    if (get().introPhase !== 'landing') return
    const settings = useSettingsStore.getState()
    set({ introPhase: 'playing', intro: { chromeVisible: false, cinematic: settings.firstVisit } })
    settings.recordVisit()
    interactionEvents.emit({ type: 'galaxy:enter', firstVisit: settings.firstVisit })
  },
  finishIntro: () => {
    if (get().introPhase !== 'playing') return
    const { firstVisit, onboardingDone } = useSettingsStore.getState()
    if (firstVisit && !onboardingDone) set({ introPhase: 'onboarding' })
    else set({ introPhase: 'complete', intro: { ...get().intro, chromeVisible: true } })
  },
  completeOnboarding: () => {
    useSettingsStore.getState().setOnboardingDone(true)
    set({ introPhase: 'complete', intro: { ...get().intro, chromeVisible: true } })
  },
  replayIntro: () => {
    const s = get()
    if (s.viewMode !== 'galaxy') s.leaveUniverse()
    set({ overlay: null, highlight: null, introPhase: 'landing', intro: { chromeVisible: false, cinematic: true } })
  },
}))

// When the catalogue changes (API data arriving, an edit published), derived
// relationship / recommendation state is recomputed for the current focus.
useCatalogStore.subscribe((catalog, previous) => {
  if (catalog.websites === previous.websites && catalog.relationships === previous.relationships) return
  const s = useGalaxyStore.getState()
  useGalaxyStore.setState({
    trendingWebsiteIds: getTrendingWebsites().map((w) => w.id),
    emergingWebsiteIds: getEmergingWebsites().map((w) => w.id),
    visibleRelationships: s.highlight ? highlightRelationships(s.highlight.sourceId, s.highlight.items) : s.selectedWebsiteId ? relationshipsToShow(s.selectedWebsiteId) : [],
    ...intelligence(s),
  })
})

// Persist the session-scoped exploration state (tab-local, never sent anywhere).
useGalaxyStore.subscribe((state, previous) => {
  if (state.explorationHistory !== previous.explorationHistory || state.sessionSignals !== previous.sessionSignals) {
    saveSession({ explorationHistory: state.explorationHistory, sessionSignals: state.sessionSignals } satisfies PersistedSession)
  }
})
