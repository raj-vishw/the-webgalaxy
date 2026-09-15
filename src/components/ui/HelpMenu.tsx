import { resolveTier } from '../../hooks/useQualityProfile'
import { useGalaxyStore } from '../../store/galaxyStore'
import { useSettingsStore, type GraphicsSetting } from '../../store/settingsStore'
import { eyebrow, focusRing, glassPanel } from './panel'

const SHORTCUTS: [string, string][] = [
  ['/', 'Search'],
  ['⌘ K', 'Search (command palette)'],
  ['Esc', 'Close · step back'],
  ['B', 'Back one level'],
  ['G', 'Return to the galaxy'],
  ['R', 'Random discovery'],
  ['D', 'Discovery console'],
  ['F', 'Filters'],
  ['E', 'Explore universes'],
  ['M', 'Toggle minimap'],
  ['A', 'Add a website'],
  ['?', 'This help'],
]

const GRAPHICS: { value: GraphicsSetting; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/**
 * Help & settings: the keyboard map, the graphics budget, and ways back into
 * the entry experience. One quiet panel — the galaxy stays the interface.
 */
export function HelpMenu() {
  const open = useGalaxyStore((s) => s.overlay === 'help')
  const closeOverlay = useGalaxyStore((s) => s.closeOverlay)
  const replayIntro = useGalaxyStore((s) => s.replayIntro)
  const graphics = useSettingsStore((s) => s.graphics)
  const autoDowngrade = useSettingsStore((s) => s.autoDowngrade)
  const setGraphics = useSettingsStore((s) => s.setGraphics)
  const setOnboardingDone = useSettingsStore((s) => s.setOnboardingDone)
  const effective = resolveTier(graphics, autoDowngrade)

  const action = `rounded-lg px-3 py-2 text-left font-sans text-[13px] text-white/85 transition-colors hover:bg-white/[0.05] hover:text-white ${focusRing}`

  return (
    <section
      role="dialog"
      aria-label="Help and settings"
      aria-hidden={!open}
      className={[
        glassPanel,
        'absolute top-16 right-9 z-30 w-[340px] px-4 pt-4 pb-3',
        'max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain',
        'max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-20 max-sm:max-h-[62vh] max-sm:w-auto',
        'transition-[opacity,transform] duration-300 ease-out',
        open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
      ].join(' ')}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className={eyebrow}>Help & settings</p>
        <button type="button" onClick={closeOverlay} aria-label="Close help" className={`flex h-7 w-7 items-center justify-center rounded-full text-space-300/70 transition-colors hover:text-white ${focusRing}`}>
          <span aria-hidden className="text-[15px] leading-none">×</span>
        </button>
      </div>

      <fieldset className="mb-4">
        <legend className={`${eyebrow} mb-2`}>Graphics</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Graphics quality">
          {GRAPHICS.map((g) => (
            <button
              key={g.value}
              type="button"
              role="radio"
              aria-checked={graphics === g.value}
              onClick={() => setGraphics(g.value)}
              disabled={!open}
              className={[
                'rounded-full border px-3 py-1 font-sans text-[11px] tracking-[0.14em] uppercase transition-colors',
                graphics === g.value ? 'border-white/60 bg-white/10 text-white' : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white',
                focusRing,
              ].join(' ')}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="mt-2 font-sans text-[11px] text-space-300/65">
          {graphics === 'auto' ? `Auto is running at ${effective}${autoDowngrade ? ' (lowered for a steadier frame rate)' : ''}.` : `Fixed at ${effective}.`}
        </p>
      </fieldset>

      <div className="mb-4 hidden sm:block">
        <p className={`${eyebrow} mb-2`}>Keyboard</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {SHORTCUTS.map(([key, what]) => (
            <div key={key} className="contents">
              <dt>
                <kbd className="rounded border border-white/15 px-1.5 font-sans text-[10.5px] text-white/80">{isMac ? key : key.replace('⌘', 'Ctrl')}</kbd>
              </dt>
              <dd className="font-sans text-[12px] text-space-100/80">{what}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-0.5 border-t border-white/[0.07] pt-2">
        <button type="button" disabled={!open} onClick={() => replayIntro()} className={action}>
          Replay the entry
        </button>
        <button
          type="button"
          disabled={!open}
          onClick={() => {
            setOnboardingDone(false)
            closeOverlay()
            replayIntro()
          }}
          className={action}
        >
          Show the welcome again
        </button>
        <a href="/?view=list" className={action}>
          Accessible list view
        </a>
      </div>
    </section>
  )
}
