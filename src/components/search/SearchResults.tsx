import type { SearchExpansion } from '../../services/discoveryService'
import type { SearchMatch, SearchResults as Results } from '../../utils/search'
import { eyebrow, ghostButton } from '../ui/panel'
import { SearchResult } from './SearchResult'
import type { ActionMatch } from './actions'

interface SearchResultsProps {
  results: Results
  expansion: SearchExpansion
  actions: ActionMatch[]
  flat: (SearchMatch | ActionMatch)[]
  listboxId: string
  activeIndex: number
  optionId: (index: number) => string
  onSelect: (match: SearchMatch | ActionMatch) => void
  onHover: (index: number) => void
  onClear: () => void
}

export function SearchResults({ results, expansion, actions, flat, listboxId, activeIndex, optionId, onSelect, onHover, onClear }: SearchResultsProps) {
  if (flat.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="font-sans text-[14px] text-white/85">Nothing found in this part of the galaxy.</p>
        <p className="mt-1 font-sans text-[12px] text-space-300/70">Try another name, tag or universe.</p>
        <button type="button" onClick={onClear} className={`${ghostButton} mt-5`}>
          Clear Search
        </button>
      </div>
    )
  }

  let index = 0
  const section = (title: string, matches: (SearchMatch | ActionMatch)[], keyPrefix = '') =>
    matches.length ? (
      <li key={keyPrefix + title}>
        <p className={`${eyebrow} px-3 pt-3 pb-1`}>{title}</p>
        <ul role="presentation">
          {matches.map((match) => {
            const i = index++
            return (
              <SearchResult
                key={keyPrefix + (match.kind === 'website' ? match.website.id : match.kind === 'universe' ? `u-${match.universe.id}` : `a-${match.id}`)}
                match={match}
                id={optionId(i)}
                active={i === activeIndex}
                onSelect={() => onSelect(match)}
                onHover={() => onHover(i)}
              />
            )
          })}
        </ul>
      </li>
    ) : null

  return (
    <ul id={listboxId} role="listbox" aria-label="Search results" className="max-h-[52vh] overflow-y-auto pb-2">
      {section('Actions', actions)}
      {section('Universes', results.universes)}
      {section(expansion.anchor ? 'Direct match' : 'Websites', results.websites)}
      {expansion.anchor && section(`Related to ${expansion.anchor.name}`, expansion.related, 'r-')}
      {expansion.anchor && section(`Alternatives to ${expansion.anchor.name}`, expansion.alternatives, 'a-')}
    </ul>
  )
}
