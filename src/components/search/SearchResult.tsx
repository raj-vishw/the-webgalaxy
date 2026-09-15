import type { SearchMatch } from '../../utils/search'
import { accentFor } from '../../utils/celestial'
import { CelestialIcon } from './CelestialIcon'

interface SearchResultProps {
  match: SearchMatch
  id: string
  active: boolean
  onSelect: () => void
  onHover: () => void
}

const TYPE_LABEL = { star: 'Star', planet: 'Planet', moon: 'Moon', comet: 'Comet' } as const

export function SearchResult({ match, id, active, onSelect, onHover }: SearchResultProps) {
  const isWebsite = match.kind === 'website'
  const name = isWebsite ? match.website.name : match.universe.name
  const accent = isWebsite ? accentFor(match.website) : match.universe.palette.primary
  const meta = isWebsite
    ? [match.universe ? `${match.universe.name} Universe` : 'The WebGalaxy', TYPE_LABEL[match.website.objectType]].join(' · ')
    : 'Universe'
  const description = isWebsite ? (match.reason ?? match.website.description) : match.universe.description

  return (
    <li id={id} role="option" aria-selected={active}>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onHover}
        tabIndex={-1}
        className={[
          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,transform] duration-200',
          active ? 'bg-white/[0.07] translate-x-0.5' : 'hover:bg-white/[0.04]',
        ].join(' ')}
      >
        <CelestialIcon type={isWebsite ? match.website.objectType : 'universe'} accent={accent} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-[14px] text-white">{name}</span>
          <span className="block truncate font-sans text-[11px] tracking-[0.08em] text-space-300/80">
            {meta}
            {description ? <span className="text-space-300/55"> — {description}</span> : null}
          </span>
        </span>
        <span aria-hidden className={`font-sans text-[11px] text-space-300/50 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          ↵
        </span>
      </button>
    </li>
  )
}
