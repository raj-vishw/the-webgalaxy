interface WebsiteLabelProps {
  name: string
  selected: boolean
}

/** Name of a website, revealed only while hovered or focused. */
export function WebsiteLabel({ name, selected }: WebsiteLabelProps) {
  return (
    <span
      className={[
        'label-enter block select-none whitespace-nowrap text-center font-sans tracking-[0.12em]',
        selected ? 'text-[13px] font-medium text-white' : 'text-[12px] text-white/90',
      ].join(' ')}
      style={{ textShadow: '0 0 12px rgba(190,205,255,0.55), 0 0 28px rgba(150,170,255,0.25)' }}
    >
      {name}
    </span>
  )
}
