interface UniverseLabelProps {
  name: string
  hovered: boolean
}

/**
 * Floating name for a universe, rendered by drei's <Html> at the universe's
 * position. Kept text-only on purpose: the universe itself is the object.
 */
export function UniverseLabel({ name, hovered }: UniverseLabelProps) {
  return (
    <span
      className={[
        'block select-none whitespace-nowrap text-center font-sans text-[11px] tracking-[0.2em] uppercase sm:text-[13px] sm:tracking-[0.22em]',
        'transition-[opacity,transform,text-shadow] duration-500 ease-out',
        hovered ? 'opacity-100 scale-105 text-white' : 'opacity-55 text-space-100',
      ].join(' ')}
      style={{
        textShadow: hovered
          ? '0 0 14px rgba(190,205,255,0.55), 0 0 32px rgba(150,170,255,0.25)'
          : '0 0 10px rgba(170,190,255,0.28)',
      }}
    >
      {name}
    </span>
  )
}
