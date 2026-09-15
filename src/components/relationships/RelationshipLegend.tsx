import type { RelationshipType } from '../../types/galaxy'
import { CONNECTION_STYLE, type ConnectionStyle } from '../3d/relationships/connectionStyles'

interface RelationshipLegendProps {
  types: RelationshipType[]
}

const STYLE_LABEL: Record<ConnectionStyle, string> = {
  continuous: 'related',
  dashed: 'alternative',
  flow: 'works with',
  dotdash: 'complements',
  trail: 'your trail',
}

/** CSS rendition of each line pattern, so the legend matches the scene. */
function Swatch({ style }: { style: ConnectionStyle }) {
  const base = 'inline-block h-px w-6 align-middle'
  if (style === 'dashed') return <span aria-hidden className={base} style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 4px, transparent 4px 7px)' }} />
  if (style === 'flow') return <span aria-hidden className={`${base} h-[3px]`} style={{ backgroundImage: 'radial-gradient(circle, #fff 0 1px, transparent 1.5px)', backgroundSize: '6px 3px' }} />
  if (style === 'dotdash') return <span aria-hidden className={base} style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 5px, transparent 5px 8px, #fff 8px 9px, transparent 9px 12px)' }} />
  return <span aria-hidden className={`${base} bg-white`} />
}

/** Which line pattern means what — only for the patterns currently drawn. */
export function RelationshipLegend({ types }: RelationshipLegendProps) {
  const styles = [...new Set(types.map((t) => CONNECTION_STYLE[t]))]
  if (!styles.length) return null
  return (
    <ul aria-label="Connection styles" className="flex flex-wrap gap-x-3 gap-y-1 font-sans text-[9.5px] tracking-[0.14em] uppercase text-space-300/55">
      {styles.map((style) => (
        <li key={style} className="flex items-center gap-1.5">
          <Swatch style={style} />
          <span>{STYLE_LABEL[style]}</span>
        </li>
      ))}
    </ul>
  )
}
