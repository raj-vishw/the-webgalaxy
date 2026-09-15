import type { CelestialObjectType } from '../../types/galaxy'

interface CelestialIconProps {
  type: CelestialObjectType | 'universe'
  accent: string
}

/** Tiny CSS rendition of an object type, so lists read like the scene. */
export function CelestialIcon({ type, accent }: CelestialIconProps) {
  const base = 'relative flex h-8 w-8 shrink-0 items-center justify-center'
  if (type === 'universe') {
    return (
      <span aria-hidden className={base}>
        <span className="absolute h-5 w-5 rounded-full" style={{ background: `radial-gradient(circle, ${accent}99 0%, ${accent}22 45%, transparent 70%)` }} />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-white/90" />
      </span>
    )
  }
  if (type === 'star') {
    return (
      <span aria-hidden className={base}>
        <span className="absolute h-4 w-4 rounded-full" style={{ background: `radial-gradient(circle, #fff 0%, ${accent}aa 40%, transparent 70%)`, boxShadow: `0 0 10px ${accent}88` }} />
      </span>
    )
  }
  if (type === 'comet') {
    return (
      <span aria-hidden className={base}>
        <span className="absolute left-1 h-px w-5 rotate-[-30deg]" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
        <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-white" style={{ boxShadow: `0 0 8px ${accent}` }} />
      </span>
    )
  }
  const size = type === 'moon' ? 'h-2.5 w-2.5' : 'h-4 w-4'
  return (
    <span aria-hidden className={base}>
      <span className={`${size} rounded-full`} style={{ background: `radial-gradient(circle at 35% 30%, ${accent}, ${accent}55 70%)`, boxShadow: `0 0 6px ${accent}55` }} />
    </span>
  )
}
