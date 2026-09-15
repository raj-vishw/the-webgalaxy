import { forwardRef } from 'react'
import { focusRing } from '../ui/panel'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onClear: () => void
  listboxId: string
  activeOptionId?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, onKeyDown, onClear, listboxId, activeOptionId },
  ref,
) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[14px] text-space-300/70">
        ◉
      </span>
      <input
        ref={ref}
        type="search"
        role="combobox"
        aria-label="Search websites or universes"
        aria-expanded="true"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search websites or universes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={[
          'w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pr-12 pl-11',
          'font-sans text-[15px] text-white placeholder:text-space-300/55',
          '[&::-webkit-search-cancel-button]:hidden',
          focusRing,
        ].join(' ')}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear query"
          className={`absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-space-300/70 transition-colors hover:text-white ${focusRing}`}
        >
          <span aria-hidden className="text-[15px] leading-none">×</span>
        </button>
      )}
    </div>
  )
})
