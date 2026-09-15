import { useGalaxyStore } from '../../store/galaxyStore'
import { tokenize } from '../../utils/search'

/** A command the search box can run — the palette half of "search". */
export interface ActionMatch {
  kind: 'action'
  id: string
  label: string
  hint: string
  run: () => void
}

const store = () => useGalaxyStore.getState()

const ACTIONS: Omit<ActionMatch, 'kind'>[] = [
  { id: 'random', label: 'Discover something random', hint: 'Let the galaxy choose', run: () => store().startDiscovery('random') },
  { id: 'trending', label: 'Show trending websites', hint: 'Discovery · trending', run: () => store().startDiscovery('trending') },
  { id: 'emerging', label: 'Show emerging websites', hint: 'Discovery · emerging', run: () => store().startDiscovery('emerging') },
  { id: 'filters', label: 'Open filters', hint: 'F', run: () => store().openOverlay('filters') },
  { id: 'minimap', label: 'Toggle minimap', hint: 'M', run: () => store().setMinimapVisible(!store().minimapVisible) },
  { id: 'galaxy', label: 'Return to the galaxy', hint: 'G', run: () => store().leaveUniverse() },
  { id: 'add', label: 'Add a website', hint: 'A', run: () => store().openOverlay('submit') },
  { id: 'help', label: 'Keyboard shortcuts & settings', hint: '?', run: () => store().openOverlay('help') },
]

/**
 * Actions matching a query: every token must appear in the label. A query
 * beginning with `>` lists every action (`> ` alone shows them all).
 */
export function matchActions(query: string, limit = 4): ActionMatch[] {
  const raw = query.trim()
  if (!raw) return []
  const palette = raw.startsWith('>')
  const tokens = tokenize(palette ? raw.slice(1) : raw)
  const hits = ACTIONS.filter((a) => {
    const label = a.label.toLowerCase()
    return tokens.length ? tokens.every((t) => label.includes(t)) : palette
  })
  return hits.slice(0, palette ? ACTIONS.length : limit).map((a) => ({ kind: 'action', ...a }))
}
