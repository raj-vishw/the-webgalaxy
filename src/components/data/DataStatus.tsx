import { useState } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { focusRing, ghostButton } from '../ui/panel'

/**
 * Where the galaxy's data stands. Quiet by design: nothing while the API is
 * healthy, a one-line note while loading, and a clear "some data could not
 * load / cached data" notice with Retry when it is not — the scene stays up
 * either way.
 */
export function DataStatus() {
  const status = useCatalogStore((s) => s.status)
  const step = useCatalogStore((s) => s.step)
  const source = useCatalogStore((s) => s.source)
  const error = useCatalogStore((s) => s.error)
  const fetchedAt = useCatalogStore((s) => s.fetchedAt)
  const retry = useCatalogStore((s) => s.retry)
  const introDone = useGalaxyStore((s) => s.introPhase === 'complete')
  // Dismissal is per failure: a new error (different message or a retry that failed again) shows again.
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const failed = status === 'error' && dismissedError !== (error ?? '')
  const loading = status === 'loading'
  const visible = introDone && (failed || loading)
  const cachedNote =
    source === 'cache' && fetchedAt ? `Showing the galaxy as last loaded ${new Date(fetchedAt).toLocaleString()}.` : source === 'static' ? 'Showing the built-in catalogue.' : null

  return (
    <div
      role={failed ? 'alert' : 'status'}
      aria-live="polite"
      aria-hidden={!visible}
      className={[
        'pointer-events-none absolute inset-x-0 top-[5.5rem] z-20 flex justify-center px-4 sm:top-24',
        'transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {loading && !failed ? (
        <p className="rounded-full border border-white/10 bg-[#070a18]/60 px-4 py-1.5 font-sans text-[11px] tracking-[0.18em] uppercase text-space-300/80 backdrop-blur-md">
          Charting {step === 'universes' ? 'universes' : step === 'relationships' ? 'connections' : 'websites'}…
        </p>
      ) : (
        <div className="pointer-events-auto flex max-w-[520px] flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-[#070a18]/75 px-5 py-3 backdrop-blur-md">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[13px] text-white/90">Unable to load some galaxy data.</p>
            <p className="mt-0.5 font-sans text-[11px] leading-4 text-space-300/70">
              {cachedNote}
              {error ? ` (${error})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDismissedError(null)
                void retry()
              }}
              className={ghostButton}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setDismissedError(error ?? '')}
              aria-label="Dismiss"
              className={`flex h-7 w-7 items-center justify-center rounded-full text-space-300/70 transition-colors hover:text-white ${focusRing}`}
            >
              <span aria-hidden className="text-[15px] leading-none">×</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
