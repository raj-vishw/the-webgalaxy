import { useId } from 'react'
import { focusRing } from '../ui/panel'

interface FilterSelectProps<T extends string> {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  onChange: (value: T | null) => void
}

/** Native select, styled to the instrument: keyboard and screen-reader friendly for free. */
export function FilterSelect<T extends string>({ label, value, options, onChange }: FilterSelectProps<T>) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block font-sans text-[10.5px] tracking-[0.22em] uppercase text-space-300/70">{label}</span>
      <span className="relative block">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange((e.target.value || null) as T | null)}
          className={[
            'w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] py-2 pr-8 pl-3',
            'font-sans text-[13px] text-white transition-colors hover:border-white/25',
            focusRing,
          ].join(' ')}
        >
          <option value="" className="bg-[#0b0e1c]">All</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0b0e1c]">
              {o.label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-space-300/70">
          ▾
        </span>
      </span>
    </label>
  )
}
