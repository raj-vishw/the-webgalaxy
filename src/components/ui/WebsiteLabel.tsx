interface WebsiteLabelProps {
  name: string
  selected: boolean
  /** Quieter styling for the far end of a connection. */
  muted?: boolean
}

/** Name of a website, revealed while hovered, focused or connected to the focus. */
export function WebsiteLabel({ name, selected, muted = false }: WebsiteLabelProps) {
  return (
    <span
      className={[
        'label-enter block select-none whitespace-nowrap text-center font-sans tracking-[0.12em]',
        selected ? 'text-[13px] font-medium text-white' : muted ? 'text-[11px] text-white/75' : 'text-[12px] text-white/90',
      ].join(' ')}
      style={{ textShadow: '0 0 12px rgba(190,205,255,0.55), 0 0 28px rgba(150,170,255,0.25)' }}
    >
      {name}
    </span>
  )
}
